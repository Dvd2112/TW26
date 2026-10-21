import { useState, useEffect } from 'react';
import { Button, Checkbox, Input, Popconfirm, Space, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import downloadFile from '../../../utils/downloadFile';
import ResponsiveTable from '../shared/ResponsiveTable';

const API = '/TW26/backend/api/admin/activity-materials.php';
const formatSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function ActivityMaterials({ activityId, enrolledCount }) {
  const [materials, setMaterials] = useState([]);
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [notify, setNotify] = useState(true);
  const [sending, setSending] = useState(false);

  const load = () => axios.get(API, { params: { activity_id: activityId } })
    .then((res) => setMaterials(res.data.materials ?? []))
    .catch(() => setMaterials([]));

  useEffect(() => { load(); }, [activityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = () => {
    const form = new FormData();
    form.append('activity_id', activityId);
    form.append('notify', notify ? 'true' : 'false');
    if (files.length === 1 && title.trim()) form.append('title', title.trim());
    files.forEach((f) => form.append('files[]', f.originFileObj ?? f));
    setSending(true);
    axios.post(API, form)
      .then((res) => {
        message.success(res.data.message);
        setFiles([]);
        setTitle('');
        load();
      })
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao enviar os materiais.'))
      .finally(() => setSending(false));
  };

  const remove = (id) => axios.delete(API, { data: { id } })
    .then(() => { message.success('Material removido.'); load(); })
    .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao remover.'));

  return (
    <div style={{ marginTop: 20 }}>
      <strong>Materiais ({materials.length})</strong>
      <ResponsiveTable
        rowKey="id"
        dataSource={materials}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Nenhum material enviado.' }}
        columns={[
          { title: 'Título', dataIndex: 'title' },
          { title: 'Arquivo', dataIndex: 'original_name' },
          { title: 'Tamanho', dataIndex: 'size_bytes', render: formatSize },
          { title: 'Enviado em', dataIndex: 'created_at', render: (v) => dayjs(v).format('DD/MM HH:mm') },
          {
            title: '', key: 'actions',
            render: (_, m) => (
              <Space>
                <Button size="small" type="link" style={{ padding: 0 }} onClick={() => downloadFile(`/TW26/backend/api/materials.php?download=${m.id}`, m.original_name)}>Baixar</Button>
                <Popconfirm title="Remover material?" onConfirm={() => remove(m.id)}>
                  <Button size="small" type="link" danger style={{ padding: 0 }}>Remover</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Space direction="vertical" style={{ marginTop: 12, width: '100%' }}>
        <Upload
          multiple
          fileList={files}
          beforeUpload={() => false}
          onChange={({ fileList }) => setFiles(fileList)}
        >
          <Button icon={<UploadOutlined />}>Selecionar arquivos (slides, PDFs...)</Button>
        </Upload>
        {files.length === 1 && (
          <Input placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} style={{ maxWidth: 360 }} />
        )}
        <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)}>
          Avisar os {enrolledCount} inscrito(s) por e-mail
        </Checkbox>
        <Button type="primary" loading={sending} disabled={files.length === 0} onClick={send} style={{ background: '#8A00C4', borderColor: '#8A00C4' }}>
          Enviar {files.length > 1 ? `${files.length} arquivos` : 'material'}
        </Button>
      </Space>
    </div>
  );
}
