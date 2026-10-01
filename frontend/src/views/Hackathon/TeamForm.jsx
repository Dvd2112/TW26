import { useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import styles from '../../styles/Hackathon.module.css';
import MemberFields from './MemberFields';

export default function TeamForm({ settings, onDone }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // O líder (quem inscreve) conta como integrante; os demais são adicionados aqui.
  const minOthers = Math.max(0, settings.min_team_size - 1);
  const maxOthers = Math.max(0, settings.max_team_size - 1);

  const submit = async (values) => {
    setSaving(true);
    try {
      const res = await axios.post('/TW26/backend/api/hackathon.php', {
        action: 'create_team',
        team_name: values.team_name,
        members: values.members ?? [],
      });
      message.success(res.data?.message ?? 'Equipe inscrita!');
      onDone();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao inscrever a equipe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Inscrever minha equipe</h3>
      <p className={styles.line}>
        Você será o líder. Informe o nome da equipe e os dados de cada integrante (nome, CPF e e-mail):
        eles servem para vincular cada pessoa à sua conta. Cada integrante precisa entrar no site e{' '}
        <strong>aceitar ou rejeitar</strong> o convite. Equipes de {settings.min_team_size} a {settings.max_team_size} pessoas
        (contando você).
      </p>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        initialValues={{ members: Array.from({ length: minOthers }, () => ({})) }}
      >
        <Form.Item
          name="team_name"
          label="Nome da equipe"
          rules={[{ required: true, min: 3, max: 60, message: 'O nome deve ter de 3 a 60 caracteres' }]}
        >
          <Input size="large" placeholder="Ex.: Os Debuggers" maxLength={60} />
        </Form.Item>

        <Form.List name="members">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, i) => (
                <div className={styles.memberBox} key={field.key}>
                  <div className={styles.memberHead}>
                    <strong>Integrante {i + 2}</strong>
                    {fields.length > minOthers && (
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                        Remover
                      </Button>
                    )}
                  </div>
                  <MemberFields form={form} prefix={[field.name]} />
                </div>
              ))}
              {fields.length < maxOthers && (
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()} style={{ marginBottom: 16 }}>
                  Adicionar integrante
                </Button>
              )}
            </>
          )}
        </Form.List>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={saving}
          style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}
        >
          Inscrever equipe
        </Button>
      </Form>
    </div>
  );
}
