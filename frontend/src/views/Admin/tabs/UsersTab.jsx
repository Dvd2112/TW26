import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Input, Select, Tag, Row, Col, Space, Popconfirm, message } from 'antd';
import axios from 'axios';
import styles from '../../../styles/Admin.module.css';
import { TYPE_LABELS, TYPE_COLORS, ACTIVITY_TYPE_LABELS } from '../shared/constants';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

const { Option } = Select;

export default function UsersTab() {
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
      <ResponsiveTable
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
