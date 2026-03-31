import { useState } from 'react';
import { Form, Input, Select, Button, message } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from './Contact.module.css';

const { TextArea } = Input;
const { Option } = Select;

export default function Contact() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axios.post('/backend/api/contact.php', values);
      message.success('Contato enviado com sucesso! Retornaremos em breve.');
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
              tag="// 07 — Próximo Passo"
              title="Vamos Agendar 15 Minutos?"
              subtitle="Estamos selecionando um grupo restrito de parceiros com prioridade na escolha de cotas e espaços estratégicos para 2026."
            />

            <div className={styles.callout}>
              <div className={styles.calloutBar} />
              <div>
                <p className={styles.calloutText}>
                  O mercado de tecnologia não espera. Posicione sua marca como protagonista
                  da transformação digital no Sudoeste do Paraná.
                </p>
                <p className={styles.calloutEmail}>
                  <span>📧</span>
                  <a href="mailto:david.junior211204@gmail.com">
                    david.junior211204@gmail.com
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
                  name="company"
                  label="Empresa"
                  rules={[{ required: true, message: 'Informe sua empresa' }]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="Acme Ltda" size="large" />
                </Form.Item>
              </div>

              <div className={styles.row}>
                <Form.Item
                  name="email"
                  label="E-mail"
                  rules={[
                    { required: true, message: 'Informe seu e-mail' },
                    { type: 'email', message: 'E-mail inválido' },
                  ]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="joao@empresa.com" size="large" />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="Telefone"
                  rules={[{ required: true, message: 'Informe seu telefone' }]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="(xx) 9xxxx-xxxx" size="large" />
                </Form.Item>
              </div>

              <Form.Item
                name="tier"
                label="Cota de interesse"
                rules={[{ required: true, message: 'Selecione uma cota' }]}
              >
                <Select placeholder="Selecione..." size="large">
                  <Option value="diamante">Diamante</Option>
                  <Option value="ouro">Ouro</Option>
                  <Option value="prata">Prata</Option>
                  <Option value="personalizada">Quero conversar sobre uma cota personalizada</Option>
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
                    background: '#00FF00',
                    color: '#000',
                    border: 'none',
                    fontWeight: 700,
                    height: 52,
                    fontSize: '1rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  Enviar e Agendar Reunião
                </Button>
              </Form.Item>
            </Form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
