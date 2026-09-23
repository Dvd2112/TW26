import { useState, useEffect } from 'react';
import { Card, Button, Modal, Form, Input, InputNumber, Statistic, Row, Col, Popconfirm, message, DatePicker } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

const { TextArea } = Input;

export default function FinanceiroTab() {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('expense');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [revenueSearch, setRevenueSearch] = useState('');
  const [form] = Form.useForm();

  const loadAll = () => {
    axios.get('/TW26/backend/api/admin/financeiro.php')
      .then((res) => setSummary(res.data))
      .catch(() => message.error('Erro ao carregar resumo.'));
    axios.get('/TW26/backend/api/admin/expenses.php')
      .then((res) => setExpenses(res.data.expenses ?? []))
      .catch(() => {});
    axios.get('/TW26/backend/api/admin/revenues.php')
      .then((res) => setRevenues(res.data.revenues ?? []))
      .catch(() => {});
  };

  useEffect(loadAll, []);

  const save = async () => {
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return; // campos inválidos: o antd já destaca os erros no formulário
    }
    const payload = kind === 'expense'
      ? { category: v.category, description: v.description, amount: v.amount, expense_date: dayjs(v.date).format('YYYY-MM-DDTHH:mm:ss') }
      : { category: v.category, description: v.description, amount: v.amount, received_at: dayjs(v.date).format('YYYY-MM-DDTHH:mm:ss') };
    try {
      await axios.post(kind === 'expense' ? '/TW26/backend/api/admin/expenses.php' : '/TW26/backend/api/admin/revenues.php', payload);
      message.success('Lançamento registrado.');
      setOpen(false);
      form.resetFields();
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao salvar.');
    }
  };

  const remove = async (kind, id) => {
    try {
      await axios.delete(kind === 'expense' ? '/TW26/backend/api/admin/expenses.php' : '/TW26/backend/api/admin/revenues.php', { data: { id } });
      message.success('Lançamento removido.');
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao remover.');
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Entradas (inscrições)" value={summary?.entradas_inscricoes ?? 0} precision={2} prefix="R$" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Entradas (outras)" value={summary?.entradas_outras ?? 0} precision={2} prefix="R$" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Saídas" value={summary?.total_saidas ?? 0} precision={2} prefix="R$" /></Card></Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Saldo"
              value={summary?.saldo ?? 0}
              precision={2}
              prefix="R$"
              valueStyle={{ color: (summary?.saldo ?? 0) >= 0 ? '#22c55e' : '#e94560' }}
            />
          </Card>
        </Col>
      </Row>

      <Button
        type="primary"
        style={{ background: '#8A00C4', borderColor: '#8A00C4', margin: '16px 0' }}
        onClick={() => { setKind('expense'); form.resetFields(); setOpen(true); }}
      >
        Lançar despesa
      </Button>
      <Button
        style={{ marginLeft: 8 }}
        onClick={() => { setKind('revenue'); form.resetFields(); setOpen(true); }}
      >
        Lançar receita
      </Button>

      <Card
        title="Despesas"
        style={{ marginTop: 16 }}
        extra={<SearchInput value={expenseSearch} onChange={setExpenseSearch} placeholder="Buscar despesa..." />}
      >
        <ResponsiveTable
          rowKey="id"
          dataSource={filterRows(expenses, expenseSearch, (e) => `${e.category} ${e.description}`)}
          size="small"
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Categoria', dataIndex: 'category' },
            { title: 'Descrição', dataIndex: 'description' },
            { title: 'Valor', dataIndex: 'amount', render: (v) => `R$ ${Number(v).toFixed(2)}` },
            {
              title: '', key: 'x', width: 60,
              render: (_, r) => (
                <Popconfirm title="Remover?" onConfirm={() => remove('expense', r.id)}>
                  <Button size="small" danger>Remover</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Card
        title="Receitas extras (patrocínio, doações...)"
        style={{ marginTop: 16 }}
        extra={<SearchInput value={revenueSearch} onChange={setRevenueSearch} placeholder="Buscar receita..." />}
      >
        <ResponsiveTable
          rowKey="id"
          dataSource={filterRows(revenues, revenueSearch, (r) => `${r.category} ${r.description}`)}
          size="small"
          pagination={{ pageSize: 8 }}
          columns={[
            { title: 'Categoria', dataIndex: 'category' },
            { title: 'Descrição', dataIndex: 'description' },
            { title: 'Valor', dataIndex: 'amount', render: (v) => `R$ ${Number(v).toFixed(2)}` },
            {
              title: '', key: 'x', width: 60,
              render: (_, r) => (
                <Popconfirm title="Remover?" onConfirm={() => remove('revenue', r.id)}>
                  <Button size="small" danger>Remover</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={kind === 'expense' ? 'Lançar despesa' : 'Lançar receita'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" initialValues={{ category: kind === 'expense' ? 'infraestrutura' : 'patrocinio', date: dayjs() }}>
          <Row gutter={16}>
            <Col xs={12} md={8}>
              <Form.Item name="category" label="Categoria" rules={[{ required: true }]}>
                <Input placeholder="ex.: infraestrutura, patrocinio..." />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="amount" label="Valor (R$)" rules={[{ required: true }]}>
                <InputNumber min={0.01} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="date" label="Data" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Descrição" rules={[{ required: true }]}>
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
