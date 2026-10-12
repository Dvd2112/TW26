import { Button } from 'antd';
import styles from '../../styles/Account.module.css';

export default function HackathonCard() {
  return (
    <div className={`${styles.card} ${styles.cardHighlight}`}>
      <h3 className={styles.cardTitle}>Ideathon – Jornada GovTech</h3>
      <p className={styles.line}>Inscreva a sua equipe no Ideathon (de 3 a 6 pessoas).</p>
      <a href="?page=hackathon">
        <Button type="primary" size="large" block className={styles.ctaBig}>
          Inscrever no hackathon
        </Button>
      </a>
      <a href="?page=hackathon&mode=individual" style={{ display: 'block', marginTop: 12 }}>
        <Button type="link">Não tenho equipe: inscrição individual</Button>
      </a>
    </div>
  );
}
