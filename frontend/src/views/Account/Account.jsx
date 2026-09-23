import { useState, useEffect } from 'react';
import { Button, Tag, message, Upload, Input, Space, Form, Checkbox } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Account.module.css';

const { TextArea } = Input;

const VOLUNTEER_ROLE_OPTIONS = [
  { label: 'Credenciamento', value: 'credenciamento' },
  { label: 'Montagem', value: 'montagem' },
  { label: 'Hackathon', value: 'hackathon' },
];
const EVENT_DAY_OPTIONS = ['19', '20', '21', '22'].map((d) => ({ label: `Dia ${d}`, value: d }));
const HACKATHON_DAY_OPTIONS = ['17', '18'].map((d) => ({ label: `Dia ${d}`, value: d }));

const VOLUNTEER_STATUS_LABELS = { pending: 'Em análise', approved: 'Aprovada', rejected: 'Não aprovada' };
const VOLUNTEER_STATUS_COLORS = { pending: 'gold', approved: 'green', rejected: 'red' };

function VolunteerCard() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [application, setApplication] = useState(null);
  const roles = Form.useWatch('roles', form) ?? [];

  useEffect(() => {
    axios.get('/TW26/backend/api/volunteer.php')
      .then((res) => {
        setApplicationsOpen(res.data.applications_open ?? true);
        setApplication(res.data.application ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      const res = await axios.post('/TW26/backend/api/volunteer.php', {
        phone: values.phone,
        roles: values.roles,
        event_days: values.event_days ?? [],
        hackathon_days: values.hackathon_days ?? [],
        motivation: values.motivation,
      });
      message.success(res.data?.message ?? 'Candidatura enviada!');
      setApplication({
        phone: values.phone,
        roles: values.roles.join(','),
        event_days: (values.event_days ?? []).join(','),
        hackathon_days: (values.hackathon_days ?? []).join(','),
        motivation: values.motivation,
        status: 'pending',
      });
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao enviar candidatura.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Seja Voluntário(a)</h3>
        <p className={styles.line}>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Seja Voluntário(a)</h3>

      {application ? (
        <>
          <p className={styles.line}>
            <strong>Status:</strong>{' '}
            <Tag color={VOLUNTEER_STATUS_COLORS[application.status]}>
              {VOLUNTEER_STATUS_LABELS[application.status] ?? application.status}
            </Tag>
          </p>
          <p className={styles.line}>
            Sua candidatura foi enviada. Assim que a organização avaliar, o status aqui é atualizado.
          </p>
        </>
      ) : !applicationsOpen ? (
        <p className={styles.line}>
          As candidaturas a voluntário estão encerradas no momento. Fique de olho, elas podem reabrir.
        </p>
      ) : (
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <p className={styles.line} style={{ marginBottom: 12 }}>
            Ajude a fazer a TechWeek 2026 acontecer! Escolha em quais frentes você topa ajudar.
          </p>

          <Form.Item
            name="phone"
            label="Telefone / WhatsApp"
            rules={[{ required: true, message: 'Informe um telefone de contato' }]}
          >
            <Input placeholder="(00) 00000-0000" size="large" />
          </Form.Item>

          <Form.Item
            name="roles"
            label="Em quais frentes você quer ajudar?"
            rules={[{ required: true, message: 'Selecione ao menos uma opção' }]}
          >
            <Checkbox.Group options={VOLUNTEER_ROLE_OPTIONS} />
          </Form.Item>

          {(roles.includes('credenciamento') || roles.includes('montagem')) && (
            <Form.Item
              name="event_days"
              label="Dias disponíveis no evento principal (19 a 22)"
              rules={[{ required: true, message: 'Selecione ao menos um dia' }]}
            >
              <Checkbox.Group options={EVENT_DAY_OPTIONS} />
            </Form.Item>
          )}

          {roles.includes('hackathon') && (
            <Form.Item
              name="hackathon_days"
              label="Dias disponíveis no hackathon (17 e 18)"
              rules={[{ required: true, message: 'Selecione ao menos um dia' }]}
            >
              <Checkbox.Group options={HACKATHON_DAY_OPTIONS} />
            </Form.Item>
          )}

          <Form.Item
            name="motivation"
            label="Por que você quer ser voluntário(a)?"
            rules={[{ required: true, message: 'Conte um pouco sobre você' }]}
          >
            <TextArea rows={3} placeholder="Conte sua motivação e, se tiver, experiências anteriores." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              block
              style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}
            >
              Enviar candidatura
            </Button>
          </Form.Item>
        </Form>
      )}
    </div>
  );
}

const TYPE_LABELS = {
  participant: 'Participante',
  volunteer: 'Voluntário',
  staff: 'Staff',
};

const PAYMENT_LABELS = {
  pending: 'Aguardando pagamento',
  awaiting_confirmation: 'Pagamento em confirmação',
  paid: 'Pago',
  failed: 'Falhou',
  refunded: 'Reembolsado',
};

const PAYMENT_COLORS = {
  pending: 'orange',
  awaiting_confirmation: 'gold',
  paid: 'green',
  failed: 'red',
  refunded: 'default',
};

const REG_LABELS = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
};

function loadData(setData, setError) {
  return axios
    .get('/TW26/backend/api/my-registration.php')
    .then((res) => setData(res.data))
    .catch((err) => {
      if (err.response?.status === 401) setError('not-logged');
      else setError('error');
    });
}

export default function Account() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  // código de presença digitado, por atividade: { [activityId]: 'ABC123' }
  const [codes, setCodes] = useState({});
  const [checkingIn, setCheckingIn] = useState(null);

  const loadEnrollments = () => axios
    .get('/TW26/backend/api/enrollments.php')
    .then((res) => setEnrollments(res.data.enrollments ?? []))
    .catch(() => setEnrollments([]));

  useEffect(() => {
    loadData(setData, setError).then(loadEnrollments);
  }, []);

  const confirmPayment = async () => {
    if (!proofFile) {
      message.error('Anexe o comprovante do PIX antes de enviar.');
      return;
    }
    setPaying(true);
    try {
      const formData = new FormData();
      formData.append('comprovante', proofFile);
      await axios.post('/TW26/backend/api/payments.php', formData);
      message.success('Comprovante enviado! A organização vai validar seu pagamento.');
      setProofFile(null);
      loadData(setData, setError);
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao enviar o comprovante.');
    } finally {
      setPaying(false);
    }
  };

  const cancelEnrollment = async (activityId) => {
    setCancelling(true);
    try {
      await axios.delete('/TW26/backend/api/enrollments.php', { data: { activity_id: activityId } });
      message.success('Inscrição cancelada.');
      setEnrollments((prev) => prev.filter((e) => Number(e.id) !== Number(activityId)));
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao cancelar.');
    } finally {
      setCancelling(false);
    }
  };

  const submitCode = async (activityId) => {
    const code = (codes[activityId] ?? '').trim();
    if (!code) {
      message.error('Digite o código da atividade.');
      return;
    }
    setCheckingIn(activityId);
    try {
      const res = await axios.post('/TW26/backend/api/attendance.php', {
        activity_id: activityId,
        code,
      });
      message.success(res.data?.message ?? 'Presença confirmada!');
      setCodes((prev) => ({ ...prev, [activityId]: '' }));
      loadEnrollments();
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao registrar presença.');
    } finally {
      setCheckingIn(null);
    }
  };

  if (error === 'not-logged') {
    return (
      <Section center>
        <SectionTitle
          tag="// Minha Conta"
          title="Você precisa entrar"
          subtitle="Faça login para ver sua inscrição e suas oficinas."
          center
        />
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="?page=login">
            <Button type="primary" size="large" style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}>
              Ir para o login
            </Button>
          </a>
        </div>
      </Section>
    );
  }

  if (error === 'error' || !data) {
    return (
      <Section center>
        <SectionTitle
          tag="// Minha Conta"
          title="Algo deu errado"
          subtitle="Não foi possível carregar seus dados. Tente novamente mais tarde."
          center
        />
      </Section>
    );
  }

  const { user, registration, payment, pix } = data;

  return (
    <Section>
      <SectionTitle
        tag="// Minha Conta"
        title={`Olá, ${user.name.split(' ')[0]}!`}
        subtitle="Acompanhe sua inscrição, pagamento e oficinas na TechWeek 2026."
        center
      />

      <div className={styles.grid}>
        {/* Perfil */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Perfil</h3>
          <p className={styles.line}><strong>Nome:</strong> {user.name}</p>
          <p className={styles.line}><strong>E-mail:</strong> {user.email}</p>
          <p className={styles.line}>
            <strong>Tipo:</strong> {TYPE_LABELS[user.participant_type] ?? user.participant_type}
          </p>
          <div className={styles.actions}>
            <a href="?page=oficinas">
              <Button style={{ color: '#8A00C4', borderColor: '#8A00C4', background: 'transparent' }}>
                Ver oficinas
              </Button>
            </a>
            <Button
              danger
              onClick={async () => {
                try {
                  await axios.post('/TW26/backend/api/logout.php');
                  window.location.search = 'page=login';
                } catch {
                  message.error('Erro ao sair.');
                }
              }}
            >
              Sair
            </Button>
          </div>
        </div>

        {/* Crachá / código de check-in */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Meu código de check-in</h3>
          <p className={styles.line}>
            Mostre este QR code ao credenciador na entrada das oficinas e palestras.
            Se a câmera não ler, ele pode digitar o código abaixo.
          </p>
          {user.checkin_code ? (
            <>
              <div className={styles.qrBox}>
                <QRCodeSVG value={user.checkin_code} size={180} level="M" />
              </div>
              <p className={styles.code}>{user.checkin_code}</p>
            </>
          ) : (
            <p className={styles.line}>Código indisponível. Fale com a organização.</p>
          )}
        </div>

        {/* Inscrição */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Inscrição</h3>
          {!registration ? (
            <>
              <p className={styles.line}>
                Você ainda não concluiu sua inscrição. Complete agora para garantir sua vaga.
              </p>
              <a href="?page=register&step=3">
                <Button type="primary" style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}>
                  Completar inscrição
                </Button>
              </a>
            </>
          ) : (
            <>
              <p className={styles.line}>
                <strong>Lote:</strong> {registration.lote?.name} — R$ {Number(payment?.amount ?? registration.lote?.price ?? 0).toFixed(2)}
              </p>
              <p className={styles.line}>
                <strong>Status:</strong>{' '}
                <Tag color={registration.status === 'confirmed' ? 'green' : 'default'}>
                  {REG_LABELS[registration.status] ?? registration.status}
                </Tag>
              </p>
              <p className={styles.line}>
                <strong>Pagamento:</strong>{' '}
                <Tag color={PAYMENT_COLORS[payment?.status]}>
                  {PAYMENT_LABELS[payment?.status] ?? payment?.status}
                </Tag>
              </p>

              {payment && (payment.status === 'pending' || payment.status === 'failed') && (
                <div className={styles.pixCard}>
                  <p className={styles.line} style={{ color: '#8A00C4', fontWeight: 600 }}>
                    ⚠️ Sua vaga neste lote fica <strong>reservada por apenas 30 minutos</strong>.
                    Depois desse prazo, será necessário enviar o comprovante para manter a reserva.
                    Se você já pagou, envie o comprovante <strong>imediatamente</strong> abaixo.
                  </p>
                  <p className={styles.line}><strong>Valor:</strong> R$ {Number(payment.amount).toFixed(2)}</p>
                  {registration.lote?.has_qr && (
                    <img
                      src={`/TW26/backend/api/lote-qr.php?lote_id=${registration.lote.id}`}
                      alt={`QR code PIX de R$ ${Number(payment.amount).toFixed(2)}`}
                      style={{
                        display: 'block', width: '100%', maxWidth: 360, aspectRatio: '1 / 1', boxSizing: 'border-box',
                        objectFit: 'contain', background: '#fff', borderRadius: 12, padding: 12, margin: '8px auto 12px',
                      }}
                    />
                  )}
                  <p className={styles.line}><strong>Chave PIX:</strong> {pix?.key}</p>
                  <p className={styles.line}><strong>Titular:</strong> {pix?.name}</p>
                  <p className={styles.line}><strong>Cidade:</strong> {pix?.city}</p>
                  {registration.lote?.pix_link && (
                    <a href={registration.lote.pix_link} target="_blank" rel="noopener noreferrer">
                      <Button block style={{ marginBottom: 8 }}>Pagar pelo link do PIX</Button>
                    </a>
                  )}

                  <p className={styles.line} style={{ marginTop: 12 }}>
                    <strong>Comprovante do PIX</strong> (obrigatório — JPG, PNG ou PDF, até 5MB)
                  </p>
                  <Upload
                    accept=".jpg,.jpeg,.png,.pdf"
                    maxCount={1}
                    beforeUpload={(f) => { setProofFile(f); return false; }}
                    onRemove={() => setProofFile(null)}
                    fileList={proofFile ? [proofFile] : []}
                  >
                    <Button icon={<UploadOutlined />}>Selecionar arquivo</Button>
                  </Upload>

                  <Button
                    type="primary"
                    block
                    loading={paying}
                    disabled={!proofFile}
                    onClick={confirmPayment}
                    style={{ background: '#8A00C4', border: 'none', fontWeight: 700, marginTop: 12 }}
                  >
                    Enviar comprovante
                  </Button>
                </div>
              )}

              {payment && payment.status === 'awaiting_confirmation' && (
                <p className={styles.line}>
                  Seu pagamento está em análise. Assim que confirmarmos o recebimento, sua inscrição será validada.
                </p>
              )}

              {payment && payment.status === 'paid' && (
                <p className={styles.line}>
                  Pagamento confirmado! Sua vaga está garantida.
                </p>
              )}
            </>
          )}
        </div>

        {/* Voluntariado */}
        <VolunteerCard />

        {/* Minhas oficinas */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Minhas Oficinas</h3>
          {enrollments.length === 0 ? (
            <p className={styles.line}>Você ainda não se inscreveu em nenhuma oficina.</p>
          ) : (
            <>
              <p className={styles.line}>
                Já está na sala? Digite o código informado pelo palestrante para
                registrar sua presença.
              </p>
              <div className={styles.enrollList}>
                {enrollments.map((act) => (
                  <div className={styles.enrollItem} key={act.id}>
                    <div>
                      <p className={styles.enrollTitle}>{act.title}</p>
                      <p className={styles.enrollMeta}>
                        {act.type} {act.location ? `· ${act.location}` : ''}
                      </p>
                    </div>
                    {act.attended_at ? (
                      <Tag color="green">Presença confirmada</Tag>
                    ) : (
                      <Space.Compact>
                        <Input
                          placeholder="Código"
                          maxLength={12}
                          value={codes[act.id] ?? ''}
                          onChange={(e) => setCodes((prev) => ({ ...prev, [act.id]: e.target.value }))}
                          onPressEnter={() => submitCode(act.id)}
                          style={{ width: 110, textTransform: 'uppercase' }}
                        />
                        <Button
                          type="primary"
                          loading={checkingIn === act.id}
                          onClick={() => submitCode(act.id)}
                          style={{ background: '#8A00C4', border: 'none', fontWeight: 700 }}
                        >
                          Presença
                        </Button>
                      </Space.Compact>
                    )}
                    <Button
                      size="small"
                      danger
                      loading={cancelling}
                      onClick={() => cancelEnrollment(act.id)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

function Section({ children, center }) {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={center ? { display: 'flex', flexDirection: 'column', alignItems: 'center' } : undefined}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}