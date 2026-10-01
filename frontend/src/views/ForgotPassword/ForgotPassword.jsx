import { useEffect, useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Login.module.css';

const RESEND_SECONDS = 120;
const REDIRECT_MS = 3000;

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function formatCPF(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatCountdown(total) {
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

const goldButton = {
  background: '#8A00C4',
  color: '#FFF',
  border: 'none',
  fontWeight: 800,
  letterSpacing: '0.05em',
  height: 48,
};

/**
 * Recuperação de senha em 2 etapas:
 *   1) CPF + e-mail  -> envia o código por e-mail
 *   2) código + nova senha -> redefine
 */
export default function ForgotPassword({
  tag,
  title,
  subtitleRequest,
  subtitleReset,
  subtitleDone,
  successTitle,
  successText,
  loginLabel,
}) {
  const [requestForm] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [step, setStep] = useState(1);
  const [identity, setIdentity] = useState({ cpf: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // etapa 3 = sucesso: mostra confirmação e volta ao login após alguns segundos
  useEffect(() => {
    if (step !== 3) return undefined;
    const t = setTimeout(() => { window.location.search = 'page=login'; }, REDIRECT_MS);
    return () => clearTimeout(t);
  }, [step]);

  const requestCode = async ({ cpf, email }) => {
    setLoading(true);
    try {
      const res = await axios.post('/TW26/backend/api/forgot-password.php', {
        cpf: cpf.replace(/\D/g, ''),
        email: email.trim(),
      });
      message.success(res.data?.message ?? 'Verifique seu e-mail.');
      setIdentity({ cpf: cpf.replace(/\D/g, ''), email: email.trim() });
      setCooldown(RESEND_SECONDS);
      setStep(2);
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao solicitar o código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = () => requestCode({ cpf: identity.cpf, email: identity.email });

  const resetPassword = async (values) => {
    setLoading(true);
    try {
      await axios.post('/TW26/backend/api/reset-password.php', {
        cpf: identity.cpf,
        email: identity.email,
        code: values.code,
        password: values.password,
      });
      setStep(3);
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao alterar a senha. Tente novamente.');
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
            tag={tag}
            title={title}
            subtitle={step === 1 ? subtitleRequest : step === 2 ? subtitleReset : subtitleDone}
            center
          />
        </motion.div>

        <motion.div
          className={styles.formCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {step === 3 ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircleFilled style={{ fontSize: 56, color: '#52c41a', marginBottom: 16 }} />
              <h3 style={{ color: '#fff', margin: '0 0 8px' }}>{successTitle}</h3>
              <p style={{ color: '#D9D9D9', margin: '0 0 24px' }}>{successText}</p>
              <a href="?page=login">
                <Button type="primary" size="large" block style={goldButton}>
                  {loginLabel}
                </Button>
              </a>
            </div>
          ) : step === 1 ? (
            <Form form={requestForm} layout="vertical" onFinish={requestCode} requiredMark={false}>
              <Form.Item
                name="cpf"
                label="CPF"
                rules={[
                  { required: true, message: 'Informe seu CPF' },
                  {
                    validator: (_, v) =>
                      !v || v.replace(/\D/g, '').length === 11
                        ? Promise.resolve()
                        : Promise.reject('O CPF deve ter 11 dígitos'),
                  },
                ]}
              >
                <Input
                  placeholder="000.000.000-00"
                  size="large"
                  inputMode="numeric"
                  onChange={(e) => requestForm.setFieldValue('cpf', formatCPF(e.target.value))}
                />
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

              <Form.Item style={{ marginTop: 8, marginBottom: 12 }}>
                <Button type="primary" htmlType="submit" size="large" loading={loading} block style={goldButton}>
                  Enviar código
                </Button>
              </Form.Item>

              <p className={styles.footerText}>
                Lembrou a senha?{' '}
                <a href="?page=login" className={styles.link}>Voltar para o login</a>
              </p>
            </Form>
          ) : (
            <Form
              form={resetForm}
              layout="vertical"
              onFinish={resetPassword}
              onFinishFailed={() => message.error('Confira os campos: código, senha e confirmação.')}
              requiredMark={false}
            >
              <Form.Item
                name="code"
                label="Código recebido por e-mail"
                getValueFromEvent={(e) =>
                  e.target.value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 8)
                }
                rules={[
                  { required: true, message: 'Informe o código' },
                  { pattern: /^[0-9A-F]{8}$/, message: 'O código tem 8 caracteres (0-9 e A-F)' },
                ]}
              >
                <Input
                  placeholder="A1B2C3D4"
                  size="large"
                  maxLength={8}
                  autoComplete="off"
                  spellCheck={false}
                  style={{ letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'monospace' }}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Nova senha"
                rules={[
                  { required: true, message: 'Crie uma nova senha' },
                  { min: 8, message: 'Mínimo 8 caracteres' },
                ]}
              >
                <Input.Password placeholder="Mínimo 8 caracteres" size="large" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirmação da nova senha"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Confirme a nova senha' },
                  ({ getFieldValue }) => ({
                    validator(_, v) {
                      return !v || getFieldValue('password') === v
                        ? Promise.resolve()
                        : Promise.reject('As senhas não coincidem');
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="Repita a nova senha" size="large" />
              </Form.Item>

              <Form.Item style={{ marginTop: 8, marginBottom: 12 }}>
                <Button type="primary" htmlType="submit" size="large" loading={loading} block style={goldButton}>
                  Alterar senha
                </Button>
              </Form.Item>

              <p className={styles.footerText}>
                Não recebeu?{' '}
                {cooldown > 0 ? (
                  <span>Novo código em {formatCountdown(cooldown)}</span>
                ) : (
                  <a href="#reenviar" className={styles.link} onClick={(e) => { e.preventDefault(); resendCode(); }}>
                    Reenviar código
                  </a>
                )}
              </p>
            </Form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
