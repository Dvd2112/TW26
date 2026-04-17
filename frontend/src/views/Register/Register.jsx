import { useState } from 'react';
import { Form, Input, Select, Button, message } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Register.module.css';

const { Option } = Select;
const STORAGE_KEY = 'tw26_presave';

/* ?"??"??"? helpers CPF ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"? */
function formatCPF(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function validateCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  if ((11 - (s % 11)) % 11 !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  return (11 - (s % 11)) % 11 === +d[10];
}

/* ?"??"??"? Step 1: Nome + E-mail ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"? */
function Step1() {
  const [form] = Form.useForm();

  const onFinish = ({ name, email }) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ name, email }));
    const params = new URLSearchParams(window.location.search);
    params.set('step', '2');
    window.location.search = params.toString();
  };

  return (
    <motion.div
      className={styles.formCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <p className={styles.stepLabel}>Etapa 1 de 2</p>
      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="name"
          label="Nome completo"
          rules={[{ required: true, message: 'Informe seu nome completo' }]}
        >
          <Input placeholder="João da Silva" size="large" />
        </Form.Item>

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

        <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
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
            Confirmar e continuar ??'
          </Button>
        </Form.Item>
      </Form>
    </motion.div>
  );
}

/* ?"??"??"? Step 2: Demais dados ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"? */
function Step2() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const saved = (() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}'); }
    catch { return {}; }
  })();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axios.post('/TW26/backend/api/register.php', {
        name: saved.name,
        email: saved.email,
        cpf: values.cpf.replace(/\D/g, ''),
        institution: values.institution,
        password: values.password,
      });
      sessionStorage.removeItem(STORAGE_KEY);
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Erro ao finalizar inscrição. Tente novamente.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        className={`${styles.formCard} ${styles.successState}`}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <span className={styles.successIcon}>✅</span>
        <h3 className={styles.successTitle}>Pré-inscrição confirmada!</h3>
        <p className={styles.successText}>
          Tudo certo, <strong>{saved.name?.split(' ')[0]}</strong>! Sua vaga está reservada.
          Você receberá as novidades e a confirmação no e-mail <strong>{saved.email}</strong>.
        </p>
        <a href="?audience=participants">
          <Button style={{ color: '#8A00C4', borderColor: '#8A00C4', background: 'transparent', fontWeight: 600 }}>
            Voltar para a página de participantes
          </Button>
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={styles.formCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <p className={styles.stepLabel}>Etapa 2 de 2</p>

      {saved.name && (
        <div className={styles.savedInfo}>
          <span className={styles.savedInfoItem}>👤 {saved.name}</span>
          <span className={styles.savedInfoItem}>📧 {saved.email}</span>
        </div>
      )}

      <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
        <div className={styles.row}>
          <Form.Item
            name="cpf"
            label="CPF"
            rules={[
              { required: true, message: 'Informe seu CPF' },
              {
                validator: (_, v) =>
                  !v || validateCPF(v) ? Promise.resolve() : Promise.reject('CPF inv�lido'),
              },
            ]}
            style={{ flex: 1 }}
          >
            <Input
              placeholder="000.000.000-00"
              size="large"
              maxLength={14}
              onChange={(e) => form.setFieldValue('cpf', formatCPF(e.target.value))}
            />
          </Form.Item>

          <Form.Item
            name="institution"
            label="Instituição"
            rules={[{ required: true, message: 'Selecione sua instituição' }]}
            style={{ flex: 1 }}
          >
            <Select placeholder="Selecione..." size="large">
              <Option value="UTFPR">UTFPR</Option>
              <Option value="CESUL">CESUL</Option>
              <Option value="UNIPAR">UNIPAR</Option>
              <Option value="outros">Outros</Option>
            </Select>
          </Form.Item>
        </div>

        <div className={styles.row}>
          <Form.Item
            name="password"
            label="Senha"
            rules={[
              { required: true, message: 'Crie uma senha' },
              { min: 8, message: 'M�nimo 8 caracteres' },
            ]}
            style={{ flex: 1 }}
          >
            <Input.Password placeholder="M�nimo 8 caracteres" size="large" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirmação de senha"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirme sua senha' },
              ({ getFieldValue }) => ({
                validator(_, v) {
                  return !v || getFieldValue('password') === v
                    ? Promise.resolve()
                    : Promise.reject('As senhas não coincidem');
                },
              }),
            ]}
            style={{ flex: 1 }}
          >
            <Input.Password placeholder="Repita a senha" size="large" />
          </Form.Item>
        </div>

        <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
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
            Finalizar inscrição
          </Button>
        </Form.Item>
      </Form>
    </motion.div>
  );
}

/* ?"??"??"? Export principal ?"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"??"? */
export default function Register() {
  const step = new URLSearchParams(window.location.search).get('step');
  const isStep2 = step === '2';

  const config = isStep2
    ? {
        tag: '// Pré-Save – Etapa 2',
        title: 'Complete Seu Cadastro',
        subtitle: 'Só mais alguns dados para finalizar sua pré-inscrição na TechWeek 2026.',
      }
    : {
        tag: '// Pré-Save – Etapa 1',
        title: 'Reserve Sua Vaga na TechWeek 2026',
        subtitle: 'Comece pelo básico: informe seu nome e e-mail para garantir sua posição. Você completa o cadastro na próxima etapa.',
      };

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SectionTitle tag={config.tag} title={config.title} subtitle={config.subtitle} center />
        </motion.div>

        {isStep2 ? <Step2 /> : <Step1 />}
      </div>
    </section>
  );
}

