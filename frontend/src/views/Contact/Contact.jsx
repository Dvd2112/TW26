import { useState } from 'react';
import { Form, Input, Select, Button, message } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Contact.module.css';

const { TextArea } = Input;
const { Option } = Select;

const contentByAudience = {
  general: {
    sectionTitle: {
      tag: '// 03 – Conversa Inicial',
      title: 'Vamos Direcionar a Apresentação Certa?',
      subtitle: 'Se você quer usar a TechWeek para apresentar o projeto, o palco ou a jornada do participante, este contato centraliza a conversa com a organização.',
    },
    callout: 'A TechWeek 2026 está sendo desenhada para falar com públicos diferentes sem perder consistência. Use este canal para alinhar narrativa, materiais e próximos passos.',
    email: 'david.junior211204@gmail.com',
    companyLabel: 'Empresa / Instituição',
    companyPlaceholder: 'UTFPR, comunidade, empresa parceira...',
    selectField: {
      name: 'interest',
      label: 'Interesse principal',
      placeholder: 'Selecione...',
      options: [
        { value: 'palestrantes', label: 'Quero apresentar a página para palestrantes' },
        { value: 'participantes', label: 'Quero apresentar a página para participantes' },
        { value: 'projeto-completo', label: 'Quero entender a proposta completa da edição' },
      ],
    },
    submitLabel: 'Enviar mensagem',
    successMessage: 'Mensagem enviada com sucesso. Retornaremos em breve.',
  },
  speaker: {
    sectionTitle: {
      tag: '// 05 – Próximo Passo',
      title: 'Quer Entender Como Entrar na Curadoria?',
      subtitle: 'Se a sua atuação conversa com as trilhas da TechWeek 2026, podemos abrir uma conversa sobre formato, profundidade e encaixe editorial.',
    },
    callout: 'Buscamos palestras que entreguem repertório aplicável, leitura de mercado e experiências concretas. Priorizamos conteúdo útil, denso e conectado ao momento da tecnologia regional e nacional.',
    email: 'david.junior211204@gmail.com',
    companyLabel: 'Empresa / Instituição',
    companyPlaceholder: 'Onde você atua hoje?',
    selectField: {
      name: 'topic',
      label: 'Tema ou trilha mais aderente',
      placeholder: 'Selecione...',
      options: [
        { value: 'ia-produto', label: 'IA aplicada, produto e automação' },
        { value: 'engenharia', label: 'Engenharia de software, dados ou cloud' },
        { value: 'games', label: 'Games, experiência digital e criatividade' },
        { value: 'esg', label: 'Tecnologia verde, impacto e ESG' },
        { value: 'lideranca', label: 'Carreira, liderança e mercado' },
      ],
    },
    submitLabel: 'Quero conversar sobre uma participação',
    successMessage: 'Mensagem enviada. A organização retorna com os próximos passos.',
  },
  participant: {
    sectionTitle: {
      tag: '// 05 – Fique por Dentro',
      title: 'Quer Receber as Novidades da Edição?',
      subtitle: 'Se você quer acompanhar abertura de inscrições, trilhas confirmadas e oportunidades da semana do evento, deixe seu contato.',
    },
    callout: 'A edição 2026 foi desenhada para quem quer sair com repertório, contatos e experiências que ajudam na formação e na entrada no mercado. Você pode se aproximar antes mesmo da abertura oficial.',
    email: 'david.junior211204@gmail.com',
    companyLabel: 'Curso, empresa ou instituição',
    companyPlaceholder: 'Ex.: ADS UTFPR, empresa, comunidade...',
    selectField: {
      name: 'profile',
      label: 'Seu perfil hoje',
      placeholder: 'Selecione...',
      options: [
        { value: 'estudante', label: 'Estudante de tecnologia' },
        { value: 'profissional', label: 'Profissional em início ou transição de carreira' },
        { value: 'lideranca', label: 'Liderança, gestão ou recrutamento' },
        { value: 'comunidade', label: 'Comunidade, maker ou entusiasta' },
      ],
    },
    submitLabel: 'Quero receber novidades',
    successMessage: 'Cadastro enviado. Você receberá atualizações da edição.',
  },
};

export default function Contact({ audience = 'general' }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const config = contentByAudience[audience] ?? contentByAudience.general;

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axios.post('/TW26/backend/api/contact.php', { ...values, audience });
      message.success(config.successMessage);
      form.resetFields();
    } catch {
      message.error('Erro ao enviar. Por favor, tente novamente ou entre em contato pelo e-mail abaixo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className={styles.section}>
      <div className={styles.wrapper}>
        <div className={styles.layout}>
          <motion.div
            className={styles.leftCol}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <SectionTitle
              tag={config.sectionTitle.tag}
              title={config.sectionTitle.title}
              subtitle={config.sectionTitle.subtitle}
            />

            <div className={styles.callout}>
              <div className={styles.calloutBar} />
              <div>
                <p className={styles.calloutText}>
                  {config.callout}
                </p>
                <p className={styles.calloutEmail}>
                  <span>�Y"�</span>
                  <a href={`mailto:${config.email}`}>
                    {config.email}
                  </a>
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className={styles.formCard}
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
            >
              <div className={styles.row}>
                <Form.Item
                  name="name"
                  label="Nome completo"
                  rules={[{ required: true, message: 'Informe seu nome' }]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="João Silva" size="large" />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="E-mail"
                  rules={[
                    { required: true, message: 'Informe seu e-mail' },
                    { type: 'email', message: 'E-mail inválido' },
                  ]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="voce@exemplo.com" size="large" />
                </Form.Item>
              </div>

              <div className={styles.row}>
                <Form.Item
                  name="phone"
                  label="Telefone"
                  rules={[{ required: true, message: 'Informe seu telefone' }]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="(xx) 9xxxx-xxxx" size="large" />
                </Form.Item>
                <Form.Item
                  name="company"
                  label={config.companyLabel}
                  style={{ flex: 1 }}
                >
                  <Input placeholder={config.companyPlaceholder} size="large" />
                </Form.Item>
              </div>

              <Form.Item
                name={config.selectField.name}
                label={config.selectField.label}
                rules={[{ required: true, message: 'Selecione uma opção' }]}
              >
                <Select placeholder={config.selectField.placeholder} size="large">
                  {config.selectField.options.map((option) => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="message" label="Mensagem (opcional)">
                <TextArea
                  placeholder="Algum objetivo ou contexto que gostaria de compartilhar..."
                  rows={3}
                  style={{ resize: 'none' }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  htmlType="submit"
                  type="primary"
                  size="large"
                  loading={loading}
                  block
                  style={{
                    background: '#8A00C4',
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 700,
                    height: 52,
                    fontSize: '1rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  {config.submitLabel}
                </Button>
              </Form.Item>
            </Form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

