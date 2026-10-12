import { useState } from 'react';
import { Button, message, Popconfirm, Tag } from 'antd';
import axios from 'axios';
import styles from '../../styles/Hackathon.module.css';

export default function IndividualCard({ onDone }) {
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await axios.post('/TW26/backend/api/hackathon.php', { action: 'cancel_individual' });
      message.success(res.data?.message ?? 'Inscrição cancelada.');
      onDone();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao cancelar.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Sua inscrição individual <Tag color="green">Confirmada</Tag></h3>
      <p className={styles.line}>
        A organização vai alocar você em uma equipe. Se um colega convidar você, é só aceitar o convite aqui e
        a inscrição individual é substituída.
      </p>
      <Popconfirm title="Cancelar a inscrição individual?" okText="Cancelar inscrição" cancelText="Manter" onConfirm={cancel}>
        <Button danger loading={cancelling}>Cancelar inscrição individual</Button>
      </Popconfirm>
    </div>
  );
}
