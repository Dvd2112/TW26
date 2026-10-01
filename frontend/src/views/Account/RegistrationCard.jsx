import { Button, Tag, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import styles from '../../styles/Account.module.css';
import { PAYMENT_LABELS, PAYMENT_COLORS, REG_LABELS } from './constants';

export default function RegistrationCard({ registration, payment, pix, proofFile, setProofFile, paying, confirmPayment }) {
  return (
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
  );
}
