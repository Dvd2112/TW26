import { useState } from 'react';
import { Button, Checkbox, Form, Input, message, Radio } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import styles from '../../styles/Hackathon.module.css';
import MemberFields from './MemberFields';

export default function TeamForm({ settings, identity, onDone }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  // O líder (quem inscreve) conta como integrante; os demais são adicionados aqui.
  const minOthers = Math.max(0, settings.min_team_size - 1);
  const maxOthers = Math.max(0, settings.max_team_size - 1);

  const submit = async (values) => {
    setSaving(true);
    try {
      const res = await axios.post('/TW26/backend/api/hackathon.php', {
        action: 'create_team',
        team_name: values.team_name,
        leader: values.leader,
        members: values.members ?? [],
        lgpd_consent: values.lgpd_consent,
        diversity_requirement_confirmed: values.diversity_requirement_confirmed,
        career_outlook: values.career_outlook,
        future_plans: values.future_plans,
      });
      message.success(res.data?.message ?? 'Equipe inscrita!');
      onDone();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao inscrever a equipe.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Inscrever minha equipe</h3>
      <p className={styles.line}>
        Você será o líder. Informe o nome da equipe e os dados de todos os integrantes. Cada integrante precisa entrar no site e{' '}
        <strong>aceitar ou rejeitar</strong> o convite. Equipes de {settings.min_team_size} a {settings.max_team_size} pessoas
        (contando você).
      </p>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={submit}
        initialValues={{
          leader: { name: identity?.name, cpf: identity?.cpf, email: identity?.email },
          members: Array.from({ length: minOthers }, () => ({})),
        }}
      >
        <h4 className={styles.cardTitle}>Termo de Consentimento e Privacidade (LGPD)</h4>
        <p className={styles.line}>
          Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), autorizo a coleta,
          armazenamento e processamento dos dados pessoais informados para a organização, comunicação e execução
          das atividades do Ideathon - Jornada GovTech Francisco Beltrão.
        </p>
        <Form.Item
          name="team_name"
          label="Nome da equipe"
          rules={[{ required: true, min: 3, max: 60, message: 'O nome deve ter de 3 a 60 caracteres' }]}
        >
          <Input size="large" placeholder="Ex.: Os Debuggers" maxLength={60} />
        </Form.Item>

        <div className={styles.memberBox}>
          <div className={styles.memberHead}><strong>Participante 1 (líder)</strong></div>
          <MemberFields form={form} prefix={['leader']} disabledIdentity />
        </div>

        <Form.List name="members">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, i) => (
                <div className={styles.memberBox} key={field.key}>
                  <div className={styles.memberHead}>
                    <strong>Participante {i + 2}</strong>
                    {fields.length > minOthers && (
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                        Remover
                      </Button>
                    )}
                  </div>
                  <MemberFields form={form} prefix={[field.name]} />
                </div>
              ))}
              {fields.length < maxOthers && (
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()} style={{ marginBottom: 16 }}>
                  Adicionar integrante
                </Button>
              )}
            </>
          )}
        </Form.List>

        <Form.Item
          name="lgpd_consent"
          valuePropName="checked"
          rules={[{ validator: (_, value) => (value ? Promise.resolve() : Promise.reject(new Error('Você precisa concordar com os termos de privacidade'))) }]}
        >
          <Checkbox>
            Li e concordo com os termos de privacidade e com o uso dos meus dados para este evento.
          </Checkbox>
        </Form.Item>
        <Form.Item
          name="diversity_requirement_confirmed"
          valuePropName="checked"
          rules={[{ validator: (_, value) => (value ? Promise.resolve() : Promise.reject(new Error('Confirme o requisito obrigatório da equipe'))) }]}
        >
          <Checkbox>
            Confirmo que a equipe possui ao menos uma pessoa de outro curso ou de outra instituição de ensino/organização.
          </Checkbox>
        </Form.Item>
        <Form.Item
          name="career_outlook"
          label="Como vocês se imaginam daqui a 5 anos no mercado?"
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
        <Form.Item
          name="future_plans"
          label="Quer compartilhar mais sobre seus planos, ideias de empreendedorismo ou visão de futuro?"
        >
          <Input.TextArea rows={4} maxLength={2000} showCount placeholder="Espaço aberto para detalhar seus projetos e expectativas para a Jornada GovTech." />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={saving}
          style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}
        >
          Inscrever equipe
        </Button>
      </Form>
    </div>
  );
}
