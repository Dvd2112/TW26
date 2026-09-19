import NavBar from '../components/NavBar/NavBar';
import Hero from '../views/Hero/Hero';
import Vision from '../views/Vision/Vision';
import Numbers from '../views/Numbers/Numbers';
import Highlights from '../views/Highlights/Highlights';
import Edition2026 from '../views/Edition2026/Edition2026';
import PreSaveBanner from '../views/PreSaveBanner/PreSaveBanner';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'O que você encontra', href: '#vision' },
  { label: 'Destaques', href: '#highlights' },
  { label: 'Edição 2026', href: '#edition2026' },
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
    description: 'Entre trilhas, workshops, painéis e hackathon, a edição foi desenhada para gerar energia, troca e memória de participação.',
  },
];

const stats = [
  { value: 500, suffix: '+', label: 'participantes esperados em 2026', icon: '👥', delay: 0 },
  { value: 40, suffix: 'h', label: 'de conteúdo e experiências na semana', icon: '📚', delay: 0.1 },
  { value: 48, suffix: 'h', label: 'de hackathon para quem quer ir além', icon: '⚡', delay: 0.2 },
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
    title: 'Hackathon e programação com ritmo',
    description: 'A edição começa com a maratona de inovação e segue com o evento principal, criando uma experiência mais viva para quem quer participar de verdade.',
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
    label: 'Hackathon 48h',
    desc: 'Para quem quer vivência mais intensa, o hackathon abre a edição com prototipação, colaboração, desafio e muita energia prática.',
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

export default function HomePage() {
  return (
    <>
      <NavBar
        links={navLinks}
        cta={{ label: 'Se inscrever', href: '?page=register' }}
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
          actions={[
            { label: 'Se inscrever agora', href: '?page=register', variant: 'primary' },
            { label: 'Quero palestrar', href: 'mailto:techweekfb@gmail.com?subject=Proposta%20de%20palestra%20-%20TechWeek%202026', variant: 'secondary' },
          ]}
          pills={['Talks', 'Workshops', 'Networking', 'Hackathon 48h', 'Mercado tech']}
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

        <Highlights
          id="highlights"
          tag="// 03 – Destaques"
          title="O Tipo de Experiência Que Faz Ficar"
          subtitle="Mais do que acompanhar uma programação, você entra em uma semana desenhada para estimular presença, conversa e construção de trajetória."
          highlights={highlights}
        />

        <Edition2026
          id="edition2026"
          tag="// 04 – A Edição 2026"
          title="Como a TechWeek 2026 Ganha Ritmo"
          subtitle="A programação se distribui ao longo de vários dias, criando um fluxo em que conteúdo, conexão e experimentação se reforçam mutuamente."
          timeline={timeline}
          facts={facts}
          profile={{
            tag: 'Para Quem Faz Sentido',
            desc: 'Se você está estudando, começando carreira, mudando de área, lidera um time ou quer subir ao palco, a edição foi pensada para você.',
          }}
        />

        <PreSaveBanner />
      </main>
      <FooterSection
        sections={[
          ['#vision', 'O que você encontra'],
          ['#numbers', 'O que esperar'],
          ['#highlights', 'Destaques'],
          ['#edition2026', 'A edição'],
          ['mailto:techweekfb@gmail.com', 'Contato'],
        ]}
        quickLinks={[]}
        tagline="TechWeek 2026: conteúdo relevante, comunidade ativa e uma semana desenhada para acelerar repertório, conexão e carreira."
      />
    </>
  );
}
