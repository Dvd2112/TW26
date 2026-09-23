import { useState, useEffect } from 'react';
import { Card, Tag, Statistic, Row, Col, message, Progress } from 'antd';
import axios from 'axios';
import styles from '../../../styles/Admin.module.css';
import { PAY_LABELS, PAY_COLORS } from '../shared/constants';

export default function OverviewTab() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('/TW26/backend/api/admin/dashboard.php')
      .then((res) => setData(res.data))
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar painel.'));
  }, []);

  if (!data) return <p className={styles.muted}>Carregando...</p>;

  const countByType = (tipo) => {
    const row = (data.inscritos_por_tipo ?? []).find((r) => r.participant_type === tipo);
    return row ? Number(row.total) : 0;
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Usuários cadastrados" value={data.total_users} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Com acesso admin" value={data.total_admins} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Inscrições (não canceladas)" value={countByType('participant') + countByType('volunteer') + countByType('staff')} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Oficinas cadastradas" value={(data.oficinas ?? []).length} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Inscritos por tipo">
            <div className={styles.statLine}>
              <span>👤 Normal</span> <strong>{countByType('participant')}</strong>
            </div>
            <div className={styles.statLine}>
              <span>🛠️ Staff</span> <strong>{countByType('staff')}</strong>
            </div>
            <div className={styles.statLine}>
              <span>🤝 Voluntário</span> <strong>{countByType('volunteer')}</strong>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Vagas por lote">
            {(data.vagas_por_lote ?? []).map((lote) => {
              const pct = lote.capacity > 0 ? Math.round((lote.enrolled / lote.capacity) * 100) : 0;
              return (
                <div key={lote.id} style={{ marginBottom: 12 }}>
                  <div className={styles.statLine}>
                    <span>{lote.name}{lote.is_active ? '' : ' (fechado)'}</span>
                    <strong>{lote.enrolled}/{lote.capacity}</strong>
                  </div>
                  <Progress percent={pct} showInfo={false} strokeColor="#8A00C4" />
                </div>
              );
            })}
            {(!data.vagas_por_lote || data.vagas_por_lote.length === 0) && (
              <p className={styles.muted}>Nenhum lote cadastrado.</p>
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Pagamentos">
            {(data.pagamentos_por_status ?? []).map((s) => (
              <div className={styles.statLine} key={s.status}>
                <Tag color={PAY_COLORS[s.status]}>{PAY_LABELS[s.status] ?? s.status}</Tag>
                <strong>{s.total}</strong>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
