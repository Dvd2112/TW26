import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Tag, Space, Popconfirm, message, Switch, InputNumber, Input, Form, Alert } from 'antd';
import axios from 'axios';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

const API = '/TW26/backend/api/admin/hackathon.php';
const INVITE_LABELS = { pending: 'Convite pendente', accepted: 'Aceito', rejected: 'Rejeitado' };
const INVITE_COLORS = { pending: 'gold', accepted: 'green', rejected: 'red' };

function SettingsCard({ settings, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({ ...settings, pix_link: settings.pix_link ?? '' });
  }, [settings, form]);

  const save = async (values) => {
    setSaving(true);
    try {
      await axios.post(API, { action: 'set_settings', ...values, max_teams: values.max_teams ?? null });
      message.success('Configurações salvas.');
      onSaved();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Configurações do Ideathon GovTech" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
        <Space size="large" wrap align="start">
          <Form.Item name="registrations_open" label="Inscrições abertas" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>

        <Space size="large" wrap align="start">
          <Form.Item label="Inscrição"><Input value="100% gratuita" disabled style={{ width: 180 }} /></Form.Item>
          <Form.Item label="Tamanho da equipe">
            <Input value="De 3 a 6 pessoas" disabled style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="max_teams" label="Limite de equipes" tooltip="Vazio = sem limite.">
            <InputNumber min={1} style={{ width: 130 }} placeholder="Sem limite" />
          </Form.Item>
        </Space>

        <Button type="primary" htmlType="submit" loading={saving} style={{ background: '#8A00C4', borderColor: '#8A00C4' }}>
          Salvar configurações
        </Button>
      </Form>

    </Card>
  );
}

export default function HackathonTab() {
  const [settings, setSettings] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    axios.get(API)
      .then((res) => {
        setSettings(res.data.settings);
        setTeams(res.data.teams ?? []);
      })
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar o hackathon.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const act = async (payload, okMsg) => {
    setActing(true);
    try {
      const res = await axios.post(API, payload);
      message.success(res.data?.message ?? okMsg);
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro na ação.');
    } finally {
      setActing(false);
    }
  };

  const memberColumns = [
    {
      title: 'Integrante',
      key: 'name',
      render: (_, m) => <>{m.name} {m.is_leader && <Tag color="purple">Líder</Tag>}</>,
    },
    { title: 'E-mail', dataIndex: 'email', key: 'email' },
    { title: 'CPF', dataIndex: 'cpf', key: 'cpf' },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone', render: (v) => v || '—' },
    { title: 'Nascimento', dataIndex: 'birth_date', key: 'birth_date', render: (v) => v || '—' },
    {
      title: 'Vínculo',
      key: 'invite',
      render: (_, m) => <Tag color={INVITE_COLORS[m.invite_status]}>{INVITE_LABELS[m.invite_status]}</Tag>,
    },
  ];

  const columns = [
    { title: 'Equipe', dataIndex: 'name', key: 'name' },
    { title: 'Líder', key: 'leader', render: (_, t) => `${t.leader_name} (${t.leader_email})` },
    {
      title: 'Integrantes',
      key: 'members',
      render: (_, t) => {
        const accepted = t.members.filter((m) => m.invite_status === 'accepted').length;
        return `${accepted} aceitos de ${t.members.filter((m) => m.invite_status !== 'rejected').length}`;
      },
    },
    {
      title: 'Visão de futuro',
      dataIndex: 'career_outlook',
      key: 'career_outlook',
      render: (v) => ({
        empreendendo: 'Empreender',
        grande_empresa: 'Grande empresa',
        academia_pesquisa: 'Academia/pesquisa',
        setor_publico: 'Setor público',
        outro: 'Outro',
      }[v] ?? '—'),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, t) => (
        <Popconfirm
          title="Excluir a equipe?"
          description="Remove a equipe e todos os integrantes."
          okText="Excluir"
          onConfirm={() => act({ action: 'delete_team', team_id: t.id }, 'Equipe removida.')}
        >
          <Button size="small" danger loading={acting}>Excluir</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      {settings && <SettingsCard settings={settings} onSaved={load} />}
      {settings && !settings.registrations_open && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message="As inscrições do Ideathon estão fechadas: só quem já tem equipe consegue aceitar convites e pagar." />
      )}
      <Card title={`Equipes (${teams.length})`}>
        <Space style={{ marginBottom: 16 }} wrap>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar equipe, integrante, e-mail..." width={320} />
        </Space>
        <ResponsiveTable
          rowKey="id"
          dataSource={filterRows(teams, search, (t) => [t.name, t.leader_name, t.leader_email, t.future_plans, ...t.members.flatMap((m) => [m.name, m.email, m.phone])].join(' '))}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
          expandable={{
            expandedRowRender: (t) => (
              <ResponsiveTable rowKey="id" dataSource={t.members} columns={memberColumns} pagination={false} size="small" />
            ),
          }}
        />
      </Card>
    </div>
  );
}
