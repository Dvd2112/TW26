import { useState, useEffect } from 'react';
import { Button, Tag, message } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Oficinas.module.css';

const TYPE_LABELS = {
  palestra: 'Palestra',
  workshop: 'Workshop',
  oficina: 'Oficina',
};

const TYPE_COLORS = {
  palestra: 'purple',
  workshop: 'geekblue',
  oficina: 'magenta',
};

function formatDatePart(value) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTimePart(value) {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Mostra a data/hora de início e, se houver término, cobre o caso de a atividade
 * atravessar mais de um dia (ex.: começa às 22h e termina 1h do dia seguinte). */
function formatActivitySchedule({ start_at: start, end_at: end }) {
  if (!start) return 'Data a definir';

  const startLabel = `${formatDatePart(start)}, ${formatTimePart(start)}`;
  if (!end) return startLabel;

  const sameDay = formatDatePart(start) === formatDatePart(end);
  return sameDay
    ? `${startLabel} – ${formatTimePart(end)}`
    : `${startLabel} até ${formatDatePart(end)}, ${formatTimePart(end)}`;
}

export default function Oficinas() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = () => {
    axios
      .get('/TW26/backend/api/activities.php')
      .then((res) => setActivities(res.data.activities ?? []))
      .catch(() => message.error('Erro ao carregar oficinas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    axios.get('/TW26/backend/api/me.php')
      .then((res) => setLogged(Boolean(res.data?.user)))
      .catch(() => setLogged(false));
    reload();
  }, []);

  const enroll = async (activityId) => {
    setBusy(true);
    try {
      await axios.post('/TW26/backend/api/enrollments.php', { activity_id: activityId });
      message.success('Inscrição confirmada!');
      reload();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao se inscrever.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (activityId) => {
    setBusy(true);
    try {
      await axios.delete('/TW26/backend/api/enrollments.php', { data: { activity_id: activityId } });
      message.success('Inscrição cancelada.');
      reload();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao cancelar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SectionTitle
            tag="// Programação"
            title="Oficinas e Atividades"
            subtitle="Garanta sua vaga nas atividades da TechWeek 2026. Faça login para se inscrever."
            center
          />
        </motion.div>

        {!logged && (
          <p className={styles.loginHint}>
            <a href="?page=login" className={styles.link}>Entre na sua conta</a> para se inscrever nas atividades.
          </p>
        )}

        <div className={styles.grid}>
          {loading ? (
            <p className={styles.empty}>Carregando atividades...</p>
          ) : activities.length === 0 ? (
            <p className={styles.empty}>Nenhuma atividade publicada no momento.</p>
          ) : (
            activities.map((activity, i) => (
              <motion.div
                className={styles.card}
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.1 }}
              >
                <div className={styles.cardHead}>
                  <Tag color={TYPE_COLORS[activity.type]}>{TYPE_LABELS[activity.type] ?? activity.type}</Tag>
                  {activity.is_enrolled && <Tag color="green">Inscrito</Tag>}
                </div>
                <h3 className={styles.title}>{activity.title}</h3>
                {activity.speaker_name && (
                  <p className={styles.meta}>🎤 {activity.speaker_name}</p>
                )}
                {activity.description && (
                  <p className={styles.desc}>{activity.description}</p>
                )}
                <p className={styles.meta}>📅 {formatActivitySchedule(activity)}</p>
                {activity.location && <p className={styles.meta}>📍 {activity.location}</p>}

                <div className={styles.footer}>
                  <span className={styles.spots}>
                    {activity.capacity === null
                      ? 'Sem limite de vagas'
                      : activity.is_full
                      ? 'Esgotado'
                      : `${activity.available} vagas`}
                  </span>

                  {activity.is_enrolled ? (
                    <Button size="small" danger loading={busy} onClick={() => cancel(activity.id)}>
                      Cancelar
                    </Button>
                  ) : logged ? (
                    <Button
                      size="small"
                      type="primary"
                      loading={busy}
                      disabled={activity.is_full}
                      onClick={() => enroll(activity.id)}
                      style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}
                    >
                      {activity.is_full ? 'Lotada' : 'Inscrever'}
                    </Button>
                  ) : (
                    <a href="?page=login">
                      <Button size="small" style={{ color: '#8A00C4', borderColor: '#8A00C4', background: 'transparent' }}>
                        Entrar p/ inscrever
                      </Button>
                    </a>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}