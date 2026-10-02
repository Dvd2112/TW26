import { useState } from 'react';
import { Button, Form, Popconfirm, Tag, message } from 'antd';
import axios from 'axios';
import styles from '../../styles/Hackathon.module.css';
import MemberFields from './MemberFields';
import { INVITE_LABELS, INVITE_COLORS } from './constants';

const API = '/TW26/backend/api/hackathon.php';

export default function TeamCard({ team, settings, onDone }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const active = team.members.filter((m) => m.invite_status !== 'rejected');
  const accepted = team.members.filter((m) => m.invite_status === 'accepted');
  const canAdd = team.i_am_leader && settings.registrations_open && active.length < settings.max_team_size;

  const call = async (payload) => {
    setBusy(true);
    try {
      const res = await axios.post(API, payload);
      message.success(res.data?.message ?? 'Feito.');
      return true;
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao processar.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addMember = async (values) => {
    if (await call({ action: 'add_member', member: values })) {
      form.resetFields();
      setAdding(false);
      onDone();
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Equipe {team.name}</h3>
      <p className={styles.line}>
        {team.i_am_leader ? 'Você inscreveu esta equipe (líder).' : 'Você é integrante desta equipe.'}{' '}
        {accepted.length} de {active.length} integrantes já aceitaram o vínculo.
      </p>
      {active.length < settings.min_team_size && (
        <p className={styles.warn}>Faltam integrantes: o mínimo é de {settings.min_team_size} pessoas por equipe.</p>
      )}

      <div className={styles.list}>
        {team.members.map((m) => (
          <div className={styles.listItem} key={m.id}>
            <div>
              <p className={styles.itemTitle}>
                {m.name} {m.is_leader && <Tag color="purple">Líder</Tag>} {m.is_me && <Tag>Você</Tag>}
              </p>
              <p className={styles.itemMeta}>{m.email} · CPF {m.cpf}</p>
            </div>
            <div className={styles.rowActions}>
              <Tag color={INVITE_COLORS[m.invite_status]}>{INVITE_LABELS[m.invite_status]}</Tag>
              {team.i_am_leader && !m.is_leader && (
                <Popconfirm
                  title={m.invite_status === 'rejected' ? 'Remover da lista?' : 'Remover este integrante?'}
                  okText="Remover"
                  cancelText="Voltar"
                  onConfirm={async () => { if (await call({ action: 'remove_member', member_id: m.id })) onDone(); }}
                >
                  <Button size="small" danger disabled={busy}>Remover</Button>
                </Popconfirm>
              )}
            </div>
          </div>
        ))}
      </div>

      {canAdd && (
        adding ? (
          <Form form={form} layout="vertical" requiredMark={false} onFinish={addMember} style={{ marginTop: 16 }}>
            <MemberFields form={form} />
            <div className={styles.rowActions}>
              <Button type="primary" htmlType="submit" loading={busy} style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}>
                Enviar convite
              </Button>
              <Button onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          </Form>
        ) : (
          <Button style={{ marginTop: 16 }} onClick={() => setAdding(true)}>Adicionar integrante</Button>
        )
      )}

      <div className={styles.actions}>
        {team.i_am_leader ? (
          <Popconfirm
            title="Desfazer a equipe?"
            description="Todos os integrantes serão desvinculados."
            okText="Desfazer"
            cancelText="Voltar"
            onConfirm={async () => { if (await call({ action: 'disband' })) onDone(); }}
          >
            <Button danger disabled={busy}>Desfazer equipe</Button>
          </Popconfirm>
        ) : (
          <Popconfirm
            title="Sair da equipe?"
            okText="Sair"
            cancelText="Voltar"
            onConfirm={async () => { if (await call({ action: 'leave' })) onDone(); }}
          >
            <Button danger disabled={busy}>Sair da equipe</Button>
          </Popconfirm>
        )}
      </div>
    </div>
  );
}
