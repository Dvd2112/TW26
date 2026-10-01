import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Tag, Space, Popconfirm, message, Switch, InputNumber, Input, Form, Upload, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import styles from '../../../styles/Admin.module.css';
import { filterRows } from '../shared/utils';
import { openProof } from '../shared/openProof';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

const API = '/TW26/backend/api/admin/hackathon.php';
const PROOF_ENDPOINT = { url: '/TW26/backend/api/admin/hackathon-proof.php', param: 'member_id' };

const PAY_LABELS = { free: 'Isento', unpaid: 'Aguardando', awaiting_confirmation: 'Em análise', paid: 'Pago' };
const PAY_COLORS = { free: 'blue', unpaid: 'orange', awaiting_confirmation: 'gold', paid: 'green' };
const INVITE_LABELS = { pending: 'Convite pendente', accepted: 'Aceito', rejected: 'Rejeitado' };
const INVITE_COLORS = { pending: 'gold', accepted: 'green', rejected: 'red' };

const money = (v) => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`;

function SettingsCard({ settings, onSaved }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [qrFile, setQrFile] = useState(null);
  const [uploadingQr, setUploadingQr] = useState(false);

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

  const uploadQr = async () => {
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('qr', qrFile);
      await axios.post(API, formData);
      message.success('QR code salvo.');
      setQrFile(null);
      onSaved();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao enviar o QR code.');
    } finally {
      setUploadingQr(false);
    }
  };

  const removeQr = async () => {
    try {
      await axios.post(API, { action: 'delete_qr' });
      message.success('QR code removido.');
      onSaved();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao remover o QR code.');
    }
  };

  return (
    <Card title="Configurações do hackathon" style={{ marginBottom: 16 }}>
      <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
        <Space size="large" wrap align="start">
          <Form.Item name="registrations_open" label="Inscrições abertas" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="free_for_paid_participants"
            label="Grátis para quem já pagou o evento"
            valuePropName="checked"
            tooltip="Quem tem inscrição paga na TechWeek não paga o hackathon."
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="charge_others"
            label="Cobrar quem não pagou o evento"
            valuePropName="checked"
            tooltip="Desligado: o hackathon é gratuito para quem não tem inscrição paga no evento."
          >
            <Switch />
          </Form.Item>
        </Space>

        <Space size="large" wrap align="start">
          <Form.Item name="price" label="Valor por integrante (R$)" rules={[{ required: true, message: 'Informe o valor' }]}>
            <InputNumber min={0} step={0.5} precision={2} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="min_team_size" label="Mínimo por equipe" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} style={{ width: 130 }} />
          </Form.Item>
          <Form.Item name="max_team_size" label="Máximo por equipe" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} style={{ width: 130 }} />
          </Form.Item>
          <Form.Item name="max_teams" label="Limite de equipes" tooltip="Vazio = sem limite.">
            <InputNumber min={1} style={{ width: 130 }} placeholder="Sem limite" />
          </Form.Item>
        </Space>

        <Form.Item name="pix_link" label="Link do PIX (opcional)" rules={[{ type: 'url', message: 'Informe uma URL válida' }]}>
          <Input placeholder="https://..." />
        </Form.Item>

        <Button type="primary" htmlType="submit" loading={saving} style={{ background: '#8A00C4', borderColor: '#8A00C4' }}>
          Salvar configurações
        </Button>
      </Form>

      <div style={{ marginTop: 24 }}>
        <p className={styles.muted} style={{ marginBottom: 8 }}>
          QR code do PIX do hackathon: {settings.has_qr ? 'enviado' : 'não enviado'}. (JPG, PNG ou WEBP, até 2MB)
        </p>
        <Space wrap>
          <Upload
            accept=".jpg,.jpeg,.png,.webp"
            maxCount={1}
            beforeUpload={(f) => { setQrFile(f); return false; }}
            onRemove={() => setQrFile(null)}
            fileList={qrFile ? [qrFile] : []}
          >
            <Button icon={<UploadOutlined />}>Selecionar imagem</Button>
          </Upload>
          <Button type="primary" disabled={!qrFile} loading={uploadingQr} onClick={uploadQr} style={{ background: '#8A00C4', borderColor: '#8A00C4' }}>
            {settings.has_qr ? 'Substituir QR' : 'Enviar QR'}
          </Button>
          {settings.has_qr && (
            <Popconfirm title="Remover o QR code?" onConfirm={removeQr}>
              <Button danger>Remover QR</Button>
            </Popconfirm>
          )}
        </Space>
      </div>
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
    {
      title: 'Vínculo',
      key: 'invite',
      render: (_, m) => <Tag color={INVITE_COLORS[m.invite_status]}>{INVITE_LABELS[m.invite_status]}</Tag>,
    },
    {
      title: 'Pagamento',
      key: 'payment',
      render: (_, m) => (m.invite_status === 'accepted'
        ? <><Tag color={PAY_COLORS[m.payment_status]}>{PAY_LABELS[m.payment_status]}</Tag> {money(m.amount)}</>
        : '—'),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, m) => {
        if (m.invite_status !== 'accepted') return <span className={styles.muted}>—</span>;
        return (
          <Space wrap>
            {m.has_proof && <Button size="small" onClick={() => openProof(m.id, PROOF_ENDPOINT)}>Comprovante</Button>}
            {(m.payment_status === 'unpaid' || m.payment_status === 'awaiting_confirmation') && (
              <Button
                size="small"
                type="primary"
                loading={acting}
                onClick={() => act({ action: 'confirm', member_id: m.id }, 'Pagamento confirmado.')}
                style={{ background: '#8A00C4', borderColor: '#8A00C4' }}
              >
                Confirmar
              </Button>
            )}
            {m.payment_status === 'awaiting_confirmation' && (
              <Popconfirm title="Recusar o comprovante?" onConfirm={() => act({ action: 'reject', member_id: m.id }, 'Comprovante recusado.')}>
                <Button size="small" danger loading={acting}>Recusar</Button>
              </Popconfirm>
            )}
            {m.payment_status === 'paid' && (
              <Popconfirm title="Reverter a confirmação?" onConfirm={() => act({ action: 'revert', member_id: m.id }, 'Confirmação revertida.')}>
                <Button size="small" loading={acting}>Reverter</Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
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
      title: 'Pagamentos',
      key: 'paid',
      render: (_, t) => {
        const ok = t.members.filter((m) => ['paid', 'free'].includes(m.payment_status) && m.invite_status === 'accepted').length;
        return `${ok} quitados`;
      },
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, t) => (
        <Popconfirm
          title="Excluir a equipe?"
          description="Remove a equipe e todos os integrantes (inclusive pagamentos)."
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
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message="As inscrições do hackathon estão fechadas: só quem já tem equipe consegue aceitar convites e pagar." />
      )}
      <Card title={`Equipes (${teams.length})`}>
        <Space style={{ marginBottom: 16 }} wrap>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar equipe, integrante, e-mail..." width={320} />
        </Space>
        <ResponsiveTable
          rowKey="id"
          dataSource={filterRows(teams, search, (t) => [t.name, t.leader_name, t.leader_email, ...t.members.flatMap((m) => [m.name, m.email])].join(' '))}
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
