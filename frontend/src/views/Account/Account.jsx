import { useState, useEffect } from 'react';
import { Button, message } from 'antd';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Account.module.css';
import AccountSection from './AccountSection';
import ProfileCard from './ProfileCard';
import CheckinCard from './CheckinCard';
import RegistrationCard from './RegistrationCard';
import VolunteerCard from './VolunteerCard';
import EnrollmentsCard from './EnrollmentsCard';

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
      <AccountSection center>
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
      </AccountSection>
    );
  }

  if (error === 'error' || !data) {
    return (
      <AccountSection center>
        <SectionTitle
          tag="// Minha Conta"
          title="Algo deu errado"
          subtitle="Não foi possível carregar seus dados. Tente novamente mais tarde."
          center
        />
      </AccountSection>
    );
  }

  const { user, registration, payment, pix } = data;

  return (
    <AccountSection>
      <SectionTitle
        tag="// Minha Conta"
        title={`Olá, ${user.name.split(' ')[0]}!`}
        subtitle="Acompanhe sua inscrição, pagamento e oficinas na TechWeek 2026."
        center
      />      <div className={styles.grid}>
        <ProfileCard user={user} />
        <CheckinCard user={user} />
        <RegistrationCard
          registration={registration}
          payment={payment}
          pix={pix}
          proofFile={proofFile}
          setProofFile={setProofFile}
          paying={paying}
          confirmPayment={confirmPayment}
        />
        <VolunteerCard />
        <EnrollmentsCard
          enrollments={enrollments}
          codes={codes}
          setCodes={setCodes}
          checkingIn={checkingIn}
          cancelling={cancelling}
          submitCode={submitCode}
          cancelEnrollment={cancelEnrollment}
        />
      </div>
    </AccountSection>
  );
}
