import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Tabs, Table, Card, Button, Modal, Form, Input, InputNumber, Select, Tag,
  Statistic, Row, Col, Space, Popconfirm, message, Progress, DatePicker, TimePicker, Upload,
} from 'antd';
import { UploadOutlined, SearchOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from 'axios';
import dayjs from 'dayjs';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import QrScanner from '../../components/QrScanner/QrScanner';
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

/** Minúsculas e sem acentos, para a busca não depender de "José" vs "jose". */
const normalizeText = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Filtra linhas por texto livre. `getText(row)` devolve tudo que é pesquisável na linha;
 * a busca com várias palavras exige que todas apareçam (ex.: "maria pago").
 */
function filterRows(rows, query, getText) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;
  return rows.filter((row) => {
    const haystack = normalizeText(getText(row));
    return terms.every((t) => haystack.includes(t));
  });
}

function SearchInput({ value, onChange, placeholder = 'Buscar...', width = 260 }) {
  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width, maxWidth: '100%' }}
    />
  );
}

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
  const [fLote, setFLote] = useState(null);
  const [fIndex, setFIndex] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get('/TW26/backend/api/admin/lotes.php')
      .then((res) => setLotes(res.data.lotes ?? []))
      .catch(() => message.error('Erro ao carregar lotes para o filtro.'));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (fStatus) params.set('status', fStatus);
    if (fTipo) params.set('participant_type', fTipo);
    if (fLote) params.set('lote_id', fLote);
    if (fIndex) params.set('lote_index', fIndex);
    axios.get(`/TW26/backend/api/admin/payments.php?${params.toString()}`)
      .then((res) => setRows(res.data.registrations ?? []))
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar.'))
      .finally(() => setLoading(false));
  }, [fStatus, fTipo, fLote, fIndex]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = (v) => { setFStatus(v); setLoading(true); };
  const changeTipo = (v) => { setFTipo(v); setLoading(true); };
  const changeLote = (v) => { setFLote(v ?? null); setLoading(true); };
  const changeIndex = (v) => { setFIndex(v ?? null); setLoading(true); };

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
      title: 'Índice',
      dataIndex: 'lote_index',
      key: 'lote_index',
      sorter: (a, b) => (a.lote_index ?? Infinity) - (b.lote_index ?? Infinity),
      render: (v) => (v === null ? '—' : `#${v}`),
    },
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
      <Space style={{ marginBottom: 16 }} wrap>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, e-mail, lote, índice..." width={300} />
        <Select
          placeholder="Lote" allowClear style={{ width: 200 }}
          value={fLote ?? undefined} onChange={changeLote}
          options={lotes.map((l) => ({ value: l.id, label: l.name }))}
        />
        <InputNumber
          placeholder="Índice no lote" min={1} precision={0} style={{ width: 150 }}
          value={fIndex} onChange={changeIndex}
        />
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
        dataSource={filterRows(rows, search, (r) => [
          r.name, r.email, TYPE_LABELS[r.reg_type], r.lote_name,
          r.lote_index === null ? '' : `#${r.lote_index} ${r.lote_index}`,
          PAY_LABELS[r.payment_status],
        ].join(' '))}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 15 }}
        size="small"
        scroll={{ x: 1050 }}
      />
    </Card>
  );
}

/* ─── Inscritos de um lote (linha expandida em Lotes) ─────────────────────── */
function LoteRegistrations({ loteId, onChanged }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    axios.get('/TW26/backend/api/admin/payments.php', { params: { lote_id: loteId } })
      .then((res) => setRows(res.data.registrations ?? []))
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar inscritos.'))
      .finally(() => setLoading(false));
  }, [loteId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (paymentId, action) => {
    setActing(true);
    try {
      await axios.post('/TW26/backend/api/admin/payments.php', { payment_id: paymentId, action });
      message.success(action === 'confirm' ? 'Inscrição aprovada!' : 'Inscrição cancelada.');
      load();
      onChanged?.();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro na ação.');
    } finally {
      setActing(false);
    }
  };

  const columns = [
    { title: 'Nome', dataIndex: 'name' },
    { title: 'E-mail', dataIndex: 'email' },
    {
      title: 'Tipo', dataIndex: 'reg_type',
      render: (v) => <Tag color={TYPE_COLORS[v]}>{TYPE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Índice', dataIndex: 'lote_index',
      sorter: (a, b) => (a.lote_index ?? Infinity) - (b.lote_index ?? Infinity),
      render: (v) => (v === null ? '—' : `#${v}`),
    },
    {
      title: 'Inscrição', dataIndex: 'registered_at',
      render: (v) => (v ? dayjs(v).format('DD/MM HH:mm') : '—'),
    },
    {
      title: 'Pagamento', dataIndex: 'payment_status',
      render: (v, r) => (
        <Space size={4} wrap>
          <Tag color={PAY_COLORS[v]}>{PAY_LABELS[v] ?? v}</Tag>
          {r.reg_status === 'pending' && !r.holds_slot && <Tag>Expirada (sem vaga)</Tag>}
        </Space>
      ),
    },
    {
      title: 'Comprovante', key: 'proof',
      render: (_, r) => (
        r.has_proof
          ? <Button size="small" onClick={() => openProof(r.payment_id)}>Ver</Button>
          : <span className={styles.muted}>—</span>
      ),
    },
    {
      title: 'Ações', key: 'actions',
      render: (_, r) => {
        if (r.reg_status !== 'pending' || r.payment_id === null) return null;
        const approve = (
          <Button
            size="small" type="primary" loading={acting}
            style={{ background: '#8A00C4', borderColor: '#8A00C4' }}
            onClick={r.has_proof ? () => act(r.payment_id, 'confirm') : undefined}
          >
            Aprovar
          </Button>
        );
        return (
          <Space>
            {r.has_proof ? approve : (
              <Popconfirm
                title="Aprovar sem comprovante?"
                description="Este participante ainda não enviou o comprovante do PIX."
                onConfirm={() => act(r.payment_id, 'confirm')}
              >
                {approve}
              </Popconfirm>
            )}
            <Popconfirm title="Cancelar inscrição?" onConfirm={() => act(r.payment_id, 'cancel')}>
              <Button size="small" danger loading={acting}>Cancelar</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const filtered = filterRows(rows, search, (r) => [
    r.name, r.email, TYPE_LABELS[r.reg_type],
    r.lote_index === null ? '' : `#${r.lote_index} ${r.lote_index}`,
    PAY_LABELS[r.payment_status],
  ].join(' '));
  const byStatus = (status) => filtered.filter((r) => r.reg_status === status);
  const tab = (key, label) => {
    const list = byStatus(key);
    return {
      key,
      label: `${label} (${list.length})`,
      children: (
        <Table
          rowKey="registration_id"
          dataSource={list}
          columns={columns}
          loading={loading}
          pagination={list.length > 10 ? { pageSize: 10 } : false}
          size="small"
          scroll={{ x: 900 }}
        />
      ),
    };
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, e-mail, índice..." width={300} />
      </div>
      <Tabs
        size="small"
        defaultActiveKey="confirmed"
        items={[
          tab('confirmed', 'Inscritos'),
          tab('pending', 'Pendentes'),
          tab('cancelled', 'Cancelados'),
        ]}
      />
    </div>
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
  const [search, setSearch] = useState('');
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
      title: 'Pagos', dataIndex: 'paid',
      render: (v) => <Tag color="green">{v}</Tag>,
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
      extra={(
        <Space wrap>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar lote, instituição, tipo..." />
          <Button type="primary" onClick={openNew} style={{ background: '#8A00C4', borderColor: '#8A00C4' }}>Novo lote</Button>
        </Space>
      )}
    >
      <Table
        rowKey="id"
        dataSource={filterRows(lotes, search, (l) => [
          l.name, TYPE_LABELS[l.participant_type], l.institution || 'Todas',
          l.is_active ? 'Aberto' : 'Fechado', l.has_qr ? 'QR enviado' : 'Sem QR',
        ].join(' '))}
        columns={columns}
        loading={loading}
        pagination={false}
        size="small"
        expandable={{
          expandedRowRender: (lote) => <LoteRegistrations loteId={lote.id} onChanged={load} />,
        }}
      />

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
  const [expenseSearch, setExpenseSearch] = useState('');
  const [revenueSearch, setRevenueSearch] = useState('');
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
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return; // campos inválidos: o antd já destaca os erros no formulário
    }
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

      <Card
        title="Despesas"
        style={{ marginTop: 16 }}
        extra={<SearchInput value={expenseSearch} onChange={setExpenseSearch} placeholder="Buscar despesa..." />}
      >
        <Table
          rowKey="id"
          dataSource={filterRows(expenses, expenseSearch, (e) => `${e.category} ${e.description}`)}
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

      <Card
        title="Receitas extras (patrocínio, doações...)"
        style={{ marginTop: 16 }}
        extra={<SearchInput value={revenueSearch} onChange={setRevenueSearch} placeholder="Buscar receita..." />}
      >
        <Table
          rowKey="id"
          dataSource={filterRows(revenues, revenueSearch, (r) => `${r.category} ${r.description}`)}
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
  const [search, setSearch] = useState('');
  const [enrollSearch, setEnrollSearch] = useState('');
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
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return; // campos inválidos: o antd já destaca os erros no formulário
    }
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

  const regenerateCode = async (id) => {
    try {
      await axios.put('/TW26/backend/api/admin/activities.php', { id, regenerate_code: true });
      message.success('Novo código gerado.');
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao gerar novo código.');
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button type="primary" style={{ background: '#8A00C4', borderColor: '#8A00C4' }} onClick={openNew}>
          Nova atividade
        </Button>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar título, palestrante, local..." width={300} />
      </Space>

      <Table
        rowKey="id"
        dataSource={filterRows(activities, search, (a) => [
          a.title, ACTIVITY_TYPE_LABELS[a.type], a.speaker_name, a.location,
          a.is_published ? 'Publicada' : 'Não publicada',
        ].join(' '))}
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
          {
            title: 'Presentes', dataIndex: 'attended',
            render: (v, r) => `${v ?? 0}/${enrolledCount(r.id)}`,
          },
          {
            title: 'Código de presença', dataIndex: 'attendance_code',
            render: (v, r) => (
              <Space>
                <span style={{ fontFamily: 'monospace', letterSpacing: '0.1em', fontWeight: 700 }}>{v}</span>
                <Popconfirm
                  title="Gerar novo código?"
                  description="O código atual deixa de funcionar imediatamente."
                  onConfirm={() => regenerateCode(r.id)}
                >
                  <Button size="small" type="link" style={{ padding: 0 }}>Gerar novo</Button>
                </Popconfirm>
              </Space>
            ),
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

      <Card
        title="Inscritos por atividade"
        style={{ marginTop: 16 }}
        extra={<SearchInput value={enrollSearch} onChange={setEnrollSearch} placeholder="Buscar atividade, nome, e-mail..." width={300} />}
      >
        <Table
          rowKey={(r) => `${r.activity_id}-${r.user_id}`}
          dataSource={filterRows(enrollments, enrollSearch, (e) => [
            activities.find((a) => Number(a.id) === Number(e.activity_id))?.title, e.name, e.email,
          ].join(' '))}
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

/* ─── Credenciamento ─────────────────────────────────────────────────────── */
const CHECKIN_METHOD_LABELS = { scan: 'QR code', manual: 'Digitado', self: 'Participante' };

/**
 * Registro de presença por QR ou código digitado. O endpoint já devolve apenas
 * as atividades designadas a este credenciador (super_admin recebe todas).
 */
function CheckinTab({ visible = true }) {
  const [activities, setActivities] = useState([]);
  const [activityId, setActivityId] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [mode, setMode] = useState('camera');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  // Último QR enviado: a câmera lê o mesmo código muitas vezes por segundo.
  const lastScanRef = useRef('');

  const loadActivities = useCallback(() => {
    axios.get('/TW26/backend/api/admin/attendance.php')
      .then((res) => {
        const list = res.data.activities ?? [];
        setActivities(list);
        setActivityId((prev) => prev ?? (list.length === 1 ? list[0].id : null));
      })
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar atividades.'))
      .finally(() => setLoaded(true));
  }, []);

  const loadAttendance = useCallback((id) => {
    if (!id) {
      setAttendance([]);
      return;
    }
    axios.get(`/TW26/backend/api/admin/attendance.php?activity_id=${id}`)
      .then((res) => setAttendance(res.data.attendance ?? []))
      .catch(() => setAttendance([]));
  }, []);

  useEffect(loadActivities, [loadActivities]);
  useEffect(() => loadAttendance(activityId), [activityId, loadAttendance]);

  const submit = useCallback(async (rawCode, method) => {
    const value = String(rawCode ?? '').trim();
    if (!activityId || !value || busy) return;

    setBusy(true);
    try {
      const res = await axios.post('/TW26/backend/api/admin/attendance.php', {
        activity_id: activityId,
        code: value,
        method,
      });
      setFeedback({ type: 'success', text: res.data?.message ?? 'Presença registrada.' });
      setCode('');
      loadActivities();
      loadAttendance(activityId);
    } catch (err) {
      const status = err.response?.status;
      setFeedback({
        // 409 = já credenciado: aviso, não erro — a pessoa está na sala mesmo assim.
        type: status === 409 ? 'warning' : 'error',
        text: err.response?.data?.message ?? 'Erro ao registrar presença.',
      });
    } finally {
      setBusy(false);
    }
  }, [activityId, busy, loadActivities, loadAttendance]);

  const onScan = useCallback((text) => {
    if (text === lastScanRef.current) return;
    lastScanRef.current = text;
    // Libera o mesmo QR depois de 3s, para reler de propósito se precisar.
    setTimeout(() => { lastScanRef.current = ''; }, 3000);
    submit(text, 'scan');
  }, [submit]);

  const undo = async (userId) => {
    try {
      await axios.delete('/TW26/backend/api/admin/attendance.php', {
        data: { activity_id: activityId, user_id: userId },
      });
      message.success('Presença desfeita.');
      loadActivities();
      loadAttendance(activityId);
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao desfazer.');
    }
  };

  if (loaded && activities.length === 0) {
    return (
      <Card title="Credenciamento">
        <p className={styles.muted}>
          Nenhuma atividade designada a você. Peça ao super admin para designar as
          oficinas que você vai credenciar (painel &gt; Usuários &gt; editar seu usuário).
        </p>
      </Card>
    );
  }

  const selected = activities.find((a) => Number(a.id) === Number(activityId));

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={10}>
        <Card title="Registrar presença">
          <Select
            placeholder="Escolha a atividade"
            value={activityId}
            onChange={(v) => { setActivityId(v); setFeedback(null); }}
            style={{ width: '100%', marginBottom: 16 }}
            showSearch
            optionFilterProp="label"
            options={activities.map((a) => ({
              value: a.id,
              label: `${a.title} (${ACTIVITY_TYPE_LABELS[a.type] ?? a.type})`,
            }))}
          />

          {!activityId ? (
            <p className={styles.muted}>Escolha uma atividade para começar.</p>
          ) : (
            <>
              <Statistic
                title="Presentes / inscritos"
                value={`${selected?.attended ?? 0} / ${selected?.enrolled ?? 0}`}
                valueStyle={{ color: '#8A00C4', fontWeight: 800 }}
              />

              <Space style={{ margin: '16px 0' }} wrap>
                <Button
                  type={mode === 'camera' ? 'primary' : 'default'}
                  onClick={() => setMode('camera')}
                  style={mode === 'camera' ? { background: '#8A00C4', borderColor: '#8A00C4' } : undefined}
                >
                  Câmera (QR)
                </Button>
                <Button
                  type={mode === 'manual' ? 'primary' : 'default'}
                  onClick={() => setMode('manual')}
                  style={mode === 'manual' ? { background: '#8A00C4', borderColor: '#8A00C4' } : undefined}
                >
                  Digitar código
                </Button>
              </Space>

              {mode === 'camera' ? (
                // visible: o antd mantém a aba montada ao trocar de aba — sem isso
                // a câmera continuaria ligada em segundo plano.
                <QrScanner active={visible} onScan={onScan} />
              ) : (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Código do participante"
                    value={code}
                    maxLength={16}
                    autoFocus
                    onChange={(e) => setCode(e.target.value)}
                    onPressEnter={() => submit(code, 'manual')}
                  />
                  <Button
                    type="primary"
                    loading={busy}
                    onClick={() => submit(code, 'manual')}
                    style={{ background: '#8A00C4', borderColor: '#8A00C4' }}
                  >
                    Registrar
                  </Button>
                </Space.Compact>
              )}

              {feedback && (
                <div
                  style={{
                    marginTop: 16, padding: '10px 14px', borderRadius: 8, fontWeight: 600,
                    color: '#fff',
                    background: feedback.type === 'success' ? '#237804'
                      : feedback.type === 'warning' ? '#ad6800' : '#a8071a',
                  }}
                >
                  {feedback.text}
                </div>
              )}
            </>
          )}
        </Card>
      </Col>

      <Col xs={24} lg={14}>
        <Card
          title="Presentes"
          extra={<SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, e-mail..." width={240} />}
        >
          <Table
            rowKey="user_id"
            dataSource={filterRows(attendance, search, (a) => [a.name, a.email].join(' '))}
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Nenhuma presença registrada ainda.' }}
            columns={[
              { title: 'Nome', dataIndex: 'name' },
              { title: 'E-mail', dataIndex: 'email' },
              {
                title: 'Como', dataIndex: 'method',
                render: (v) => <Tag>{CHECKIN_METHOD_LABELS[v] ?? v}</Tag>,
              },
              {
                title: 'Horário', dataIndex: 'checked_in_at',
                render: (v) => (v ? dayjs(v).format('DD/MM HH:mm') : '—'),
              },
              {
                title: 'Ações', key: 'actions',
                render: (_, r) => (
                  <Popconfirm title="Desfazer presença?" onConfirm={() => undo(r.user_id)}>
                    <Button size="small" danger>Desfazer</Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}

/* ─── Usuários ───────────────────────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [available, setAvailable] = useState([]);
  const [activities, setActivities] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();
  // O escopo de credenciamento só faz sentido para quem tem a permissão.
  const selectedPerms = Form.useWatch('permissions', form) ?? [];
  const isCredentialer = selectedPerms.includes('credentialer');

  const load = () => {
    axios.get('/TW26/backend/api/admin/users.php')
      .then((res) => {
        setUsers(res.data.users ?? []);
        setAvailable(res.data.permissions ?? []);
        setActivities(res.data.activities ?? []);
      })
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar usuários.'));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ participant_type: 'participant', permissions: [], credential_activities: [] });
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    form.setFieldsValue({
      name: u.name, email: u.email, cpf: u.cpf, institution: u.institution,
      participant_type: u.participant_type, permissions: u.permissions ?? [],
      credential_activities: u.credential_activities ?? [],
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
      name: v.name, email: v.email, cpf: v.cpf.replace(/\D/g, ''),
      institution: v.institution ?? '', participant_type: v.participant_type,
      permissions: v.permissions ?? [],
      credential_activities: v.credential_activities ?? [],
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
    { title: 'Lote', dataIndex: 'lote_name', render: (v) => v ?? '—' },
    { title: 'Índice', dataIndex: 'lote_index', render: (v) => (v === null ? '—' : `#${v}`) },
    {
      title: 'Permissões', dataIndex: 'permissions',
      render: (v) => (v?.length ? v.map((p) => <Tag key={p} color="geekblue">{p}</Tag>) : <Tag>—</Tag>),
    },
    {
      title: 'Credencia', dataIndex: 'credential_activities',
      render: (v, r) => {
        if (!(r.permissions ?? []).includes('credentialer')) return '—';
        return v?.length
          ? <Tag color="purple">{v.length} atividade{v.length > 1 ? 's' : ''}</Tag>
          : <Tag color="red">nenhuma</Tag>;
      },
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
      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, e-mail, CPF, lote, permissão..." width={360} />
      </div>
      <Table
        rowKey="id"
        dataSource={filterRows(users, search, (u) => [
          u.name, u.email, u.cpf, u.institution, TYPE_LABELS[u.participant_type], u.lote_name,
          u.lote_index === null ? '' : `#${u.lote_index} ${u.lote_index}`,
          (u.permissions ?? []).join(' '),
        ].join(' '))}
        columns={columns}
        size="small"
        pagination={{ pageSize: 15 }}
      />

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
          {isCredentialer && (
            <Form.Item
              name="credential_activities"
              label="Atividades que pode credenciar"
              extra="Deixe vazio e o credenciador não registra presença em nenhuma atividade. Super admin credencia todas."
            >
              <Select
                mode="multiple"
                placeholder="Selecione as oficinas/palestras deste credenciador"
                optionFilterProp="label"
                options={activities.map((a) => ({
                  value: a.id,
                  label: `${a.title} (${ACTIVITY_TYPE_LABELS[a.type] ?? a.type})`,
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}

/* ─── Painel principal ───────────────────────────────────────────────────── */
/**
 * Abas por permissão: cada aba lista quem pode vê-la. Evita que um credenciador
 * abra "Financeiro" só para tomar 403 do endpoint.
 */
const ADMIN_TABS = [
  { key: 'overview', label: 'Visão Geral', perms: ['super_admin', 'registration_admin', 'content_admin'], render: () => <OverviewTab /> },
  { key: 'checkin', label: 'Credenciamento', perms: ['super_admin', 'credentialer'], render: (active) => <CheckinTab visible={active === 'checkin'} /> },
  { key: 'registrations', label: 'Inscrições', perms: ['super_admin', 'registration_admin'], render: () => <RegistrationsTab /> },
  { key: 'lotes', label: 'Lotes', perms: ['super_admin', 'registration_admin'], render: () => <LotesTab /> },
  { key: 'financeiro', label: 'Financeiro', perms: ['super_admin'], render: () => <FinanceiroTab /> },
  { key: 'activities', label: 'Oficinas', perms: ['super_admin', 'content_admin'], render: () => <AdminActivitiesTab /> },
  { key: 'users', label: 'Usuários', perms: ['super_admin'], render: () => <UsersTab /> },
];

export default function Admin() {
  const [status, setStatus] = useState('loading');
  const [perms, setPerms] = useState([]);
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    axios.get('/TW26/backend/api/me.php')
      .then((res) => {
        if (res.data?.user && res.data?.is_admin) {
          setPerms(res.data.permissions ?? []);
          setStatus('ok');
        } else setStatus('denied');
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

  const tabs = ADMIN_TABS.filter((t) => t.perms.some((p) => perms.includes(p)));
  // Credenciador puro vê só o credenciamento; o subtítulo acompanha.
  const onlyCheckin = tabs.length === 1 && tabs[0].key === 'checkin';
  const current = activeKey ?? tabs[0]?.key;

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <SectionTitle
            tag="// Painel Admin"
            title="Gestão TechWeek 2026"
            subtitle={onlyCheckin
              ? 'Registre a presença dos participantes nas atividades designadas a você.'
              : 'Inscrições, lotes, financeiro, oficinas e usuários.'}
            center
          />
        </motion.div>

        <Tabs
          size="large"
          activeKey={current}
          onChange={setActiveKey}
          items={tabs.map((t) => ({ key: t.key, label: t.label, children: t.render(current) }))}
        />
      </div>
    </section>
  );
}