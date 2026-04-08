import { ConfigProvider, App as AntApp } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { antdTheme } from './styles/theme';
import HomePage from './pages/HomePage';
import SpeakersPage from './pages/SpeakersPage';
import ParticipantsPage from './pages/ParticipantsPage';
import './styles/global.css';

export default function App() {
  const audience = new URLSearchParams(window.location.search).get('audience');

  const Page = audience === 'speakers'
    ? SpeakersPage
    : audience === 'participants'
      ? ParticipantsPage
      : HomePage;

  return (
    <ConfigProvider theme={antdTheme} locale={ptBR}>
      <AntApp>
        <Page />
      </AntApp>
    </ConfigProvider>
  );
}
