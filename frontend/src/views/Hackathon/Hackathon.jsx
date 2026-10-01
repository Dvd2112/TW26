import { useState, useEffect, useCallback } from 'react';
import { Button, Tag } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Hackathon.module.css';
import TeamForm from './TeamForm';
import TeamCard from './TeamCard';
import InvitesCard from './InvitesCard';
import { formatMoney } from './constants';

function pricingLines(s, priceForMe) {
  const lines = [];
  if (s.free_for_paid_participants) lines.push('Gratuito para quem já pagou a inscrição no evento.');
  else if (s.price > 0) lines.push(`Quem já pagou a inscrição no evento paga ${formatMoney(s.price)}.`);
  if (s.charge_others && s.price > 0) lines.push(`Demais participantes: ${formatMoney(s.price)} por integrante.`);
  else lines.push('Para quem ainda não pagou a inscrição no evento, o hackathon é gratuito.');
  if (priceForMe !== null && priceForMe !== undefined) {
    lines.push(priceForMe > 0 ? `Para você: ${formatMoney(priceForMe)}.` : 'Para você: gratuito.');
  }
  return lines;
}

export default function Hackathon({ tag, title, subtitle }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(
    () => axios.get('/TW26/backend/api/hackathon.php').then((res) => setData(res.data)).catch(() => setError(true)),
    [],
  );

  useEffect(() => { load(); }, [load]);

  const s = data?.settings;

  let content;
  if (error) {
    content = <p className={styles.line}>Não foi possível carregar o hackathon. Tente novamente mais tarde.</p>;
  } else if (!data) {
    content = <p className={styles.line}>Carregando...</p>;
  } else {
    content = (
      <>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>
            Inscrições{' '}
            <Tag color={s.registrations_open ? 'green' : 'default'}>{s.registrations_open ? 'Abertas' : 'Encerradas'}</Tag>
            {s.is_full && <Tag color="red">Vagas esgotadas</Tag>}
          </h3>
          {pricingLines(s, data.logged_in ? data.price_for_me : null).map((l) => (
            <p className={styles.line} key={l}>{l}</p>
          ))}
          {s.max_teams !== null && (
            <p className={styles.line}>Vagas: {Math.max(0, s.max_teams - s.teams_count)} de {s.max_teams} equipes.</p>
          )}
        </div>

        {!data.logged_in && (
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Entre para participar</h3>
            <p className={styles.line}>Faça login (ou crie sua conta) para inscrever uma equipe ou aceitar um convite.</p>
            <a href="?page=login">
              <Button type="primary" style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}>Ir para o login</Button>
            </a>
          </div>
        )}

        {data.invites.length > 0 && <InvitesCard invites={data.invites} onDone={load} />}

        {data.team && <TeamCard team={data.team} settings={s} onDone={load} />}

        {data.logged_in && !data.team && s.registrations_open && !s.is_full && (
          <TeamForm settings={s} onDone={load} />
        )}
      </>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <SectionTitle tag={tag} title={title} subtitle={subtitle} center />
          <div className={styles.stack}>{content}</div>
        </motion.div>
      </div>
    </section>
  );
}
