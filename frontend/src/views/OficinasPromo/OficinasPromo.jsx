import { useState, useEffect } from 'react';
import { Tag } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/OficinasPromo.module.css';

const TYPE_LABELS = { palestra: 'Palestra', workshop: 'Workshop', oficina: 'Oficina' };
const TYPE_COLORS = { palestra: 'purple', workshop: 'geekblue', oficina: 'magenta' };

const dateOf = (v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const timeOf = (v) => new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function formatSchedule({ start_at: start, end_at: end }) {
  if (!start) return 'Data a definir';
  const startLabel = `${dateOf(start)}, ${timeOf(start)}`;
  if (!end) return startLabel;
  return dateOf(start) === dateOf(end)
    ? `${startLabel} – ${timeOf(end)}`
    : `${startLabel} até ${dateOf(end)}, ${timeOf(end)}`;
}

/**
 * Vitrine pública das oficinas na home: lista as atividades publicadas (o
 * endpoint é aberto) sem permitir inscrição direta. O botão leva ao fluxo de
 * inscrição / criação de conta (enrollCta), com atalho para entrar (loginCta), e a seção linka a página completa (cta).
 */
export default function OficinasPromo({
  id = 'oficinas',
  tag,
  title,
  subtitle,
  enrollCta,
  loginCta,
  cta,
  emptyText = 'Nenhuma atividade publicada no momento.',
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('/TW26/backend/api/activities.php')
      .then((res) => setActivities(res.data.activities ?? []))
      .catch(() => setActivities([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id={id} className={styles.section}>
      <div className={styles.wrapper}>
        <SectionTitle tag={tag} title={title} subtitle={subtitle} center />

        <div className={styles.grid}>
          {loading ? (
            <p className={styles.empty}>Carregando atividades...</p>
          ) : activities.length === 0 ? (
            <p className={styles.empty}>{emptyText}</p>
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
                <Tag color={TYPE_COLORS[activity.type]} className={styles.tag}>
                  {TYPE_LABELS[activity.type] ?? activity.type}
                </Tag>
                <h3 className={styles.cardTitle}>{activity.title}</h3>
                {activity.speaker_name && <p className={styles.meta}>🎤 {activity.speaker_name}</p>}
                {activity.description && <p className={styles.desc}>{activity.description}</p>}
                <p className={styles.meta}>📅 {formatSchedule(activity)}</p>
                {activity.location && <p className={styles.meta}>📍 {activity.location}</p>}

                <div className={styles.footer}>
                  <span className={styles.spots}>
                    {activity.capacity === null
                      ? 'Sem limite de vagas'
                      : activity.is_full
                      ? 'Esgotado'
                      : `${activity.available} vagas`}
                  </span>
                  <span className={styles.actions}>
                    {loginCta && <a href={loginCta.href} className={styles.login}>{loginCta.label}</a>}
                    {enrollCta && !activity.is_full && (
                      <a href={enrollCta.href} className={styles.enroll}>{enrollCta.label}</a>
                    )}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {cta && (
          <div className={styles.ctaRow}>
            <a href={cta.href} className={styles.cta}>{cta.label}</a>
          </div>
        )}
      </div>
    </section>
  );
}
