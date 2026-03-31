import { ConfigProvider, App as AntApp } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { antdTheme } from './styles/theme';
import NavBar from './components/NavBar/NavBar';
import Hero from './views/Hero/Hero';
import Vision from './views/Vision/Vision';
import Numbers from './views/Numbers/Numbers';
import Sponsors from './views/Sponsors/Sponsors';
import Highlights from './views/Highlights/Highlights';
import Edition2026 from './views/Edition2026/Edition2026';
import Tiers from './views/Tiers/Tiers';
import Contact from './views/Contact/Contact';
import FooterSection from './views/FooterSection/FooterSection';
import './styles/global.css';

export default function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={ptBR}>
      <AntApp>
        <NavBar />
        <main>
          <Hero />
          <Vision />
          <Numbers />
          <Sponsors />
          <Highlights />
          <Edition2026 />
          <Tiers />
          <Contact />
        </main>
        <FooterSection />
      </AntApp>
    </ConfigProvider>
  );
}
