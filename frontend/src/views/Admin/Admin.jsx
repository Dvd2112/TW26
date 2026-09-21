import { useState, useEffect, useCallback } from 'react';
import {
  Tabs, Table, Card, Button, Modal, Form, Input, InputNumber, Select, Tag,
  Statistic, Row, Col, Space, Popconfirm, message, Progress, DatePicker, TimePicker, Upload,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from 'axios';
import dayjs from 'dayjs';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Admin.module.css';

const { Option } = Select;
const { TextArea } = Input;

const TYPE_LABELS = { participant: 'Normal', volunteer: 'Voluntário', staff: 'Staff' };
const TYPE_COLORS = { participant: 'default', volunteer: 'purple', staff: 'blue' };

const PAY_LABELS = {
  unpaid: 'Aguardando pagamento',
  awaiting_confirmation: 'Em confirmação',
  paid: 'Pago',
  failed: 'Falhou',
  refunded: 'Reembolsado',
};
const PAY_COLORS = {
  unpaid: 'orange',
  awaiting_confirmation: 'gold',
  paid: 'green',
  failed: 'red',
  refunded: 'default',
};

const REG_LABELS = { pending: 'Pendente', confirmed: 'Confirmado', cancelled: 'Cancelado' };

const ACTIVITY_TYPE_LABELS = { palestra: 'Palestra', workshop: 'Workshop', oficina: 'Oficina' };

/** Junta uma data (DatePicker) e um horário (TimePicker), ambos dayjs, num ISO local. */
function combineDateTime(date, time) {
  if (!date) return null;
  const withTime = time ? date.hour(time.hour()).minute(time.minute()) : date.hour(0).minute(0);
  return withTime.second(0).format('YYYY-MM-DDTHH:mm:ss');
}

/** Formata início/término de uma atividade, cobrindo o caso de virar o dia. */
function formatActivitySchedule(startAt, endAt) {
  if (!startAt) return '—';
  const start = dayjs(startAt);
  const startLabel = start.format('DD/MM HH:mm');
  if (!endAt) return startLabel;
  const end = dayjs(endAt);
  return start.isSame(end, 'day')
    ? `${startLabel} – ${end.format('HH:mm')}`
    : `${startLabel} até ${end.format('DD/MM HH:mm')}`;
}

/* ─── Visão Geral ────────────────────────────────────────────────────────── */
function OverviewTab() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('/TW26/backend/api/admin/dashboard.php')
      .then((res) => setData(res.data))
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar painel.'));
  }, []);

  if (!data) return <p className={styles.muted}>Carregando...</p>;

  const countByType = (tipo) => {
    const row = (data.inscritos_por_tipo ?? []).find((r) => r.participant_type === tipo);
    return row ? Number(row.total) : 0;
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Usuários cadastrados" value={data.total_users} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Com acesso admin" value={data.total_admins} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Inscrições (não canceladas)" value={countByType('participant') + countByType('volunteer') + countByType('staff')} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Oficinas cadastradas" value={(data.oficinas ?? []).length} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Inscritos por tipo">
            <div className={styles.statLine}>
              <span>👤 Normal</span> <strong>{countByType('participant')}</strong>
            </div>
            <div className={styles.statLine}>
              <span>🛠️ Staff</span> <strong>{countByType('staff')}</strong>
            </div>
            <div className={styles.statLine}>
              <span>🤝 Voluntário</span> <strong>{countByType('volunteer')}</strong>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Vagas por lote">
            {(data.vagas_por_lote ?? []).map((lote) => {
              const pct = lote.capacity > 0 ? Math.round((lote.enrolled / lote.capacity) * 100) : 0;
              return (
                <div key={lote.id} style={{ marginBottom: 12 }}>
                  <div className={styles.statLine}>
                    <span>{lote.name}{lote.is_active ? '' : ' (fechado)'}</span>
                    <strong>{lote.enrolled}/{lote.capacity}</strong>
                  </div>
                  <Progress percent={pct} showInfo={false} strokeColor="#8A00C4" />
                </div>
              );
            })}
            {(!data.vagas_por_lote || data.vagas_por_lote.length === 0) && (
              <p className={styles.muted}>Nenhum lote cadastrado.</p>
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Pagamentos">
            {(data.pagamentos_por_status ?? []).map((s) => (
              <div className={styles.statLine} key={s.status}>
                <Tag color={PAY_COLORS[s.status]}>{PAY_LABELS[s.status] ?? s.status}</Tag>
                <strong>{s.total}</strong>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/* ─── Inscrições ─────────────────────────────────────────────────────────── */
/**
 * Abre o comprovante (imagem/PDF) numa aba nova. Busca via axios (com o cookie
 * de sessão) e abre como blob: uma navegação direta ao PHP não passa pelo proxy
 * do CRA em desenvolvimento (que devolve o index.html para requisições de página).
 */
async function openProof(paymentId) {
  try {
    const res = await axios.get('/TW26/backend/api/admin/payment-proof.php', {
      params: { payment_id: paymentId },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch {
    message.error('Não foi possível abrir o comprovante.');
  }
}

function RegistrationsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fStatus, setFStatus] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (fStatus) params.set('status', fStatus);
    if (fTipo) params.set('participant_type', fTipo);
    axios.get(`/TW26/backend/api/admin/payments.php?${params.toString()}`)
      .then((res) => setRows(res.data.registrations ?? []))
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar.'))
      .finally(() => setLoading(false));
  }, [fStatus, fTipo]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = (v) => { setFStatus(v); setLoading(true); };
  const changeTipo = (v) => { setFTipo(v); setLoading(true); };

  const act = async (paymentId, action) => {
    setConfirming(true);
    try {
      await axios.post('/TW26/backend/api/admin/payments.php', { payment_id: paymentId, action });
      message.success(action === 'confirm' ? 'Pagamento confirmado!' : 'Inscrição cancelada.');
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro na ação.');
    } finally {
      setConfirming(false);
    }
  };

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'E-mail', dataIndex: 'email', key: 'email' },
    {
      title: 'Tipo',
      dataIndex: 'reg_type',
      key: 'reg_type',
      render: (v) => <Tag color={TYPE_COLORS[v]}>{TYPE_LABELS[v] ?? v}</Tag>,
    },
    { title: 'Lote', dataIndex: 'lote_name', key: 'lote_name' },
    {
      title: 'Valor',
      key: 'amount',
      render: (_, r) => (r.amount === null ? '—' : `R$ ${r.amount.toFixed(2)}`),
    },
    {
      title: 'Pagamento',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (v) => <Tag color={PAY_COLORS[v]}>{PAY_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Comprovante',
      key: 'proof',
      render: (_, r) => (
        r.has_proof
          ? (
            <Button
              size="small"
              onClick={() => openProof(r.payment_id)}
            >
              Ver
            </Button>
          )
          : <span className={styles.muted}>—</span>
      ),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, r) => {
        if (r.payment_status === 'paid') {
          return (
            <Popconfirm title="Cancelar inscrição e reembolsar?" onConfirm={() => act(r.payment_id, 'cancel')}>
              <Button size="small" danger loading={confirming}>Cancelar</Button>
            </Popconfirm>
          );
        }
        if (r.payment_status === 'awaiting_confirmation') {
          return (
            <Space>
              <Button size="small" type="primary" loading={confirming} onClick={() => act(r.payment_id, 'confirm')}
                style={{ background: '#8A00C4', borderColor: '#8A00C4' }}>
                Confirmar PIX
              </Button>
              <Popconfirm title="Cancelar inscrição?" onConfirm={() => act(r.payment_id, 'cancel')}>
                <Button size="small" danger loading={confirming}>Cancelar</Button>
              </Popconfirm>
            </Space>
          );
        }
        if (r.payment_status === 'unpaid' || r.payment_status === 'failed') {
          return (
            <Popconfirm title="Cancelar inscrição?" onConfirm={() => act(r.payment_id, 'cancel')}>
              <Button size="small" danger loading={confirming}>Cancelar</Button>
            </Popconfirm>
          );
        }
        return null;
      },
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }}>
        <Select placeholder="Status do pagamento" allowClear style={{ width: 220 }} value={fStatus || undefined} onChange={changeStatus}>
          <Option value="unpaid">Aguardando pagamento</Option>
          <Option value="awaiting_confirmation">Em confirmação</Option>
          <Option value="paid">Pago</Option>
          <Option value="refunded">Reembolsado</Option>
          <Option value="failed">Falhou</Option>
        </Select>
        <Select placeholder="Tipo de participante" allowClear style={{ width: 200 }} value={fTipo || undefined} onChange={changeTipo}>
          <Option value="participant">Normal</Option>
          <Option value="volunteer">Voluntário</Option>
          <Option value="staff">Staff</Option>
        </Select>
      </Space>
      <Table
        rowKey="payment_id"
        dataSource={rows}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 15 }}
        size="small"
        scroll={{ x: 1050 }}
      />
    </Card>
  );
}

/* ─── Lotes ──────────────────────────────────────────────────────────────── */
function LotesTab() {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [removeQr, setRemoveQr] = useState(false);
  const [qrBust, setQrBust] = useState(0); // força recarregar a imagem após substituir
  const [form] = Form.useForm();

  const load = () => {
    axios.get('/TW26/backend/api/admin/lotes.php')
      .then((res) => setLotes(res.data.lotes ?? []))
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar lotes.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setQrFile(null);
    setRemoveQr(false);
    form.resetFields();
    form.setFieldsValue({ price: 0, capacity: 100, is_active: '0', discount: 0, institution: '', participant_type: 'participant' });
    setOpen(true);
  };

  const openEdit = (lote) => {
    setEditing(lote);
    setQrFile(null);
    setRemoveQr(false);
    setQrBust(Date.now());
    const starts = lote.starts_at ? dayjs(lote.starts_at) : null;
    const ends = lote.ends_at ? dayjs(lote.ends_at) : null;
    form.setFieldsValue({
      name: lote.name, price: lote.price, capacity: lote.capacity,
      order_index: lote.order_index, is_active: lote.is_active ? '1' : '0',
      discount: lote.discount, institution: lote.institution ?? '',
      participant_type: lote.participant_type ?? 'participant',
      pix_link: lote.pix_link ?? '',
      starts_date: starts, starts_time: starts,
      ends_date: ends, ends_time: ends,
    });
    setOpen(true);
  };

  const save = async () => {
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return; // campos inválidos: o antd já destaca os erros no formulário
    }
    const payload = {
      name: v.name, price: v.price, capacity: v.capacity,
      order_index: v.order_index, discount: v.discount,
      institution: v.institution || '',
      participant_type: v.participant_type,
      pix_link: (v.pix_link ?? '').trim(),
      is_active: v.is_active === '1',
      starts_at: combineDateTime(v.starts_date, v.starts_time),
      ends_at: combineDateTime(v.ends_date, v.ends_time),
    };
    let loteId = editing?.id;
    try {
      if (editing) {
        await axios.put('/TW26/backend/api/admin/lotes.php', { id: editing.id, ...payload });
      } else {
        const res = await axios.post('/TW26/backend/api/admin/lotes.php', payload);
        loteId = res.data.id;
      }
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao salvar lote.');
      return;
    }

    // QR code: enviado/removido depois de o lote existir (precisa do id)
    try {
      if (qrFile) {
        const formData = new FormData();
        formData.append('id', loteId);
        formData.append('qr', qrFile);
        await axios.post('/TW26/backend/api/admin/lote-qr.php', formData);
      } else if (removeQr && editing?.has_qr) {
        await axios.delete('/TW26/backend/api/admin/lote-qr.php', { data: { id: loteId } });
      }
    } catch (err) {
      message.warning(
        `Lote salvo, mas o QR code não foi atualizado: ${err.response?.data?.message ?? 'erro inesperado'} Edite o lote para tentar de novo.`,
      );
      setOpen(false);
      load();
      return;
    }

    message.success(editing ? 'Lote atualizado.' : 'Lote criado.');
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    try {
      await axios.delete('/TW26/backend/api/admin/lotes.php', { data: { id } });
      message.success('Lote removido.');
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao remover lote.');
    }
  };

  const columns = [
    { title: 'Nome', dataIndex: 'name' },
    {
      title: 'Tipo de usuário', dataIndex: 'participant_type',
      render: (v) => <Tag color="purple">{TYPE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Instituição', dataIndex: 'institution',
      render: (v) => (v ? <Tag color="geekblue">{v}</Tag> : <Tag>Todas</Tag>),
    },
    {
      title: 'Preço', dataIndex: 'price',
      render: (v) => `R$ ${Number(v).toFixed(2)}`,
    },
    {
      title: 'Vagas', key: 'vagas',
      render: (_, r) => `${r.enrolled}/${r.capacity}`,
    },
    {
      title: 'Desconto Volunt.', dataIndex: 'discount',
      render: (v) => `${v}%`,
    },
    {
      title: 'Status', dataIndex: 'is_active',
      render: (v) => (v ? <Tag color="green">Aberto</Tag> : <Tag>Fechado</Tag>),
    },
    {
      title: 'QR PIX', dataIndex: 'has_qr',
      render: (v) => (v ? <Tag color="green">Enviado</Tag> : <Tag>Sem QR</Tag>),
    },
    {
      title: 'Ações', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>Editar</Button>
          <Popconfirm title="Remover lote?" onConfirm={() => remove(r.id)}>
            <Button size="small" danger>Remover</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Lotes"
      extra={<Button type="primary" onClick={openNew} style={{ background: '#8A00C4', borderColor: '#8A00C4' }}>Novo lote</Button>}
    >
      <Table rowKey="id" dataSource={lotes} columns={columns} loading={loading} pagination={false} size="small" />

      <Modal
        title={editing ? 'Editar lote' : 'Novo lote'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        width={760}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
                <Input placeholder="1º lote" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="order_index" label="Ordem">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="is_active" label="Status">
                <Select>
                  <Option value="0">Fechado</Option>
                  <Option value="1">Aberto</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name="institution"
                label="Instituição"
                extra="Vazio = vale para qualquer instituição. Só pode existir 1 lote aberto por instituição e tipo de usuário."
              >
                <Select allowClear placeholder="Todas as instituições">
                  <Option value="UTFPR">UTFPR</Option>
                  <Option value="CESUL">CESUL</Option>
                  <Option value="UNIPAR">UNIPAR</Option>
                  <Option value="outros">Outros</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="price" label="Preço (R$)" rules={[{ required: true }]}>
                <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="capacity" label="Capacidade (vagas)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item
                name="participant_type"
                label="Tipo de usuário"
                extra="O lote só é visível e utilizável por usuários deste tipo."
                rules={[{ required: true, message: 'Informe o tipo de usuário' }]}
              >
                <Select>
                  <Option value="participant">Normal</Option>
                  <Option value="volunteer">Voluntário</Option>
                  <Option value="staff">Staff</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="discount" label="Desconto voluntário (%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={12} md={6}>
              <Form.Item name="starts_date" label="Abertura — data">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Opcional" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="starts_time" label="Abertura — hora">
                <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} placeholder="Opcional" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="ends_date" label="Fechamento — data">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Opcional" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="ends_time" label="Fechamento — hora">
                <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} placeholder="Opcional" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="pix_link"
            label="Link do PIX (opcional)"
            extra="Se preenchido, o usuário vê um botão para pagar pelo link, além do QR code."
            rules={[{ type: 'url', message: 'Informe um link válido (https://...)' }]}
          >
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item
            label="QR code PIX do lote"
            extra="Imagem do QR com o valor deste lote (JPG, PNG ou WEBP, até 2MB). Aparece para o usuário na tela de pagamento."
          >
            {editing?.has_qr && !removeQr && !qrFile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <img
                  src={`/TW26/backend/api/lote-qr.php?lote_id=${editing.id}&v=${qrBust}`}
                  alt="QR code atual do lote"
                  style={{ width: 96, height: 96, objectFit: 'contain', background: '#fff', borderRadius: 6 }}
                />
                <Button size="small" danger onClick={() => setRemoveQr(true)}>Remover QR</Button>
              </div>
            )}
            {removeQr && !qrFile && (
              <p className={styles.muted}>
                O QR atual será removido ao salvar.{' '}
                <Button type="link" size="small" onClick={() => setRemoveQr(false)}>Desfazer</Button>
              </p>
            )}
            <Upload
              accept=".jpg,.jpeg,.png,.webp"
              maxCount={1}
              beforeUpload={(f) => { setQrFile(f); return false; }}
              onRemove={() => setQrFile(null)}
              fileList={qrFile ? [qrFile] : []}
            >
              <Button icon={<UploadOutlined />}>{editing?.has_qr ? 'Substituir imagem' : 'Selecionar imagem'}</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

/* ─── Financeiro ─────────────────────────────────────────────────────────── */
function FinanceiroTab() {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('expense');
  const [form] = Form.useForm();

  const loadAll = () => {
    axios.get('/TW26/backend/api/admin/financeiro.php')
      .then((res) => setSummary(res.data))
      .catch(() => message.error('Erro ao carregar resumo.'));
    axios.get('/TW26/backend/api/admin/expenses.php')
      .then((res) => setExpenses(res.data.expenses ?? []))
      .catch(() => {});
    axios.get('/TW26/backend/api/admin/revenues.php')
      .then((res) => setRevenues(res.data.revenues ?? []))
      .catch(() => {});
  };

  useEffect(loadAll, []);

  const save = async () => {
    const v = await form.validateFields();
    const payload = kind === 'expense'
      ? { category: v.category, description: v.description, amount: v.amount, expense_date: dayjs(v.date).format('YYYY-MM-DDTHH:mm:ss') }
      : { category: v.category, description: v.description, amount: v.amount, received_at: dayjs(v.date).format('YYYY-MM-DDTHH:mm:ss') };
    try {
      await axios.post(kind === 'expense' ? '/TW26/backend/api/admin/expenses.php' : '/TW26/backend/api/admin/revenues.php', payload);
      message.success('Lançamento registrado.');
      setOpen(false);
      form.resetFields();
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao salvar.');
    }
  };

  const remove = async (kind, id) => {
    try {
      await axios.delete(kind === 'expense' ? '/TW26/backend/api/admin/expenses.php' : '/TW26/backend/api/admin/revenues.php', { data: { id } });
      message.success('Lançamento removido.');
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao remover.');
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Entradas (inscrições)" value={summary?.entradas_inscricoes ?? 0} precision={2} prefix="R$" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Entradas (outras)" value={summary?.entradas_outras ?? 0} precision={2} prefix="R$" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Saídas" value={summary?.total_saidas ?? 0} precision={2} prefix="R$" /></Card></Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Saldo"
              value={summary?.saldo ?? 0}
              precision={2}
              prefix="R$"
              valueStyle={{ color: (summary?.saldo ?? 0) >= 0 ? '#22c55e' : '#e94560' }}
            />
          </Card>
        </Col>
      </Row>

      <Button
        type="primary"
        style={{ background: '#8A00C4', borderColor: '#8A00C4', margin: '16px 0' }}
        onClick={() => { setKind('expense'); form.resetFields(); setOpen(true); }}
      >
        Lançar despesa
      </Button>
      <Button
        style={{ marginLeft: 8 }}
        onClick={() => { setKind('revenue'); form.resetFields(); setOpen(true); }}
      >
        Lançar receita
      </Button>

      <Card title="Despesas" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          dataSource={expenses}
          size="small"
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Categoria', dataIndex: 'category' },
            { title: 'Descrição', dataIndex: 'description' },
            { title: 'Valor', dataIndex: 'amount', render: (v) => `R$ ${Number(v).toFixed(2)}` },
            {
              title: '', key: 'x', width: 60,
              render: (_, r) => (
                <Popconfirm title="Remover?" onConfirm={() => remove('expense', r.id)}>
                  <Button size="small" danger>Remover</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Receitas extras (patrocínio, doações...)" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          dataSource={revenues}
          size="small"
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Categoria', dataIndex: 'category' },
            { title: 'Descrição', dataIndex: 'description' },
            { title: 'Valor', dataIndex: 'amount', render: (v) => `R$ ${Number(v).toFixed(2)}` },
            {
              title: '', key: 'x', width: 60,
              render: (_, r) => (
                <Popconfirm title="Remover?" onConfirm={() => remove('revenue', r.id)}>
                  <Button size="small" danger>Remover</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={kind === 'expense' ? 'Lançar despesa' : 'Lançar receita'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ category: kind === 'expense' ? 'infraestrutura' : 'patrocinio', date: dayjs() }}>
          <Row gutter={16}>
            <Col xs={12} md={8}>
              <Form.Item name="category" label="Categoria" rules={[{ required: true }]}>
                <Input placeholder="ex.: infraestrutura, patrocinio..." />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="amount" label="Valor (R$)" rules={[{ required: true }]}>
                <InputNumber min={0.01} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="date" label="Data" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Descrição" rules={[{ required: true }]}>
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/* ─── Oficinas (admin) ───────────────────────────────────────────────────── */
function AdminActivitiesTab() {
  const [activities, setActivities] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    axios.get('/TW26/backend/api/admin/activities.php')
      .then((res) => setActivities(res.data.activities ?? []))
      .catch(() => message.error('Erro ao carregar atividades.'));
    axios.get('/TW26/backend/api/admin/activities.php?enrollments=1')
      .then((res) => setEnrollments(res.data.enrollments ?? []))
      .catch(() => {});
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'oficina', is_published: '0' });
    setOpen(true);
  };

  const openEdit = (act) => {
    setEditing(act);
    const start = act.start_at ? dayjs(act.start_at) : null;
    const end = act.end_at ? dayjs(act.end_at) : null;
    form.setFieldsValue({
      title: act.title, type: act.type, description: act.description,
      speaker_name: act.speaker_name, location: act.location,
      capacity: act.capacity, is_published: act.is_published ? '1' : '0',
      start_date: start, start_time: start,
      end_date: end, end_time: end,
    });
    setOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      title: v.title, type: v.type, description: v.description,
      speaker_name: v.speaker_name, location: v.location,
      is_published: v.is_published === '1',
      capacity: v.capacity ?? null,
      start_at: combineDateTime(v.start_date, v.start_time),
      end_at: combineDateTime(v.end_date, v.end_time),
    };
    try {
      if (editing) {
        await axios.put('/TW26/backend/api/admin/activities.php', { id: editing.id, ...payload });
      } else {
        await axios.post('/TW26/backend/api/admin/activities.php', payload);
      }
      message.success(editing ? 'Atividade atualizada.' : 'Atividade criada.');
      setOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao salvar.');
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete('/TW26/backend/api/admin/activities.php', { data: { id } });
      message.success('Atividade removida.');
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao remover.');
    }
  };

  const enrolledCount = (id) => enrollments.filter((e) => Number(e.activity_id) === Number(id)).length;

  return (
    <div>
      <Button type="primary" style={{ background: '#8A00C4', borderColor: '#8A00C4', marginBottom: 16 }} onClick={openNew}>
        Nova atividade
      </Button>

      <Table
        rowKey="id"
        dataSource={activities}
        size="small"
        pagination={false}
        columns={[
          { title: 'Título', dataIndex: 'title' },
          { title: 'Tipo', dataIndex: 'type', render: (v) => ACTIVITY_TYPE_LABELS[v] ?? v },
          {
            title: 'Quando', key: 'quando',
            render: (_, r) => formatActivitySchedule(r.start_at, r.end_at),
          },
          {
            title: 'Vagas', key: 'vagas',
            render: (_, r) => (r.capacity === null ? 'sem limite' : `${enrolledCount(r.id)}/${r.capacity}`),
          },
          { title: 'Publicada', dataIndex: 'is_published', render: (v) => (v ? <Tag color="green">Sim</Tag> : <Tag>Não</Tag>) },
          {
            title: 'Ações', key: 'actions',
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => openEdit(r)}>Editar</Button>
                <Popconfirm title="Remover atividade?" onConfirm={() => remove(r.id)}>
                  <Button size="small" danger>Remover</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Card title="Inscritos por atividade" style={{ marginTop: 16 }}>
        <Table
          rowKey={(r) => `${r.activity_id}-${r.user_id}`}
          dataSource={enrollments}
          size="small"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Atividade', dataIndex: 'activity_id', render: (v) => activities.find((a) => Number(a.id) === Number(v))?.title ?? v },
            { title: 'Nome', dataIndex: 'name' },
            { title: 'E-mail', dataIndex: 'email' },
            { title: 'Inscrito em', dataIndex: 'enrolled_at' },
          ]}
        />
      </Card>

      <Modal
        title={editing ? 'Editar atividade' : 'Nova atividade'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        width={800}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item name="title" label="Título" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  <Option value="palestra">Palestra</Option>
                  <Option value="workshop">Workshop</Option>
                  <Option value="oficina">Oficina</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="speaker_name" label="Palestrante / facilitador">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="location" label="Local">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Descrição">
            <TextArea rows={3} />
          </Form.Item>
          <Row gutter={16}>
            <Col xs={12} md={12}>
              <Form.Item name="capacity" label="Capacidade (deixe vazio p/ sem limite)">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={12}>
              <Form.Item name="is_published" label="Publicada">
                <Select>
                  <Option value="0">Não</Option>
                  <Option value="1">Sim</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={12} md={6}>
              <Form.Item name="start_date" label="Início — data">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Opcional" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="start_time" label="Início — hora">
                <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} placeholder="Opcional" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="end_date" label="Término — data">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Opcional" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="end_time" label="Término — hora">
                <TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={5} placeholder="Opcional" />
              </Form.Item>
            </Col>
          </Row>
          <p className={styles.muted} style={{ marginTop: -8 }}>
            Data de início e de término são independentes — oficinas que atravessam mais de um dia
            (ex.: começa às 22h e termina 1h da manhã seguinte) são suportadas normalmente.
          </p>
        </Form>
      </Modal>
    </div>
  );
}

/* ─── Usuários ───────────────────────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [available, setAvailable] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    axios.get('/TW26/backend/api/admin/users.php')
      .then((res) => {
        setUsers(res.data.users ?? []);
        setAvailable(res.data.permissions ?? []);
      })
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar usuários.'));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ participant_type: 'participant', permissions: [] });
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    form.setFieldsValue({
      name: u.name, email: u.email, cpf: u.cpf, institution: u.institution,
      participant_type: u.participant_type, permissions: u.permissions ?? [],
    });
    setOpen(true);
  };

  const save = async () => {
    const v = await form.validateFields();
    const payload = {
      name: v.name, email: v.email, cpf: v.cpf.replace(/\D/g, ''),
      institution: v.institution ?? '', participant_type: v.participant_type,
      permissions: v.permissions ?? [],
    };
    try {
      if (editing) {
        if (v.password) payload.password = v.password;
        await axios.put('/TW26/backend/api/admin/users.php', { id: editing.id, ...payload });
      } else {
        await axios.post('/TW26/backend/api/admin/users.php', { ...payload, password: v.password });
      }
      message.success(editing ? 'Usuário atualizado.' : 'Usuário criado.');
      setOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao salvar usuário.');
    }
  };

  const remove = async (id) => {
    try {
      await axios.delete('/TW26/backend/api/admin/users.php', { data: { id } });
      message.success('Usuário removido.');
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao remover.');
    }
  };

  const columns = [
    { title: 'Nome', dataIndex: 'name' },
    { title: 'E-mail', dataIndex: 'email' },
    { title: 'CPF', dataIndex: 'cpf', render: (v) => (v ? `${v.slice(0, 3)}.***.***-${v.slice(9)}` : '—') },
    {
      title: 'Tipo', dataIndex: 'participant_type',
      render: (v) => <Tag color={TYPE_COLORS[v]}>{TYPE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Permissões', dataIndex: 'permissions',
      render: (v) => (v?.length ? v.map((p) => <Tag key={p} color="geekblue">{p}</Tag>) : <Tag>—</Tag>),
    },
    {
      title: 'Ações', key: 'actions',
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openEdit(r)}>Editar</Button>
          <Popconfirm title="Remover usuário?" onConfirm={() => remove(r.id)}>
            <Button size="small" danger>Remover</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Usuários"
      extra={<Button type="primary" onClick={openNew} style={{ background: '#8A00C4', borderColor: '#8A00C4' }}>Novo usuário</Button>}
    >
      <p className={styles.muted}>Cadastre participantes (normal/voluntário/staff) e admins. Voluntários têm desconto; staff é isento.</p>
      <Table rowKey="id" dataSource={users} columns={columns} size="small" pagination={{ pageSize: 15 }} />

      <Modal
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        width={760}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="E-mail" rules={[{ required: true, type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={12} md={8}>
              <Form.Item name="cpf" label="CPF" rules={[{ required: true }]}>
                <Input maxLength={14} placeholder="000.000.000-00" />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="institution" label="Instituição">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="participant_type" label="Tipo" rules={[{ required: true }]}>
                <Select>
                  <Option value="participant">Participante (normal)</Option>
                  <Option value="volunteer">Voluntário (desconto)</Option>
                  <Option value="staff">Staff (isento)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label={editing ? 'Nova senha (deixe vazio p/ manter)' : 'Senha'}
                rules={editing ? [] : [{ required: true, min: 8, message: 'Mínimo 8 caracteres' }]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="permissions" label="Permissões (admin)">
                <Select mode="multiple" placeholder="Selecione cargos de admin">
                  {available.map((p) => <Option key={p.slug} value={p.slug}>{p.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
}

/* ─── Painel principal ───────────────────────────────────────────────────── */
export default function Admin() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    axios.get('/TW26/backend/api/me.php')
      .then((res) => {
        if (res.data?.user && res.data?.is_admin) setStatus('ok');
        else setStatus('denied');
      })
      .catch(() => setStatus('denied'));
  }, []);

  if (status === 'loading') {
    return <section className={styles.section}><p className={styles.muted}>Carregando...</p></section>;
  }

  if (status === 'denied') {
    return (
      <section className={styles.section}>
        <SectionTitle tag="// Painel Admin" title="Acesso restrito" subtitle="Você precisa ser um administrador para acessar este painel." center />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <a href="?page=login"><Button type="primary" style={{ background: '#8A00C4', border: 'none' }}>Ir para o login</Button></a>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <SectionTitle tag="// Painel Admin" title="Gestão TechWeek 2026" subtitle="Inscrições, lotes, financeiro, oficinas e usuários." center />
        </motion.div>

        <Tabs
          size="large"
          items={[
            { key: 'overview', label: 'Visão Geral', children: <OverviewTab /> },
            { key: 'registrations', label: 'Inscrições', children: <RegistrationsTab /> },
            { key: 'lotes', label: 'Lotes', children: <LotesTab /> },
            { key: 'financeiro', label: 'Financeiro', children: <FinanceiroTab /> },
            { key: 'activities', label: 'Oficinas', children: <AdminActivitiesTab /> },
            { key: 'users', label: 'Usuários', children: <UsersTab /> },
          ]}
        />
      </div>
    </section>
  );
}