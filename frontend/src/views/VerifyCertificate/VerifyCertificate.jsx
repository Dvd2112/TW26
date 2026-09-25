import { useState } from 'react';
import { Button, Input, message } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/VerifyCertificate.module.css';

const formatDate = (iso) => new Date(iso).toLocaleDateString('pt-BR');
const formatHours = (h) => Number(h).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export default function VerifyCertificate({ tag, title, subtitle }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const verify = async () => {
    if (!code.trim()) {
      message.error('Digite o código do certificado.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await axios.get('/TW26/backend/api/certificate-lookup.php', { params: { code } });
      setResult(res.data.certificate);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erro ao verificar o certificado.');
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
          <SectionTitle tag={tag} title={title} subtitle={subtitle} center />

          <div className={styles.card}>
            <label className={styles.label} htmlFor="cert-code">Código do certificado</label>
            <Input
              id="cert-code"
              size="large"
              placeholder="ABCD1234EF567890"
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onPressEnter={verify}
              style={{ textTransform: 'uppercase' }}
            />
            <Button
              type="primary"
              size="large"
              block
              loading={loading}
              onClick={verify}
              style={{ background: '#8A00C4', border: 'none', fontWeight: 700, marginTop: 12 }}
            >
              Verificar
            </Button>

            {result && (
              <div className={styles.ok}>
                <p className={styles.okTitle}>Certificado autêntico</p>
                <p className={styles.line}><strong>Participante:</strong> {result.name}</p>
                <p className={styles.line}><strong>Carga horária:</strong> {formatHours(result.total_hours)}h</p>
                <p className={styles.line}><strong>Emitido em:</strong> {formatDate(result.issued_at)}</p>
              </div>
            )}

            {error && <div className={styles.fail}>{error}</div>}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
