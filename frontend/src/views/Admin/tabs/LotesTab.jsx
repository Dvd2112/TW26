import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Select, Tag, Row, Col, Space, Popconfirm, message, DatePicker, TimePicker, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import styles from '../../../styles/Admin.module.css';
import { TYPE_LABELS } from '../shared/constants';
import { filterRows, combineDateTime } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';
import LoteRegistrations from './LoteRegistrations';

const { Option } = Select;

export default function LotesTab() {
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
      <ResponsiveTable
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
