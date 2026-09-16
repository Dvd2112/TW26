import { ConfigProvider, App as AntApp } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { antdTheme } from './styles/theme';
import ParticipantsPage from './pages/ParticipantsPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import OficinasPage from './pages/OficinasPage';
import AdminPage from './pages/AdminPage';
import './styles/global.css';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const page   = params.get('page');

  const Page =
    page === 'register' ? RegisterPage
    : page === 'login'    ? LoginPage
    : page === 'conta'    ? AccountPage
    : page === 'oficinas' ? OficinasPage
    : page === 'admin'    ? AdminPage
    : ParticipantsPage;

  return (
    <ConfigProvider theme={antdTheme} locale={ptBR}>
      <AntApp>
        <Page />
      </AntApp>
    </ConfigProvider>
  );
}