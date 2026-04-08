import NavBar from '../components/NavBar/NavBar';
import Hero from '../views/Hero/Hero';
import Vision from '../views/Vision/Vision';
import Numbers from '../views/Numbers/Numbers';
import Highlights from '../views/Highlights/Highlights';
import Edition2026 from '../views/Edition2026/Edition2026';
import Contact from '../views/Contact/Contact';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Por que palestrar', href: '#vision' },
  { label: 'Impacto', href: '#numbers' },
  { label: 'Formato', href: '#edition2026' },
  { label: 'Contato', href: '#contact' },
];

const pillars = [
  {
    icon: '🎯',
    title: 'Público pronto para aplicar',
    description: 'A TechWeek reúne estudantes, profissionais e lideranças locais em torno de tecnologia aplicada, carreira e transformação digital com foco real de mercado.',
  },
  {
    icon: '🧠',
    title: 'Curadoria orientada a densidade',
    description: 'Buscamos falas que tragam método, bastidores, aprendizados concretos e leitura de cenário. O objetivo é gerar repertório útil, não palco vazio.',
  },
  {
    icon: '🤝',
    title: 'Visibilidade com conversa qualificada',
    description: 'Além da exposição, o evento favorece conexões depois da fala: networking, troca com comunidade técnica e aproximação com talentos em formação.',
  },
];

const stats = [
  { value: 500, suffix: '+', label: 'participantes esperados na edição 2026', icon: '👥', delay: 0 },
  { value: 3, suffix: '', label: 'trilhas editoriais para encaixe de talks', icon: '🧭', delay: 0.1 },
  { value: 48, suffix: 'h', label: 'de ativação intensa na semana do hackathon', icon: '⚡', delay: 0.2 },
  { value: 1, suffix: ' região', label: 'com baixa oferta de eventos tech desse porte', icon: '📍', delay: 0.3 },
  { value: 80, suffix: '%', label: 'de público em formação técnica e carreira inicial', icon: '🎓', delay: 0.4 },
  { value: 100, suffix: '%', label: 'de foco em conteúdo aplicável ao mundo real', icon: '✅', delay: 0.5 },
];

const highlights = [
  {
    tag: 'Formato',
    icon: '🎤',
    title: 'Palestras, painéis e workshops',
    description: 'Há espaço para keynotes, conversas de bastidor, mesas com múltiplas perspectivas e sessões mais práticas com alto valor de aplicação.',
    accent: '#00FF00',
  },
  {
    tag: 'Audiência',
    icon: '🌐',
    title: 'Encontro entre campus, mercado e comunidade',
    description: 'A TechWeek não fala apenas com estudantes. O evento aproxima empresas, lideranças, coletivos, profissionais em transição e talentos emergentes.',
    accent: '#00BF63',
  },
  {
    tag: 'Conteúdo',
    icon: '💡',
    title: 'Temas que conectam presente e futuro',
    description: 'IA, engenharia, produto, games, carreira, sustentabilidade, cloud, dados e experiências reais de construção digital entram com força em 2026.',
    accent: '#00BF63',
  },
  {
    tag: 'Experiência',
    icon: '🤝',
    title: 'Proximidade antes, durante e depois do palco',
    description: 'A proposta é gerar conversa de verdade, com ambiente de troca, circulação entre trilhas e contato direto com quem quer aprender e colaborar.',
    accent: '#00FF00',
  },
];

const timeline = [
  {
    date: 'Antes da edição',
    label: 'Curadoria e alinhamento editorial',
    desc: 'A organização estrutura temas, formatos e profundidade esperada para que cada participação entre no programa com coerência e impacto.',
    icon: '🗂️',
  },
  {
    date: '13–16 Out',
    label: 'Palco principal e trilhas de conteúdo',
    desc: 'As falas se distribuem entre momentos expositivos, trocas com o público e ativações conectadas ao tema central da edição.',
    icon: '🎙️',
  },
  {
    date: '16–18 Out',
    label: 'Conexão com a energia do hackathon',
    desc: 'O encerramento da programação encontra a maratona de inovação, ampliando o senso de urgência, prototipação e aproximação com o mercado.',
    icon: '⚙️',
  },
];

const facts = [
  { icon: 'IA', label: 'produto, automação e dados' },
  { icon: 'ENG', label: 'software, cloud e arquitetura' },
  { icon: 'GMS', label: 'games e experiências digitais' },
  { icon: 'ESG', label: 'tecnologia verde e impacto' },
];

export default function SpeakersPage() {
  return (
    <>
      <NavBar
        links={navLinks}
        cta={{ label: 'Falar com a organização', href: '#contact' }}
        logoHref="./"
      />
      <main>
        <Hero
          tag={'> TechWeek 2026 para possíveis palestrantes'}
          titleLines={[
            'O palco certo para',
            'compartilhar repertório',
            'prática e visão de futuro',
          ]}
          subtitle="Se a sua atuação ajuda pessoas e equipes a entender melhor o presente da tecnologia, a TechWeek 2026 pode ser o ambiente certo para transformar isso em conversa de alto valor."
          actions={[
            { label: 'Quero conversar', href: '#contact', variant: 'primary' },
            { label: 'Ver página para participantes', href: '?audience=participants', variant: 'secondary' },
          ]}
          pills={['IA aplicada', 'Engenharia', 'Games', 'ESG', 'Carreira e mercado']}
        />

        <Vision
          id="vision"
          tag="// 01 — Por Que Palestrar"
          title="Uma Programação Que Valoriza Conteúdo de Verdade"
          subtitle="A TechWeek 2026 quer palestras e conversas que façam sentido para quem está entrando no mercado, crescendo tecnicamente ou liderando transformação nas organizações."
          pillars={pillars}
          quote="A proposta para palestrantes não é apenas exposição. É entrar em uma edição que aproxima conhecimento, comunidade e formação de talentos com contexto regional forte e ambição nacional."
        />

        <Numbers
          id="numbers"
          tag="// 02 — Impacto"
          title="O Contexto Que Sustenta Uma Boa Participação"
          subtitle="Estes números ajudam a entender por que a sua presença pode fazer diferença dentro da semana do evento."
          stats={stats}
        />

        <Highlights
          id="highlights"
          tag="// 03 — O Que Você Encontra"
          title="Mais do Que Um Slot na Agenda"
          subtitle="A participação de um palestrante é tratada como construção de valor para a edição inteira, não apenas como um bloco isolado de programação."
          highlights={highlights}
        />

        <Edition2026
          id="edition2026"
          tag="// 04 — Como a Edição Se Organiza"
          title="Formato da Jornada do Palco em 2026"
          subtitle="A participação de palestrantes acontece dentro de uma programação que combina trilhas temáticas, momentos de troca e a energia do hackathon como eixo de fechamento da semana."
          timeline={timeline}
          facts={facts}
          profile={{
            tag: 'Quem Vai Estar na Sala',
            desc: 'Estudantes de tecnologia, profissionais em evolução, lideranças locais e comunidade de inovação compõem uma audiência diversa, curiosa e com forte orientação a aplicação prática.',
          }}
        />

        <Contact audience="speaker" />
      </main>
      <FooterSection
        sections={[
          ['#vision', 'Por que palestrar'],
          ['#numbers', 'Impacto'],
          ['#highlights', 'Experiência'],
          ['#edition2026', 'Formato'],
          ['#contact', 'Contato'],
        ]}
        quickLinks={[
          ['./', 'Visão geral do projeto'],
          ['?audience=participants', 'Página para participantes'],
        ]}
        tagline="TechWeek 2026 para possíveis palestrantes: conteúdo aplicado, curadoria forte e conversa qualificada com o ecossistema regional."
      />
    </>
  );
}