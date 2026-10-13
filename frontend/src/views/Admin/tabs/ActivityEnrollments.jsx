import { useState } from 'react';
import { Tag } from 'antd';
import dayjs from 'dayjs';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

export default function ActivityEnrollments({ rows }) {
  const [search, setSearch] = useState('');
  const attended = rows.filter((r) => r.attended_at).length;

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, e-mail..." width={300} />
        <span>{rows.length} inscrito(s) · {attended} presente(s)</span>
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
