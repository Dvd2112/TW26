import { useState } from 'react';
import { Button, Checkbox, Form, Input, message, Radio } from 'antd';
import axios from 'axios';
import styles from '../../styles/Hackathon.module.css';
import MemberFields from './MemberFields';

export default function IndividualForm({ identity, onDone }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const submit = async (values) => {
    setSaving(true);
    try {
      const res = await axios.post('/TW26/backend/api/hackathon.php', {
        action: 'register_individual',
        person: values.person,
        lgpd_consent: values.lgpd_consent,
        career_outlook: values.career_outlook,
        future_plans: values.future_plans,
      });
      message.success(res.data?.message ?? 'Inscrição individual realizada!');
      onDone();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao realizar a inscrição.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Inscrição individual</h3>
      <p className={styles.line}>
        Sem equipe? Inscreva-se sozinho(a): a organização vai alocar você em uma equipe antes do início do Ideathon.
      </p>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        initialValues={{ person: { name: identity?.name, cpf: identity?.cpf, email: identity?.email } }}
      >
        <MemberFields form={form} prefix={['person']} disabledIdentity />

        <Form.Item
          name="career_outlook"
          label="Como você se imagina daqui a 5 anos no mercado?"
          rules={[{ required: true, message: 'Selecione uma opção' }]}
        >
          <Radio.Group>
            <div><Radio value="empreendendo">Tendo meu próprio negócio / Empreendendo</Radio></div>
            <div><Radio value="grande_empresa">Trabalhando para uma grande empresa</Radio></div>
            <div><Radio value="academia_pesquisa">Estudando / Seguindo carreira acadêmica e de pesquisa</Radio></div>
            <div><Radio value="setor_publico">Trabalhando no setor público</Radio></div>
            <div><Radio value="outro">Outro</Radio></div>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="future_plans" label="Quer compartilhar mais sobre seus planos ou ideias? (opcional)">
          <Input.TextArea rows={3} maxLength={2000} showCount />
        </Form.Item>
        <Form.Item
          name="lgpd_consent"
          valuePropName="checked"
          rules={[{ validator: (_, v) => (v ? Promise.resolve() : Promise.reject(new Error('Você precisa concordar com os termos de privacidade'))) }]}
        >
          <Checkbox>
            Li e concordo com os termos de privacidade (LGPD) e com o uso dos meus dados para este evento.
          </Checkbox>
        </Form.Item>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            loading={saving}
            style={{ background: '#5E0087', border: 'none', fontWeight: 700, flex: '1 1 200px' }}
          >
            Confirmar inscrição individual
          </Button>
        </div>
      </Form>
    </div>
  );
}
