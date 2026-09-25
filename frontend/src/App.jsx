import { ConfigProvider, App as AntApp } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { antdTheme } from './styles/theme';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import AccountPage from './pages/AccountPage';
import OficinasPage from './pages/OficinasPage';
import AdminPage from './pages/AdminPage';
import VerifyCertificatePage from './pages/VerifyCertificatePage';
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
    : page === 'verificar' ? VerifyCertificatePage
    : HomePage;

  return (
    <ConfigProvider theme={antdTheme} locale={ptBR}>
      <AntApp>
        <Page />
      </AntApp>
    </ConfigProvider>
  );
}