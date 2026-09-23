import { Button, Tag, Input, Space } from 'antd';
import styles from '../../styles/Account.module.css';

export default function EnrollmentsCard({ enrollments, codes, setCodes, checkingIn, cancelling, submitCode, cancelEnrollment }) {
  return (
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
  );
}
