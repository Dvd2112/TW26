import { useState } from 'react';
import { Button, Popconfirm, Tag, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

export default function ActivityEnrollments({ activityId, rows, onChange }) {
  const [search, setSearch] = useState('');
  const [marking, setMarking] = useState(false);
  const attended = rows.filter((r) => r.attended_at).length;

  const markAll = () => {
    setMarking(true);
    axios.post('/TW26/backend/api/admin/attendance.php', { activity_id: activityId, all: true })
      .then((res) => {
        message.success(res.data.message);
        onChange?.();
      })
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao registrar as presenças.'))
      .finally(() => setMarking(false));
  };

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, e-mail..." width={300} />
        <span>{rows.length} inscrito(s) · {attended} presente(s)</span>
        <Popconfirm
          title="Dar presença a todos?"
          description={`${rows.length - attended} inscrito(s) sem presença serão marcados como presentes.`}
          okText="Confirmar"
          cancelText="Cancelar"
          onConfirm={markAll}
          disabled={rows.length === attended}
        >
          <Button loading={marking} disabled={rows.length === attended}>Dar presença a todos</Button>
        </Popconfirm>
      </div>
      <ResponsiveTable
        rowKey="user_id"
        dataSource={filterRows(rows, search, (r) => [r.name, r.email].join(' '))}
        size="small"
        pagination={rows.length > 10 ? { pageSize: 10 } : false}
        locale={{ emptyText: 'Nenhum inscrito nesta atividade.' }}
        columns={[
          { title: 'Nome', dataIndex: 'name' },
          { title: 'E-mail', dataIndex: 'email' },
          {
            title: 'Inscrito em', dataIndex: 'enrolled_at',
            render: (v) => (v ? dayjs(v).format('DD/MM HH:mm') : '—'),
          },
          {
            title: 'Presença', dataIndex: 'attended_at',
            render: (v) => (v ? <Tag color="green">{dayjs(v).format('DD/MM HH:mm')}</Tag> : <Tag>Ausente</Tag>),
          },
        ]}
      />
    </div>
  );
}
