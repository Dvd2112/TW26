import { useState, useEffect } from 'react';
import { Button, Tag, message, Input, Form, Checkbox } from 'antd';
import axios from 'axios';
import styles from '../../styles/Account.module.css';
import { VOLUNTEER_ROLE_OPTIONS, EVENT_DAY_OPTIONS, HACKATHON_DAY_OPTIONS, VOLUNTEER_STATUS_LABELS, VOLUNTEER_STATUS_COLORS } from './constants';
const { TextArea } = Input;

export default function VolunteerCard() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [application, setApplication] = useState(null);
  const roles = Form.useWatch('roles', form) ?? [];

  useEffect(() => {
    axios.get('/TW26/backend/api/volunteer.php')
      .then((res) => {
        setApplicationsOpen(res.data.applications_open ?? true);
        setApplication(res.data.application ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const res = await axios.post('/TW26/backend/api/volunteer.php', {
        phone: values.phone,
        roles: values.roles,
        event_days: values.event_days ?? [],
        hackathon_days: values.hackathon_days ?? [],
        motivation: values.motivation,
      });
      message.success(res.data?.message ?? 'Candidatura enviada!');
      setApplication({
        phone: values.phone,
        roles: values.roles.join(','),
        event_days: (values.event_days ?? []).join(','),
        hackathon_days: (values.hackathon_days ?? []).join(','),
        motivation: values.motivation,
        status: 'pending',
      });
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao enviar candidatura.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Seja Voluntário(a)</h3>
        <p className={styles.line}>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Seja Voluntário(a)</h3>

      {application ? (
        <>
          <p className={styles.line}>
            <strong>Status:</strong>{' '}
            <Tag color={VOLUNTEER_STATUS_COLORS[application.status]}>
              {VOLUNTEER_STATUS_LABELS[application.status] ?? application.status}
            </Tag>
          </p>
          <p className={styles.line}>
            Sua candidatura foi enviada. Assim que a organização avaliar, o status aqui é atualizado.
          </p>
        </>
      ) : !applicationsOpen ? (
        <p className={styles.line}>
          As candidaturas a voluntário estão encerradas no momento. Fique de olho, elas podem reabrir.
        </p>
      ) : (
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <p className={styles.line} style={{ marginBottom: 12 }}>
            Ajude a fazer a TechWeek 2026 acontecer! Escolha em quais frentes você topa ajudar.
          </p>

          <Form.Item
            name="phone"
            label="Telefone / WhatsApp"
            rules={[{ required: true, message: 'Informe um telefone de contato' }]}
          >
            <Input placeholder="(00) 00000-0000" size="large" />
          </Form.Item>

          <Form.Item
            name="roles"
            label="Em quais frentes você quer ajudar?"
            rules={[{ required: true, message: 'Selecione ao menos uma opção' }]}
          >
            <Checkbox.Group options={VOLUNTEER_ROLE_OPTIONS} />
          </Form.Item>

          {(roles.includes('credenciamento') || roles.includes('montagem')) && (
            <Form.Item
              name="event_days"
              label="Dias disponíveis no evento principal (19 a 22)"
              rules={[{ required: true, message: 'Selecione ao menos um dia' }]}
            >
              <Checkbox.Group options={EVENT_DAY_OPTIONS} />
            </Form.Item>
          )}

          {roles.includes('hackathon') && (
            <Form.Item
              name="hackathon_days"
              label="Dias disponíveis no hackathon (17 e 18)"
              rules={[{ required: true, message: 'Selecione ao menos um dia' }]}
            >
              <Checkbox.Group options={HACKATHON_DAY_OPTIONS} />
            </Form.Item>
          )}

          <Form.Item
            name="motivation"
            label="Por que você quer ser voluntário(a)?"
            rules={[{ required: true, message: 'Conte um pouco sobre você' }]}
          >
            <TextArea rows={3} placeholder="Conte sua motivação e, se tiver, experiências anteriores." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              block
              style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}
            >
              Enviar candidatura
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}
