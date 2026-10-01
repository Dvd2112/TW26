import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Select, Tag, Row, Col, Space, Popconfirm, message, DatePicker, TimePicker } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import styles from '../../../styles/Admin.module.css';
import { ACTIVITY_TYPE_LABELS } from '../shared/constants';
import { filterRows, combineDateTime, formatActivitySchedule } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

const { Option } = Select;
const { TextArea } = Input;

export default function AdminActivitiesTab() {
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

      <ResponsiveTable
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
        <ResponsiveTable
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
