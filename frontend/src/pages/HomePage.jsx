import NavBar from '../components/NavBar/NavBar';
import Hero from '../views/Hero/Hero';
import Vision from '../views/Vision/Vision';
import Numbers from '../views/Numbers/Numbers';
import Highlights from '../views/Highlights/Highlights';
import Contact from '../views/Contact/Contact';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Jornadas', href: '#journeys' },
  { label: 'Panorama', href: '#numbers' },
  { label: 'Contato', href: '#contact' },
];

const pillars = [
  {
    icon: '🎤',
    title: 'Para possíveis palestrantes',
    description: 'Uma narrativa voltada a autoridade, curadoria e aderência editorial para quem pode enriquecer a programação da edição 2026.',
  },
  {
    icon: '🚀',
    title: 'Para futuros participantes',
    description: 'Uma jornada pensada para gerar desejo, mostrar trilhas, oportunidades e o tipo de experiência que a TechWeek entrega.',
  },
  {
    icon: '🧭',
    title: 'Para uma apresentação mais objetiva',
    description: 'Em vez de explicar o mesmo evento de forma genérica, você passa a falar com cada público usando a mensagem certa.',
  },
];

const stats = [
  { value: 500, suffix: '+', label: 'participantes esperados para 2026', icon: '👥', delay: 0 },
  { value: 48, suffix: 'h', label: 'de hackathon como eixo de ativação', icon: '⚡', delay: 0.1 },
  { value: 3, suffix: '', label: 'grandes frentes de conteúdo e mercado', icon: '🧠', delay: 0.2 },
  { value: 1, suffix: ' ecossistema', label: 'conectando campus, empresas e comunidade', icon: '🌐', delay: 0.3 },
];

const highlights = [
  {
    tag: 'Jornada 01',
    icon: '🎙️',
    title: 'Página para palestrantes',
    description: 'Mostra por que vale estar no palco da TechWeek, quais temas fazem sentido para a curadoria e como sua contribuição encontra um público pronto para aplicar conhecimento.',
    accent: '#00FF00',
  },
  {
    tag: 'Jornada 02',
    icon: '🎓',
    title: 'Página para participantes',
    description: 'Traduz a edição 2026 como experiência de carreira, repertório e networking para quem quer aprender com profundidade e sair mais perto do mercado.',
    accent: '#00BF63',
  },
];

export default function HomePage() {
  return (
    <>
      <NavBar links={navLinks} cta={{ label: 'Abrir página de palestrantes', href: '?audience=speakers' }} />
      <main>
        <Hero
          tag={'> 13 a 18 de outubro de 2026 — Francisco Beltrão, PR'}
          titleLines={[
            'TechWeek 2026 para',
            'quem sobe ao palco',
            'e para quem quer viver a experiência',
          ]}
          subtitle="A edição 2026 agora tem duas jornadas de apresentação: uma focada em possíveis palestrantes e outra pensada para aquecer futuros participantes com contexto, desejo e direção clara."
          actions={[
            { label: 'Ver página para palestrantes', href: '?audience=speakers', variant: 'primary' },
            { label: 'Ver página para participantes', href: '?audience=participants', variant: 'secondary' },
          ]}
          pills={['Palestrantes', 'Participantes', 'Trilhas em tecnologia', 'Hackathon 48h']}
        />

        <Vision
          id="journeys"
          tag="// 01 — Duas Jornadas"
          title="O Mesmo Evento, Duas Conversas Diferentes"
          subtitle="A TechWeek continua uma só, mas a forma de apresentá-la agora respeita o que cada público precisa enxergar primeiro."
          pillars={pillars}
          quote="Essa nova estrutura facilita apresentação comercial, institucional e acadêmica sem depender de explicação paralela. Cada página passa a defender melhor o mesmo evento."
        />

        <Numbers
          id="numbers"
          tag="// 02 — Panorama"
          title="O Tamanho da Oportunidade em 2026"
          subtitle="Os principais elementos da edição aparecem aqui como contexto comum para qualquer conversa sobre a TechWeek."
          stats={stats}
        />

        <Highlights
          id="highlights"
          tag="// 03 — Escolha o Caminho"
          title="Páginas Prontas Para Cada Público"
          subtitle="Você pode apresentar a edição a partir da visão de palco ou da visão de experiência, sem misturar objetivos."
          highlights={highlights}
        />

        <Contact audience="general" />
      </main>
      <FooterSection
        sections={[
          ['#journeys', 'Jornadas'],
          ['#numbers', 'Panorama'],
          ['#highlights', 'Páginas'],
          ['#contact', 'Contato'],
        ]}
      />
    </>
  );
}