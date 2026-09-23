import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Input, Select, Tag, Statistic, Row, Col, Space, Popconfirm, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import QrScanner from '../../../components/QrScanner/QrScanner';
import styles from '../../../styles/Admin.module.css';
import { ACTIVITY_TYPE_LABELS } from '../shared/constants';
import { filterRows } from '../shared/utils';
import SearchInput from '../shared/SearchInput';
import ResponsiveTable from '../shared/ResponsiveTable';

const CHECKIN_METHOD_LABELS = { scan: 'QR code', manual: 'Digitado', self: 'Participante' };

/**
 * Registro de presença por QR ou código digitado. O endpoint já devolve apenas
 * as atividades designadas a este credenciador (super_admin recebe todas).
 */
export default function CheckinTab({ visible = true }) {
  const [activities, setActivities] = useState([]);
  const [activityId, setActivityId] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [mode, setMode] = useState('camera');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  // Último QR enviado: a câmera lê o mesmo código muitas vezes por segundo.
  const lastScanRef = useRef('');

  const loadActivities = useCallback(() => {
    axios.get('/TW26/backend/api/admin/attendance.php')
      .then((res) => {
        const list = res.data.activities ?? [];
        setActivities(list);
        setActivityId((prev) => prev ?? (list.length === 1 ? list[0].id : null));
      })
      .catch((err) => message.error(err.response?.data?.message ?? 'Erro ao carregar atividades.'))
      .finally(() => setLoaded(true));
  }, []);

  const loadAttendance = useCallback((id) => {
    if (!id) {
      setAttendance([]);
      return;
    }
    axios.get(`/TW26/backend/api/admin/attendance.php?activity_id=${id}`)
      .then((res) => setAttendance(res.data.attendance ?? []))
      .catch(() => setAttendance([]));
  }, []);

  useEffect(loadActivities, [loadActivities]);
  useEffect(() => loadAttendance(activityId), [activityId, loadAttendance]);

  const submit = useCallback(async (rawCode, method) => {
    const value = String(rawCode ?? '').trim();
    if (!activityId || !value || busy) return;

    setBusy(true);
    try {
      const res = await axios.post('/TW26/backend/api/admin/attendance.php', {
        activity_id: activityId,
        code: value,
        method,
      });
      setFeedback({ type: 'success', text: res.data?.message ?? 'Presença registrada.' });
      setCode('');
      loadActivities();
      loadAttendance(activityId);
    } catch (err) {
      const status = err.response?.status;
      setFeedback({
        // 409 = já credenciado: aviso, não erro — a pessoa está na sala mesmo assim.
        type: status === 409 ? 'warning' : 'error',
        text: err.response?.data?.message ?? 'Erro ao registrar presença.',
      });
    } finally {
      setBusy(false);
    }
  }, [activityId, busy, loadActivities, loadAttendance]);

  const onScan = useCallback((text) => {
    if (text === lastScanRef.current) return;
    lastScanRef.current = text;
    // Libera o mesmo QR depois de 3s, para reler de propósito se precisar.
    setTimeout(() => { lastScanRef.current = ''; }, 3000);
    submit(text, 'scan');
  }, [submit]);

  const undo = async (userId) => {
    try {
      await axios.delete('/TW26/backend/api/admin/attendance.php', {
        data: { activity_id: activityId, user_id: userId },
      });
      message.success('Presença desfeita.');
      loadActivities();
      loadAttendance(activityId);
    } catch (err) {
      message.error(err.response?.data?.message ?? 'Erro ao desfazer.');
    }
  };

  if (loaded && activities.length === 0) {
    return (
      <Card title="Credenciamento">
        <p className={styles.muted}>
          Nenhuma atividade designada a você. Peça ao super admin para designar as
          oficinas que você vai credenciar (painel &gt; Usuários &gt; editar seu usuário).
        </p>
      </Card>
    );
  }

  const selected = activities.find((a) => Number(a.id) === Number(activityId));

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={10}>
        <Card title="Registrar presença">
          <Select
            placeholder="Escolha a atividade"
            value={activityId}
            onChange={(v) => { setActivityId(v); setFeedback(null); }}
            style={{ width: '100%', marginBottom: 16 }}
            showSearch
            optionFilterProp="label"
            options={activities.map((a) => ({
              value: a.id,
              label: `${a.title} (${ACTIVITY_TYPE_LABELS[a.type] ?? a.type})`,
            }))}
          />

          {!activityId ? (
            <p className={styles.muted}>Escolha uma atividade para começar.</p>
          ) : (
            <>
              <Statistic
                title="Presentes / inscritos"
                value={`${selected?.attended ?? 0} / ${selected?.enrolled ?? 0}`}
                valueStyle={{ color: '#8A00C4', fontWeight: 800 }}
              />

              <Space style={{ margin: '16px 0' }} wrap>
                <Button
                  type={mode === 'camera' ? 'primary' : 'default'}
                  onClick={() => setMode('camera')}
                  style={mode === 'camera' ? { background: '#8A00C4', borderColor: '#8A00C4' } : undefined}
                >
                  Câmera (QR)
                </Button>
                <Button
                  type={mode === 'manual' ? 'primary' : 'default'}
                  onClick={() => setMode('manual')}
                  style={mode === 'manual' ? { background: '#8A00C4', borderColor: '#8A00C4' } : undefined}
                >
                  Digitar código
                </Button>
              </Space>

              {mode === 'camera' ? (
                // visible: o antd mantém a aba montada ao trocar de aba — sem isso
                // a câmera continuaria ligada em segundo plano.
                <QrScanner active={visible} onScan={onScan} />
              ) : (
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Código do participante"
                    value={code}
                    maxLength={16}
                    autoFocus
                    onChange={(e) => setCode(e.target.value)}
                    onPressEnter={() => submit(code, 'manual')}
                  />
                  <Button
                    type="primary"
                    loading={busy}
                    onClick={() => submit(code, 'manual')}
                    style={{ background: '#8A00C4', borderColor: '#8A00C4' }}
                  >
                    Registrar
                  </Button>
                </Space.Compact>
              )}

              {feedback && (
                <div
                  style={{
                    marginTop: 16, padding: '10px 14px', borderRadius: 8, fontWeight: 600,
                    color: '#fff',
                    background: feedback.type === 'success' ? '#237804'
                      : feedback.type === 'warning' ? '#ad6800' : '#a8071a',
                  }}
                >
                  {feedback.text}
                </div>
              )}
            </>
          )}
        </Card>
      </Col>

      <Col xs={24} lg={14}>
        <Card
          title="Presentes"
          extra={<SearchInput value={search} onChange={setSearch} placeholder="Buscar nome, e-mail..." width={240} />}
        >
          <ResponsiveTable
            rowKey="user_id"
            dataSource={filterRows(attendance, search, (a) => [a.name, a.email].join(' '))}
            size="small"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Nenhuma presença registrada ainda.' }}
            columns={[
              { title: 'Nome', dataIndex: 'name' },
              { title: 'E-mail', dataIndex: 'email' },
              {
                title: 'Como', dataIndex: 'method',
                render: (v) => <Tag>{CHECKIN_METHOD_LABELS[v] ?? v}</Tag>,
              },
              {
                title: 'Horário', dataIndex: 'checked_in_at',
                render: (v) => (v ? dayjs(v).format('DD/MM HH:mm') : '—'),
              },
              {
                title: 'Ações', key: 'actions',
                render: (_, r) => (
                  <Popconfirm title="Desfazer presença?" onConfirm={() => undo(r.user_id)}>
                    <Button size="small" danger>Desfazer</Button>
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Card>
      </Col>
    </Row>
  );
}
