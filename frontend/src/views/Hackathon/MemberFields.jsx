import { Form, Input } from 'antd';
import { formatCPF } from './constants';

/**
 * Campos de um integrante (nome, CPF, e-mail). `prefix` é o caminho do Form.Item:
 * [field.name] dentro de Form.List, ou [] num formulário avulso.
 */
export default function MemberFields({ form, prefix = [] }) {
  const path = (field) => [...prefix, field];

  return (
    <>
      <Form.Item name={path('name')} label="Nome completo" rules={[{ required: true, message: 'Informe o nome' }]}>
        <Input size="large" placeholder="Nome do integrante" />
      </Form.Item>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Form.Item
          name={path('cpf')}
          label="CPF"
          style={{ flex: '1 1 160px' }}
          rules={[
            { required: true, message: 'Informe o CPF' },
            {
              validator: (_, v) => (!v || v.replace(/\D/g, '').length === 11
                ? Promise.resolve()
                : Promise.reject(new Error('CPF deve ter 11 dígitos'))),
            },
          ]}
        >
          <Input
            size="large"
            placeholder="000.000.000-00"
            maxLength={14}
            onChange={(e) => form.setFieldValue(path('cpf'), formatCPF(e.target.value))}
          />
        </Form.Item>
        <Form.Item
          name={path('email')}
          label="E-mail"
          style={{ flex: '2 1 220px' }}
          rules={[{ required: true, type: 'email', message: 'Informe um e-mail válido' }]}
        >
          <Input size="large" placeholder="email@exemplo.com" />
        </Form.Item>
      </div>
    </>
  );
}
