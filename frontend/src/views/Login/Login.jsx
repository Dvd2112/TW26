import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Login.module.css';

export default function Login() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axios.post('/TW26/backend/api/login.php', {
        email: values.email,
        password: values.password,
      });

      const me = await axios.get('/TW26/backend/api/me.php');
      const target = me.data?.is_admin ? 'admin' : 'conta';
      window.location.search = `page=${target}`;
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SectionTitle
            tag="// Acesso"
            title="Entrar na TechWeek 2026"
            subtitle="Use o e-mail e a senha cadastrados para acessar sua conta."
            center
          />
        </motion.div>

        <motion.div
          className={styles.formCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="email"
              label="E-mail"
              rules={[
                { required: true, message: 'Informe seu e-mail' },
                { type: 'email', message: 'E-mail inválido' },
              ]}
            >
              <Input placeholder="voce@exemplo.com" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Senha"
              rules={[{ required: true, message: 'Informe sua senha' }]}
            >
              <Input.Password placeholder="Sua senha" size="large" />
            </Form.Item>

            <Form.Item style={{ marginTop: 8, marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
                style={{
                  background: '#8A00C4',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  height: 48,
                }}
              >
                Entrar
              </Button>
            </Form.Item>

            <p className={styles.footerText}>
              Ainda não tem conta?{' '}
              <a href="?page=register" className={styles.link}>
                Faça sua pré-inscrição
              </a>
            </p>
          </Form>
        </motion.div>
      </div>
    </section>
  );
}