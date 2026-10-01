import { useState, useEffect, useCallback } from 'react';
import { Tabs, Button, Tag, Space, Popconfirm, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import styles from '../../../styles/Admin.module.css';
import { TYPE_LABELS, TYPE_COLORS, PAY_LABELS, PAY_COLORS } from '../shared/constants';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';
import { openProof } from '../shared/openProof';

export default function LoteRegistrations({ loteId, onChanged }) {
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
      const successMsg = {
        confirm: 'Inscrição aprovada!',
        revert: 'Aprovação revertida.',
        cancel: 'Inscrição cancelada.',
      };
      message.success(successMsg[action] ?? 'Ação concluída.');
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
        if (r.payment_id === null) return null;
        if (r.reg_status === 'confirmed') {
          return (
            <Popconfirm
              title="Reverter aprovação?"
              description={r.has_proof
                ? 'A inscrição volta a ficar pendente e o pagamento, em confirmação (já tem comprovante).'
                : 'A inscrição volta a ficar pendente e o pagamento, aguardando.'}
              onConfirm={() => act(r.payment_id, 'revert')}
            >
              <Button size="small" loading={acting}>Reverter</Button>
            </Popconfirm>
          );
        }
        if (r.reg_status !== 'pending') return null;
        const approve = (
          <Button
            size="small" type="primary" loading={acting}
            style={r.has_proof
              ? { background: '#8A00C4', borderColor: '#8A00C4' }
              : { background: '#FAAD14', borderColor: '#FAAD14', color: '#000' }}
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
        <ResponsiveTable
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
