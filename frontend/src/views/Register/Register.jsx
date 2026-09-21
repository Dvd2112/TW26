import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
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
                validator: (_, v) => {
                  const d = (v || '').replace(/\D/g, '');
                  if (!d) return Promise.resolve();
                  if (d.length !== 11) return Promise.reject('O CPF deve ter 11 dígitos');
                  if (/^(\d)\1+$/.test(d)) return Promise.reject('CPF inválido');
                  return Promise.resolve();
                },
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

/* ─── Step 3: escolha do lote (do tipo do usuário) + inscrição + PIX ─────── */
function Step3() {
  const [status, setStatus] = useState('loading'); // loading | choose | error | done
  const [errorMsg, setErrorMsg] = useState('');
  const [lotes, setLotes] = useState([]);
  const [enrollingId, setEnrollingId] = useState(null);
  const [result, setResult] = useState(null);
  const [paid, setPaid] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    axios.get('/TW26/backend/api/lotes.php')
      .then((res) => {
        setLotes(res.data.lotes ?? []);
        setStatus('choose');
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message ?? 'Erro ao carregar os lotes.');
        setStatus('error');
      });
  }, []);

  const enroll = async (loteId) => {
    setEnrollingId(loteId);
    try {
      const res = await axios.post('/TW26/backend/api/registrations.php', { lote_id: loteId });
      sessionStorage.removeItem(STORAGE_KEY);
      setResult(res.data);
      setStatus('done');
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao realizar a inscrição.');
    } finally {
      setEnrollingId(null);
    }
  };

  const confirmPayment = async () => {
    if (!proofFile) {
      message.error('Anexe o comprovante do PIX antes de enviar.');
      return;
    }
    setConfirmingPayment(true);
    try {
      const formData = new FormData();
      formData.append('comprovante', proofFile);
      await axios.post('/TW26/backend/api/payments.php', formData);
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
          Carregando lotes disponíveis...
        </p>
      </motion.div>
    );
  }

  if (status === 'choose') {
    return (
      <motion.div className={styles.formCard} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className={styles.stepLabel}>Etapa 3 de 3</p>
        {lotes.length === 0 ? (
          <>
            <p className={styles.successText} style={{ textAlign: 'center', margin: '0 auto' }}>
              Nenhum lote aberto no momento para o seu perfil e instituição.
            </p>
            <a href="?page=account">
              <Button block style={{ color: '#8A00C4', borderColor: '#8A00C4', background: 'transparent', marginTop: 16 }}>
                Ir para Minha Conta
              </Button>
            </a>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lotes.map((lote) => (
              <div key={lote.id} className={styles.loteOption}>
                <div>
                  <div className={styles.loteName}>{lote.name}</div>
                  <div className={styles.loteMeta}>
                    {lote.final_price === 0
                      ? 'Gratuito'
                      : `R$ ${lote.final_price.toFixed(2)}`}
                    {lote.final_price !== lote.price && lote.price > 0 && (
                      <s style={{ color: '#888', marginLeft: 8, fontWeight: 400 }}>
                        R$ {lote.price.toFixed(2)}
                      </s>
                    )}
                    {' · '}
                    {lote.is_full ? 'Esgotado' : `${lote.available} vaga${lote.available === 1 ? '' : 's'}`}
                  </div>
                </div>
                <Button
                  type="primary"
                  disabled={lote.is_full}
                  loading={enrollingId === lote.id}
                  onClick={() => enroll(lote.id)}
                  style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}
                >
                  Inscrever-se
                </Button>
              </div>
            ))}
          </div>
        )}
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
            Você não precisa pagar. Sua inscrição será <strong>aprovada</strong> pela
            organização em breve.
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
            {result.has_qr && (
              <img
                src={`/TW26/backend/api/lote-qr.php?lote_id=${result.lote_id}`}
                alt={`QR code PIX de R$ ${result.amount}`}
                style={{
                  width: '100%', maxWidth: 360, aspectRatio: '1 / 1', boxSizing: 'border-box',
                  objectFit: 'contain', background: '#fff', borderRadius: 12, padding: 12,
                }}
              />
            )}
            <div className={styles.pixCard}>
              <p><strong>Chave PIX:</strong> <span>{result.pix?.key}</span></p>
              <p><strong>Titular:</strong> {result.pix?.name}</p>
              <p><strong>Cidade:</strong> {result.pix?.city}</p>
            </div>
            {result.pix_link && (
              <a href={result.pix_link} target="_blank" rel="noopener noreferrer">
                <Button style={{ color: '#8A00C4', borderColor: '#8A00C4', background: 'transparent', fontWeight: 600 }}>
                  Pagar pelo link do PIX
                </Button>
              </a>
            )}
            <p className={styles.successText}>
              Depois de pagar, anexe o <strong>comprovante do PIX</strong> (obrigatório —
              JPG, PNG ou PDF, até 5MB):
            </p>
            <Upload
              accept=".jpg,.jpeg,.png,.pdf"
              maxCount={1}
              beforeUpload={(f) => { setProofFile(f); return false; }}
              onRemove={() => setProofFile(null)}
              fileList={proofFile ? [proofFile] : []}
            >
              <Button icon={<UploadOutlined />}>Selecionar comprovante</Button>
            </Upload>
            <Button
              type="primary"
              size="large"
              loading={confirmingPayment}
              disabled={!proofFile}
              onClick={confirmPayment}
              style={{ background: '#8A00C4', border: 'none', fontWeight: 700, height: 48, width: '100%', maxWidth: 360 }}
            >
              Enviar comprovante
            </Button>
            <p className={styles.successText} style={{ fontSize: '0.8rem' }}>
              Assim que você enviar, nossa equipe confere o comprovante e aprova sua inscrição.
              Você também pode enviar depois, em Minha Conta.
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
        subtitle: 'Escolha o lote disponível para o seu perfil e garanta sua vaga.',
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