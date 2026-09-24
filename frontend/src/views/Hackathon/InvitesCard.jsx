import { useState } from 'react';
import { Button, Popconfirm, message } from 'antd';
import axios from 'axios';
import styles from '../../styles/Hackathon.module.css';

export default function InvitesCard({ invites, onDone }) {
  const [busy, setBusy] = useState(null);

  const respond = async (memberId, decision) => {
    setBusy(`${memberId}:${decision}`);
    try {
      const res = await axios.post('/TW26/backend/api/hackathon.php', {
        action: 'respond',
        member_id: memberId,
        decision,
      });
      message.success(res.data?.message ?? 'Resposta registrada.');
      onDone();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao responder o convite.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Convites para equipes</h3>
      <p className={styles.line}>
        Você foi incluído nas equipes abaixo. Aceite para participar ou rejeite se não conhece a equipe.
      </p>
      <div className={styles.list}>
        {invites.map((inv) => (
          <div className={styles.listItem} key={inv.id}>
            <div>
              <p className={styles.itemTitle}>{inv.team_name}</p>
              <p className={styles.itemMeta}>Líder: {inv.leader_name}</p>
            </div>
            <div className={styles.rowActions}>
              <Button
                type="primary"
                loading={busy === `${inv.id}:accept`}
                disabled={busy !== null}
                onClick={() => respond(inv.id, 'accept')}
                style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}
              >
                Aceitar
              </Button>
              <Popconfirm title="Rejeitar o convite?" okText="Rejeitar" cancelText="Voltar" onConfirm={() => respond(inv.id, 'reject')}>
                <Button danger loading={busy === `${inv.id}:reject`} disabled={busy !== null}>Rejeitar</Button>
              </Popconfirm>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
