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
  const [lotes, setLotes] = useState([]);
  const [form] = Form.useForm();

  const load = () => {
    axios.get('/TW26/backend/api/admin/activities.php')
      .then((res) => {
        setActivities(res.data.activities ?? []);
        setLotes(res.data.lotes ?? []);
      })
      .catch(() => message.error('Erro ao carregar atividades.'));
    axios.get('/TW26/backend/api/admin/activities.php?enrollments=1')
      .then((res) => setEnrollments(res.data.enrollments ?? []))
      .catch(() => {});
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'oficina', is_published: '0', early_lote_ids: [] });
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
      early_lote_ids: act.early_lote_ids ?? [],
      early_hours: act.early_window_minutes ? Math.floor(act.early_window_minutes / 60) : null,
      early_minutes: act.early_window_minutes ? act.early_window_minutes % 60 : null,
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
      early_lote_ids: v.early_lote_ids ?? [],
      early_window_minutes: (v.early_lote_ids ?? []).length > 0
        ? (v.early_hours ?? 0) * 60 + (v.early_minutes ?? 0)
        : null,
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

  const publish = async (id) => {
    try {
      const res = await axios.put('/TW26/backend/api/admin/activities.php', { id, action: 'publish' });
      message.success(res.data.message);
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao publicar.');
    }
  };

  const publishAll = async () => {
    try {
      const res = await axios.put('/TW26/backend/api/admin/activities.php', { action: 'publish_all' });
      message.success(res.data.message);
      load();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao publicar.');
    }
  };

  const unpublishedCount = activities.filter((a) => !a.is_published).length;

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
        <Popconfirm
          title={`Publicar ${unpublishedCount} atividade(s)?`}
          description="Começa agora a contagem do acesso antecipado de cada uma."
          disabled={unpublishedCount === 0}
          onConfirm={publishAll}
        >
          <Button disabled={unpublishedCount === 0}>Publicar todas ({unpublishedCount})</Button>
        </Popconfirm>
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
                {!r.is_published && (
                  <Button size="small" type="primary" style={{ background: '#8A00C4', borderColor: '#8A00C4' }} onClick={() => publish(r.id)}>
                    Publicar
                  </Button>
                )}
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
          <Form.Item
            name="early_lote_ids"
            label="Acesso antecipado — lotes"
            extra="Quem pagou algum destes lotes se inscreve assim que a atividade é publicada; os demais só depois da antecedência. Vazio = aberta para todos ao publicar."
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="Nenhum (aberta para todos)"
              options={lotes.map((l) => ({ value: l.id, label: l.name }))}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.early_lote_ids !== cur.early_lote_ids}
          >
            {({ getFieldValue }) => (getFieldValue('early_lote_ids') ?? []).length > 0 && (
              <Row gutter={16}>
                <Col xs={12} md={6}>
                  <Form.Item name="early_hours" label="Antecedência — horas" initialValue={0}>
                    <InputNumber min={0} max={8760} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item
                    name="early_minutes"
                    label="Antecedência — minutos"
                    initialValue={0}
                    dependencies={['early_hours']}
                    rules={[({ getFieldValue: get }) => ({
                      validator: (_, value) => ((get('early_hours') ?? 0) * 60 + (value ?? 0) > 0
                        ? Promise.resolve()
                        : Promise.reject(new Error('Informe horas e/ou minutos.'))),
                    })]}
                  >
                    <InputNumber min={0} max={59} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
