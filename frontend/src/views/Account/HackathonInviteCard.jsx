import { Button, Tag } from 'antd';
import styles from '../../styles/Account.module.css';

export default function HackathonInviteCard({ invites }) {
  const plural = invites.length > 1;
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>
        Convite para o Hackathon <Tag color="purple">{invites.length}</Tag>
      </h3>
      <p className={styles.line}>
        {plural
          ? `Você recebeu ${invites.length} convites para equipes do Hackathon.`
          : `${invites[0].leader_name} convidou você para a equipe "${invites[0].team_name}".`}
      </p>
      <a href="?page=hackathon">
        <Button
          type="primary"
          style={{ background: '#8A00C4', border: 'none', fontWeight: 700, marginTop: 8 }}
        >
          Ver mais
        </Button>
      </a>
    </div>
  );
}
