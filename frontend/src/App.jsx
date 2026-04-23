import { ConfigProvider, App as AntApp } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { antdTheme } from './styles/theme';
import ParticipantsPage from './pages/ParticipantsPage';
import RegisterPage from './pages/RegisterPage';
import './styles/global.css';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const page   = params.get('page');

  const Page = page === 'register'
    ? RegisterPage
    : ParticipantsPage;

  return (
    <ConfigProvider theme={antdTheme} locale={ptBR}>
      <AntApp>
        <Page />
      </AntApp>
    </ConfigProvider>
  );
}
