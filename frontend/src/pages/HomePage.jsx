import { useState, useEffect } from 'react';
import axios from 'axios';
import NavBar from '../components/NavBar/NavBar';
import Hero from '../views/Hero/Hero';
import Vision from '../views/Vision/Vision';
import Numbers from '../views/Numbers/Numbers';
import Highlights from '../views/Highlights/Highlights';
import Edition2026 from '../views/Edition2026/Edition2026';
import HackathonPromo from '../views/HackathonPromo/HackathonPromo';
import PreSaveBanner from '../views/PreSaveBanner/PreSaveBanner';
import Sponsors from '../views/Sponsors/Sponsors';
import FooterSection from '../views/FooterSection/FooterSection';

import logoCresol from '../assets/sponsors/cresol.png';
import logoCsiCloud from '../assets/sponsors/csi-cloud.png';
import logoDezTelecom from '../assets/sponsors/dez-telecom.png';
import logoCiss from '../assets/sponsors/ciss.svg';
import logoSischef from '../assets/sponsors/sischef.png';
import logoGrifo from '../assets/sponsors/grifo.png';
import logoPowerx from '../assets/sponsors/powerx.png';
import logoMaxisCard from '../assets/sponsors/maxis-card.png';
import logoVorbi from '../assets/sponsors/vorbi.png';

const navLinks = [
  { label: 'O que você encontra', href: '#vision' },
  { label: 'Ideathon GovTech', href: '#hackathon' },
  { label: 'Destaques', href: '#highlights' },
  { label: 'Edição 2026', href: '#edition2026' },
  { label: 'Patrocinadores', href: '#sponsors' },
];

const pillars = [
  {
    icon: '📊',
    title: 'Conteúdo que conversa com mercado real',
    description: 'A programação mistura visão estratégica e prática aplicável para quem quer sair da bolha acadêmica e entender como a tecnologia acontece no mundo profissional.',
  },
  {
    icon: '🤝',
    title: 'Rede para aprender e se aproximar',
    description: 'A TechWeek reúne estudantes, profissionais, lideranças e empresas, criando um ambiente bom para fazer conexões, testar repertório e enxergar novas possibilidades de carreira.',
  },
  {
    icon: '⚡',
    title: 'Experiência intensa, não evento morno',
    description: 'Entre trilhas, workshops, painéis e Ideathon GovTech, a edição foi desenhada para gerar energia, troca e memória de participação.',
  },
];

const stats = [
  { value: 500, suffix: '+', label: 'participantes esperados em 2026', icon: '👥', delay: 0 },
  { value: 40, suffix: 'h', label: 'de conteúdo e experiências na semana', icon: '📚', delay: 0.1 },
  { value: 2, suffix: ' dias', label: 'de Ideathon GovTech para criar soluções públicas', icon: '⚡', delay: 0.2 },
  { value: 3, suffix: '', label: 'trilhas centrais para explorar tecnologia', icon: '🗺️', delay: 0.3 },
  { value: 80, suffix: '%', label: 'de público em formação técnica ou carreira inicial', icon: '🎓', delay: 0.4 },
  { value: 1, suffix: ' região', label: 'com baixa oferta de eventos tech desse porte', icon: '📍', delay: 0.5 },
];

const highlights = [
  {
    tag: 'Aprendizado',
    icon: '📚',
    title: 'Talks e workshops com aplicação prática',
    description: 'A ideia é sair da cadeira com novas referências, ferramentas, processos e perguntas melhores para levar para estudo, estágio, trabalho ou projeto pessoal.',
    accent: '#8A00C4',
  },
  {
    tag: 'Carreira',
    icon: '👥',
    title: 'Contato com quem constrói tecnologia',
    description: 'Você encontra lideranças, profissionais experientes, empresas parceiras e pessoas que estão atravessando desafios parecidos com os seus.',
    accent: '#BF40FF',
  },
  {
    tag: 'Experiência',
    icon: '🔥',
    title: 'Ideathon GovTech e programação com ritmo',
    description: 'A edição começa com uma jornada de ideação para soluções públicas e segue com o evento principal, criando uma experiência mais viva para quem quer participar de verdade.',
    accent: '#8A00C4',
  },
];

const timeline = [
  {
    date: 'Antes da edição',
    label: 'Curadoria e alinhamento editorial',
    desc: 'A organização estrutura temas, formatos e profundidade esperada para que cada participação entre no programa com coerência e impacto.',
    icon: '🔭',
  },
  {
    date: '17–18 Out',
    label: 'Ideathon - Jornada GovTech',
    desc: 'A jornada reúne equipes para criar soluções inovadoras a desafios reais do poder público de Francisco Beltrão.',
    icon: '⚡',
  },
  {
    date: '19–22 Out',
    label: 'Talks, workshops e painéis',
    desc: 'Os dias do evento principal concentram trilhas de conteúdo, troca com especialistas, atividades formativas e encontros com a comunidade de tecnologia.',
    icon: '🎤',
  },
  {
    date: 'Durante o evento',
    label: 'Networking e circulação entre frentes',
    desc: 'Além de assistir, você pode circular, conversar, se aproximar de temas novos e entender como diferentes áreas da tecnologia se conectam.',
    icon: '🤝',
  },
];

const facts = [
  { icon: 'IA', label: 'produto, automação e dados' },
  { icon: 'ENG', label: 'software, cloud e arquitetura' },
  { icon: 'GMS', label: 'games e experiências digitais' },
  { icon: 'ESG', label: 'tecnologia verde e impacto' },
];

const hackathonParagraphs = [
  'O Ideathon - Jornada GovTech é um evento de ideação para desenvolver soluções inovadoras a problemas reais do poder público de Francisco Beltrão.',
  'As equipes colaboram para transformar ideias em projetos, com foco em impacto público, empreendedorismo e tecnologia.',
  'Estudantes e pessoas de diferentes organizações são bem-vindos. Cada equipe deve reunir de 3 a 6 integrantes e ter pelo menos uma pessoa de outro curso ou instituição/organização.',
];

const hackathonSteps = [
  { title: 'Monte sua equipe', desc: 'Uma pessoa faz a inscrição e informa os dados de 3 a 6 participantes, incluindo telefone e data de nascimento.' },
  { title: 'Cada integrante aceita o vínculo', desc: 'Todos os convidados entram no site com a própria conta e aceitam (ou rejeitam) o convite para a equipe.' },
  { title: 'Preparem o pitch', desc: 'No dia 26/10, os projetos serão apresentados na banca junto à abertura da Semana Municipal de Ciência, Tecnologia e Inovação.' },
];

const sponsorTiers = [
  {
    name: 'Patrocínio Diamante',
    color: '#8A00C4',
    medal: '💎',
    size: 'lg',
    sponsors: [
      { name: 'Cresol', logo: logoCresol },
      { name: 'CSI Cloud', logo: logoCsiCloud },
    ],
  },
  {
    name: 'Patrocínio Ouro',
    color: '#FFD700',
    medal: '🥇',
    size: 'lg',
    sponsors: [
      { name: 'Ciss', logo: logoCiss },
      { name: 'Dez Telecom', logo: logoDezTelecom },
    ],
  },
  {
    name: 'Patrocínio Prata',
    color: '#C0C0C0',
    medal: '🥈',
    size: 'md',
    sponsors: [
      { name: 'Sischef', logo: logoSischef },
      { name: 'Grifo', logo: logoGrifo },
      { name: 'PowerX', logo: logoPowerx },
      { name: 'Maxis Card', logo: logoMaxisCard },
      { name: 'Vorbi', logo: logoVorbi },
    ],
  },
];

export default function HomePage() {
  const [hasRegistration, setHasRegistration] = useState(false);
  const [hackathon, setHackathon] = useState(null);
  const [hasHackathonInvite, setHasHackathonInvite] = useState(false);

  useEffect(() => {
    axios
      .get('/TW26/backend/api/my-registration.php')
      .then((res) => setHasRegistration(Boolean(res.data?.registration)))
      .catch(() => setHasRegistration(false));

    axios
      .get('/TW26/backend/api/hackathon.php')
      .then((res) => {
        setHackathon(res.data?.settings ?? null);
        setHasHackathonInvite((res.data?.invites ?? []).length > 0);
      })
      .catch(() => setHackathon(null));
  }, []);

  const hackathonOpen = Boolean(hackathon?.registrations_open) && !hackathon?.is_full;
  const hackathonStatus = hackathon
    ? {
        open: hackathonOpen,
        label: hackathon.is_full ? 'Vagas esgotadas' : hackathon.registrations_open ? 'Inscrições abertas' : 'Inscrições em breve',
      }
    : null;

  const heroActions = hasRegistration
    ? []
    : [
        { label: 'Se inscrever agora', href: '?page=register', variant: 'primary' },
        { label: 'Quero palestrar', href: 'mailto:techweekfb@gmail.com?subject=Proposta%20de%20palestra%20-%20TechWeek%202026', variant: 'secondary' },
      ];

  return (
    <>
      <NavBar
        links={navLinks}
        cta={hasRegistration ? null : { label: 'Se inscrever', href: '?page=register' }}
        logoHref="./"
      />
      <main>
        <Hero
          tag={'> 19 a 22 de outubro de 2026 · Francisco Beltrão, PR'}
          titleLines={[
            'A semana tech que',
            'conecta carreira,',
            'palco e comunidade',
          ]}
          subtitle="A TechWeek 2026 reúne quem quer aprender com profundidade, conhecer gente boa, enxergar o mercado com mais clareza e quem tem repertório para compartilhar no palco."
          actions={heroActions}
          pills={['Talks', 'Workshops', 'Networking', 'Ideathon GovTech', 'Mercado tech']}
        />

        <Vision
          id="vision"
          tag="// 01 – O Que Você Encontra"
          title="Uma Edição Feita Para Quem Quer Sair Melhor"
          subtitle="A TechWeek combina conhecimento, comunidade e intensidade para entregar uma experiência útil para estudantes, profissionais, palestrantes e pessoas que querem se aproximar do ecossistema tech."
          pillars={pillars}
          quote="A ideia não é só assistir. É viver uma semana que amplie repertório, gere encontro e ajude você a enxergar caminhos mais concretos dentro da tecnologia."
        />

        <Numbers
          id="numbers"
          tag="// 02 – O Que Esperar"
          title="Uma Semana Que Vale Colocar na Agenda"
          subtitle="A edição 2026 está sendo montada para equilibrar profundidade de conteúdo, energia de comunidade e oportunidade prática."
          stats={stats}
        />

        <HackathonPromo
          id="hackathon"
          tag="// 03 – Ideathon - Jornada GovTech"
          title="Ideathon"
          brand="GovTech"
          subtitle="Uma jornada de ideação para criar soluções inovadoras para desafios reais do poder público de Francisco Beltrão."
          paragraphs={hackathonParagraphs}
          steps={hackathonSteps}
          details={[
            { icon: '📅', label: 'Encontros', value: '17 e 18 de outubro' },
            { icon: '⏱️', label: 'Apresentação', value: '26 de outubro' },
            { icon: '👥', label: 'Equipes', value: 'De 3 a 6 pessoas' },
            { icon: '🏛️', label: 'Foco', value: 'Soluções para o poder público' },
            { icon: '📍', label: 'Local', value: 'Sebrae Francisco Beltrão' },
          ]}
          status={hackathonStatus}
          cta={{ label: hasHackathonInvite ? 'Verificar convite' : hackathonOpen ? 'Inscrever minha equipe' : 'Ver detalhes da inscrição', href: '?page=hackathon' }}
        />

        <Highlights
          id="highlights"
          tag="// 04 – Destaques"
          title="O Tipo de Experiência Que Faz Ficar"
          subtitle="Mais do que acompanhar uma programação, você entra em uma semana desenhada para estimular presença, conversa e construção de trajetória."
          highlights={highlights}
        />

        <Edition2026
          id="edition2026"
          tag="// 05 – A Edição 2026"
          title="Como a TechWeek 2026 Ganha Ritmo"
          subtitle="A programação se distribui ao longo de vários dias, criando um fluxo em que conteúdo, conexão e experimentação se reforçam mutuamente."
          timeline={timeline}
          facts={facts}
          profile={{
            tag: 'Para Quem Faz Sentido',
            desc: 'Se você está estudando, começando carreira, mudando de área, lidera um time ou quer subir ao palco, a edição foi pensada para você.',
          }}
        />

        <Sponsors
          id="sponsors"
          tag="// 06 – Patrocinadores"
          title="Quem Torna a TechWeek Possível"
          subtitle="Empresas que acreditam no potencial da tecnologia da região e caminham junto com a comunidade."
          tiers={sponsorTiers}
        />

        {!hasRegistration && <PreSaveBanner />}
      </main>
      <FooterSection
        sections={[
          ['#vision', 'O que você encontra'],
          ['#numbers', 'O que esperar'],
          ['#hackathon', 'Ideathon GovTech'],
          ['#highlights', 'Destaques'],
          ['#edition2026', 'A edição'],
          ['#sponsors', 'Patrocinadores'],
          ['?page=verificar', 'Verificar certificado'],
          ['mailto:techweekfb@gmail.com', 'Contato'],
        ]}
        quickLinks={[]}
        tagline="TechWeek 2026: conteúdo relevante, comunidade ativa e uma semana desenhada para acelerar repertório, conexão e carreira."
      />
    </>
  );
}
