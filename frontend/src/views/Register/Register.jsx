import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, message } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Register.module.css';

const { Option } = Select;
const STORAGE_KEY = 'tw26_presave';

/* ─── helpers CPF ─────────────────────────────────────────────────────────── */
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

function goToStep(step) {
  const params = new URLSearchParams(window.location.search);
  params.set('step', String(step));
  window.location.search = params.toString();
}

/* ─── Step 1: Nome + E-mail ───────────────────────────────────────────────── */
function Step1() {
  const [form] = Form.useForm();

  const onFinish = ({ name, email }) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ name, email }));
    goToStep(2);
  };

  return (
    <motion.div
      className={styles.formCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <p className={styles.stepLabel}>Etapa 1 de 3</p>
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
            Confirmar e continuar
          </Button>
        </Form.Item>
      </Form>
    </motion.div>
  );
}

/* ─── Step 2: Demais dados ────────────────────────────────────────────────── */
function Step2() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

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
      goToStep(3);
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Erro ao finalizar inscrição. Tente novamente.';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={styles.formCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <p className={styles.stepLabel}>Etapa 2 de 3</p>

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
                  !v || validateCPF(v) ? Promise.resolve() : Promise.reject('CPF inválido'),
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
              { min: 8, message: 'Mínimo 8 caracteres' },
            ]}
            style={{ flex: 1 }}
          >
            <Input.Password placeholder="Mínimo 8 caracteres" size="large" />
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
            Finalizar cadastro
          </Button>
        </Form.Item>
      </Form>
    </motion.div>
  );
}

/* ─── Step 3: inscrição automática (lote definido pela instituição) + PIX ─── */
function Step3() {
  const [status, setStatus] = useState('loading'); // loading | error | done
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState(null);
  const [paid, setPaid] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  useEffect(() => {
    axios.post('/TW26/backend/api/registrations.php')
      .then((res) => {
        sessionStorage.removeItem(STORAGE_KEY);
        setResult(res.data);
        setStatus('done');
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message ?? 'Erro ao realizar a inscrição.');
        setStatus('error');
      });
  }, []);

  const confirmPayment = async () => {
    setConfirmingPayment(true);
    try {
      await axios.post('/TW26/backend/api/payments.php');
      setPaid(true);
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao confirmar pagamento.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  if (status === 'loading') {
    return (
      <motion.div className={styles.formCard} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className={styles.stepLabel}>Etapa 3 de 3</p>
        <p style={{ textAlign: 'center', color: '#D9D9D9', margin: '24px 0' }}>
          Finalizando sua inscrição...
        </p>
      </motion.div>
    );
  }

  if (status === 'error') {
    return (
      <motion.div className={styles.formCard} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className={styles.stepLabel}>Etapa 3 de 3</p>
        <p className={styles.successText} style={{ textAlign: 'center' }}>{errorMsg}</p>
        <a href="?page=account">
          <Button block style={{ color: '#8A00C4', borderColor: '#8A00C4', background: 'transparent', marginTop: 16 }}>
            Ir para Minha Conta
          </Button>
        </a>
      </motion.div>
    );
  }

  if (result) {
    const isFree = result.payment_status === 'paid';
    return (
      <motion.div
        className={`${styles.formCard} ${styles.successState}`}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <span className={styles.successIcon}>✅</span>
        <h3 className={styles.successTitle}>Inscrição realizada!</h3>

        {isFree ? (
          <p className={styles.successText}>
            Sua inscrição está <strong>confirmada</strong>. Você não precisa pagar.
          </p>
        ) : paid ? (
          <p className={styles.successText}>
            Pagamento enviado para confirmação. Assim que validarmos seu PIX, sua
            inscrição será confirmada.
          </p>
        ) : (
          <>
            <p className={styles.successText}>
              Falta só o pagamento de <strong>R$ {result.amount}</strong> para
              confirmar sua vaga. Transfira o valor via PIX:
            </p>
            <div className={styles.pixCard}>
              <p><strong>Chave PIX:</strong> <span>{result.pix?.key}</span></p>
              <p><strong>Titular:</strong> {result.pix?.name}</p>
              <p><strong>Cidade:</strong> {result.pix?.city}</p>
            </div>
            <Button
              type="primary"
              size="large"
              loading={confirmingPayment}
              onClick={confirmPayment}
              style={{ background: '#8A00C4', border: 'none', fontWeight: 700, height: 48, width: '100%', maxWidth: 360 }}
            >
              Já fiz o PIX
            </Button>
            <p className={styles.successText} style={{ fontSize: '0.8rem' }}>
              Assim que você clicar, nossa equipe valida o recebimento e confirma.
            </p>
          </>
        )}

        <a href="./">
          <Button style={{ color: '#8A00C4', borderColor: '#8A00C4', background: 'transparent', fontWeight: 600 }}>
            Voltar para a página inicial
          </Button>
        </a>
      </motion.div>
    );
  }

  return null;
}

/* ─── Export principal ───────────────────────────────────────────────────── */
export default function Register() {
  const step = new URLSearchParams(window.location.search).get('step');
  const isStep2 = step === '2';
  const isStep3 = step === '3';

  const config = isStep2
    ? {
        tag: '// Inscrição – Etapa 2',
        title: 'Complete Seu Cadastro',
        subtitle: 'Só mais alguns dados para criar sua conta na TechWeek 2026.',
      }
    : isStep3
    ? {
        tag: '// Inscrição – Etapa 3',
        title: 'Quase lá!',
        subtitle: 'Estamos confirmando sua vaga no lote da sua instituição.',
      }
    : {
        tag: '// Inscrição – Etapa 1',
        title: 'Reserve Sua Vaga na TechWeek 2026',
        subtitle: 'Comece pelo básico: informe seu nome e e-mail para começar o cadastro.',
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

        {isStep3 ? <Step3 /> : isStep2 ? <Step2 /> : <Step1 />}
      </div>
    </section>
  );
}