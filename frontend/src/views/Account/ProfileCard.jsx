import { Button, message } from 'antd';
import axios from 'axios';
import styles from '../../styles/Account.module.css';
import { TYPE_LABELS } from './constants';

export default function ProfileCard({ user }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Perfil</h3>
      <p className={styles.line}><strong>Nome:</strong> {user.name}</p>
      <p className={styles.line}><strong>E-mail:</strong> {user.email}</p>
      <p className={styles.line}>
        <strong>Tipo:</strong> {TYPE_LABELS[user.participant_type] ?? user.participant_type}
      </p>
      <div className={styles.actions}>
        <a href="?page=oficinas">
          <Button style={{ color: '#8A00C4', borderColor: '#8A00C4', background: 'transparent' }}>
            Ver oficinas
          </Button>
        </a>
        <Button
          danger
          onClick={async () => {
            try {
              await axios.post('/TW26/backend/api/logout.php');
              window.location.search = 'page=login';
            } catch {
              message.error('Erro ao sair.');
            }
          }}
        >
          Sair
        </Button>
      </div>
    </div>
  );
}
