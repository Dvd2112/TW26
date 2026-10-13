-- 024 — Correção de dados: remove inscrições em oficinas com horário conflitante,
-- mantendo apenas a PRIMEIRA em que o participante se inscreveu (menor enrolled_at).
-- Idempotente: se não há conflitos, não altera nada.
--
-- * conflito = intervalos se sobrepõem (início < fim_outro AND fim > início_outro);
--   oficinas em sequência (fim = início) não conflitam;
-- * só considera type 'oficina'/'workshop' com start_at/end_at preenchidos;
-- * inscrição com presença registrada NÃO é removida (RAISE WARNING p/ revisão manual).
BEGIN;

DO $$
DECLARE
    r       RECORD;
    keep    INTEGER;
    removed INTEGER := 0;
BEGIN
    CREATE TEMP TABLE _removed (user_id INTEGER, activity_id INTEGER) ON COMMIT DROP;

    -- Em ordem de inscrição: cada uma só sobrevive se não colidir com uma anterior mantida.
    FOR r IN
        SELECT e.id, e.user_id, e.activity_id, e.enrolled_at, a.start_at, a.end_at
        FROM activity_enrollments e
        JOIN activities a ON a.id = e.activity_id
        WHERE a.type IN ('oficina', 'workshop')
          AND a.start_at IS NOT NULL AND a.end_at IS NOT NULL
        ORDER BY e.user_id, e.enrolled_at, e.id
    LOOP
        SELECT e2.activity_id INTO keep
        FROM activity_enrollments e2
        JOIN activities a2 ON a2.id = e2.activity_id
        WHERE e2.user_id = r.user_id
          AND e2.id <> r.id
          AND a2.type IN ('oficina', 'workshop')
          AND a2.start_at < r.end_at
          AND a2.end_at   > r.start_at
          AND (e2.enrolled_at, e2.id) < (r.enrolled_at, r.id)
          AND NOT EXISTS (SELECT 1 FROM _removed x
                           WHERE x.user_id = e2.user_id AND x.activity_id = e2.activity_id)
        ORDER BY e2.enrolled_at, e2.id
        LIMIT 1;

        IF keep IS NULL THEN
            CONTINUE;
        END IF;

        IF EXISTS (SELECT 1 FROM activity_attendance t
                    WHERE t.user_id = r.user_id AND t.activity_id = r.activity_id) THEN
            RAISE WARNING '[024] user % tem presença em atividade % conflitante com %; mantida (revisar)',
                r.user_id, r.activity_id, keep;
        ELSE
            INSERT INTO _removed VALUES (r.user_id, r.activity_id);
            DELETE FROM activity_enrollments WHERE id = r.id;
            removed := removed + 1;
            RAISE NOTICE '[024] removida inscrição: user % atividade % (mantida %)',
                r.user_id, r.activity_id, keep;
        END IF;
    END LOOP;

    RAISE NOTICE '[024] total de inscrições removidas: %', removed;
END $$;

COMMIT;
