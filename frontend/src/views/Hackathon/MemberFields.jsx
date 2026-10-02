import { Form, Input } from 'antd';
import { formatCPF, formatPhone } from './constants';

/**
 * Campos de um integrante (nome, CPF, e-mail). `prefix` é o caminho do Form.Item:
 * [field.name] dentro de Form.List, ou [] num formulário avulso.
 */
export default function MemberFields({ form, prefix = [], disabledIdentity = false }) {
  const path = (field) => [...prefix, field];

  return (
    <>
      <Form.Item name={path('name')} label="Nome completo" rules={[{ required: true, message: 'Informe o nome' }]}>
        <Input size="large" placeholder="Nome do integrante" disabled={disabledIdentity} />
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
            disabled={disabledIdentity}
            onChange={(e) => form.setFieldValue(path('cpf'), formatCPF(e.target.value))}
          />
        </Form.Item>
        <Form.Item
          name={path('email')}
          label="E-mail"
          style={{ flex: '2 1 220px' }}
          rules={[{ required: true, type: 'email', message: 'Informe um e-mail válido' }]}
        >
          <Input size="large" placeholder="email@exemplo.com" disabled={disabledIdentity} />
        </Form.Item>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Form.Item
          name={path('birth_date')}
          label="Data de nascimento"
          style={{ flex: '1 1 180px' }}
          rules={[{ required: true, message: 'Informe a data de nascimento' }]}
        >
          <Input size="large" type="date" />
        </Form.Item>
        <Form.Item
          name={path('phone')}
          label="DDD + Telefone / WhatsApp"
          style={{ flex: '2 1 220px' }}
          rules={[
            { required: true, message: 'Informe o telefone' },
            {
              validator: (_, v) => (!v || v.replace(/\D/g, '').length >= 10
                ? Promise.resolve()
                : Promise.reject(new Error('Informe DDD e telefone'))),
            },
          ]}
        >
          <Input
            size="large"
            placeholder="(46) 99999-9999"
            maxLength={15}
            onChange={(e) => form.setFieldValue(path('phone'), formatPhone(e.target.value))}
          />
        </Form.Item>
      </div>
    </>
  );
}
