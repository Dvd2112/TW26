import { useState, useEffect } from 'react';
import { Tabs, Button } from 'antd';
import { motion } from 'framer-motion';
import axios from 'axios';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Admin.module.css';
import OverviewTab from './tabs/OverviewTab';
import CheckinTab from './tabs/CheckinTab';
import RegistrationsTab from './tabs/RegistrationsTab';
import LotesTab from './tabs/LotesTab';
import VolunteersTab from './tabs/VolunteersTab';
import FinanceiroTab from './tabs/FinanceiroTab';
import AdminActivitiesTab from './tabs/AdminActivitiesTab';
import UsersTab from './tabs/UsersTab';

/**
 * Abas por permissão: cada aba lista quem pode vê-la. Evita que um credenciador
 * abra "Financeiro" só para tomar 403 do endpoint.
 */
const ADMIN_TABS = [
  { key: 'overview', label: 'Visão Geral', perms: ['super_admin', 'registration_admin', 'content_admin'], render: () => <OverviewTab /> },
  { key: 'checkin', label: 'Credenciamento', perms: ['super_admin', 'credentialer'], render: (active) => <CheckinTab visible={active === 'checkin'} /> },
  { key: 'registrations', label: 'Inscrições', perms: ['super_admin', 'registration_admin'], render: () => <RegistrationsTab /> },
  { key: 'lotes', label: 'Lotes', perms: ['super_admin', 'registration_admin'], render: () => <LotesTab /> },
  { key: 'volunteers', label: 'Voluntários', perms: ['super_admin', 'registration_admin'], render: () => <VolunteersTab /> },
  { key: 'financeiro', label: 'Financeiro', perms: ['super_admin'], render: () => <FinanceiroTab /> },
  { key: 'activities', label: 'Oficinas', perms: ['super_admin', 'content_admin'], render: () => <AdminActivitiesTab /> },
  { key: 'users', label: 'Usuários', perms: ['super_admin'], render: () => <UsersTab /> },
];

export default function Admin() {
  const [status, setStatus] = useState('loading');
  const [perms, setPerms] = useState([]);
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    axios.get('/TW26/backend/api/me.php')
      .then((res) => {
        if (res.data?.user && res.data?.is_admin) {
          setPerms(res.data.permissions ?? []);
          setStatus('ok');
        } else setStatus('denied');
      })
      .catch(() => setStatus('denied'));
  }, []);

  if (status === 'loading') {
    return <section className={styles.section}><p className={styles.muted}>Carregando...</p></section>;
  }

  if (status === 'denied') {
    return (
      <section className={styles.section}>
        <SectionTitle tag="// Painel Admin" title="Acesso restrito" subtitle="Você precisa ser um administrador para acessar este painel." center />
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <a href="?page=login"><Button type="primary" style={{ background: '#8A00C4', border: 'none' }}>Ir para o login</Button></a>
        </div>
      </section>
    );
  }

  const tabs = ADMIN_TABS.filter((t) => t.perms.some((p) => perms.includes(p)));
  // Credenciador puro vê só o credenciamento; o subtítulo acompanha.
  const onlyCheckin = tabs.length === 1 && tabs[0].key === 'checkin';
  const current = activeKey ?? tabs[0]?.key;

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <SectionTitle
            tag="// Painel Admin"
            title="Gestão TechWeek 2026"
            subtitle={onlyCheckin
              ? 'Registre a presença dos participantes nas atividades designadas a você.'
              : 'Inscrições, lotes, financeiro, oficinas e usuários.'}
            center
          />
        </motion.div>

        <Tabs
          size="large"
          activeKey={current}
          onChange={setActiveKey}
          items={tabs.map((t) => ({ key: t.key, label: t.label, children: t.render(current) }))}
        />
      </div>
    </section>
  );
}
