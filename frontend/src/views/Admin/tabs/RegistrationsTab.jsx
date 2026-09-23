import { useState, useEffect, useCallback } from 'react';
import { Card, Button, InputNumber, Select, Tag, Space, Popconfirm, message } from 'antd';
import axios from 'axios';
import styles from '../../../styles/Admin.module.css';
import { TYPE_LABELS, TYPE_COLORS, PAY_LABELS, PAY_COLORS } from '../shared/constants';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';
import { openProof } from '../shared/openProof';

const { Option } = Select;

export default function RegistrationsTab() {
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
      const successMsg = {
        confirm: 'Pagamento confirmado!',
        revert: 'Aprovação revertida.',
        cancel: 'Inscrição cancelada.',
      };
      message.success(successMsg[action] ?? 'Ação concluída.');
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
            <Space>
              <Popconfirm
                title="Reverter aprovação?"
                description={r.has_proof
                  ? 'A inscrição volta a ficar pendente e o pagamento, em confirmação (já tem comprovante).'
                  : 'A inscrição volta a ficar pendente e o pagamento, aguardando.'}
                onConfirm={() => act(r.payment_id, 'revert')}
              >
                <Button size="small" loading={confirming}>Reverter</Button>
              </Popconfirm>
              <Popconfirm title="Cancelar inscrição e reembolsar?" onConfirm={() => act(r.payment_id, 'cancel')}>
                <Button size="small" danger loading={confirming}>Cancelar</Button>
              </Popconfirm>
            </Space>
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
        if (r.reg_status === 'pending' && !r.has_proof
          && (r.payment_status === 'pending' || r.payment_status === 'failed')) {
          return (
            <Space>
              <Popconfirm
                title="Aprovar sem comprovante?"
                description="Este participante ainda não enviou o comprovante do PIX."
                onConfirm={() => act(r.payment_id, 'confirm')}
              >
                <Button size="small" type="primary" loading={confirming}
                  style={{ background: '#FAAD14', borderColor: '#FAAD14', color: '#000' }}>
                  Aprovar
                </Button>
              </Popconfirm>
              <Popconfirm title="Cancelar inscrição?" onConfirm={() => act(r.payment_id, 'cancel')}>
                <Button size="small" danger loading={confirming}>Cancelar</Button>
              </Popconfirm>
            </Space>
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
          <Option value="pending">Aguardando pagamento</Option>
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
      <ResponsiveTable
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
