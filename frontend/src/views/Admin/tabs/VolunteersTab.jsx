import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Tag, Space, Popconfirm, message, Switch } from 'antd';
import axios from 'axios';
import styles from '../../../styles/Admin.module.css';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

const VOLUNTEER_STATUS_LABELS = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };
const VOLUNTEER_STATUS_COLORS = { pending: 'gold', approved: 'green', rejected: 'red' };
const VOLUNTEER_ROLE_LABELS = { credenciamento: 'Credenciamento', montagem: 'Montagem', hackathon: 'Hackathon' };

function formatVolunteerRoles(csv) {
  return (csv || '')
    .split(',')
    .filter(Boolean)
    .map((r) => VOLUNTEER_ROLE_LABELS[r] ?? r)
    .join(', ') || '—';
}

function formatVolunteerDays(csv, prefix) {
  const days = (csv || '').split(',').filter(Boolean);
  return days.length ? days.map((d) => `${prefix}${d}`).join(', ') : '—';
}

export default function VolunteersTab() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    axios.get('/TW26/backend/api/admin/volunteers.php')
      .then((res) => {
        setRows(res.data.applications ?? []);
        setOpen(res.data.applications_open ?? true);
      })
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar candidaturas.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const act = async (applicationId, action) => {
    setActing(true);
    try {
      await axios.post('/TW26/backend/api/admin/volunteers.php', { application_id: applicationId, action });
      message.success(action === 'approve' ? 'Candidatura aprovada!' : 'Candidatura rejeitada.');
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro na ação.');
    } finally {
      setActing(false);
    }
  };

  const toggleOpen = async (checked) => {
    setTogglingOpen(true);
    try {
      await axios.post('/TW26/backend/api/admin/volunteers.php', { action: 'set_open', open: checked });
      setOpen(checked);
      message.success(checked ? 'Candidaturas reabertas.' : 'Candidaturas encerradas.');
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao atualizar configuração.');
    } finally {
      setTogglingOpen(false);
    }
  };

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'E-mail', dataIndex: 'email', key: 'email' },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone' },
    { title: 'Frentes', key: 'roles', render: (_, r) => formatVolunteerRoles(r.roles) },
    { title: 'Dias (evento)', key: 'event_days', render: (_, r) => formatVolunteerDays(r.event_days, '') },
    { title: 'Dias (hackathon)', key: 'hackathon_days', render: (_, r) => formatVolunteerDays(r.hackathon_days, '') },
    { title: 'Motivação', dataIndex: 'motivation', key: 'motivation', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <Tag color={VOLUNTEER_STATUS_COLORS[v]}>{VOLUNTEER_STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, r) => (
        r.status === 'pending' ? (
          <Space>
            <Button
              size="small"
              type="primary"
              loading={acting}
              onClick={() => act(r.id, 'approve')}
              style={{ background: '#8A00C4', borderColor: '#8A00C4' }}
            >
              Aprovar
            </Button>
            <Popconfirm title="Rejeitar candidatura?" onConfirm={() => act(r.id, 'reject')}>
              <Button size="small" danger loading={acting}>Rejeitar</Button>
            </Popconfirm>
          </Space>
        ) : (
          <span className={styles.muted}>—</span>
        )
      ),
    },
  ];

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, e-mail, telefone..." width={300} />
        <Space>
          <Switch checked={open} loading={togglingOpen} onChange={toggleOpen} />
          <span>{open ? 'Recebendo candidaturas' : 'Candidaturas encerradas'}</span>
        </Space>
      </Space>
      <ResponsiveTable
        rowKey="id"
        dataSource={filterRows(rows, search, (r) => [r.name, r.email, r.phone, r.motivation].join(' '))}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 15 }}
        size="small"
        scroll={{ x: 1200 }}
      />
    </Card>
  );
}
