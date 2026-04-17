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
    icon: '??',
    title: 'Para poss?veis palestrantes',
    description: 'Uma narrativa voltada a autoridade, curadoria e ader?ncia editorial para quem pode enriquecer a programa??o da edi??o 2026.',
  },
  {
    icon: '??',
    title: 'Para futuros participantes',
    description: 'Uma jornada pensada para gerar desejo, mostrar trilhas, oportunidades e o tipo de experi?ncia que a TechWeek entrega.',
  },
  {
    icon: '??',
    title: 'Para uma apresenta??o mais objetiva',
    description: 'Em vez de explicar o mesmo evento de forma gen?rica, voc? passa a falar com cada p?blico usando a mensagem certa.',
  },
];

const stats = [
  { value: 500, suffix: '+', label: 'participantes esperados para 2026', icon: '??', delay: 0 },
  { value: 48, suffix: 'h', label: 'de hackathon como eixo de ativa??o', icon: '?', delay: 0.1 },
  { value: 3, suffix: '', label: 'grandes frentes de conte?do e mercado', icon: '??', delay: 0.2 },
  { value: 1, suffix: ' ecossistema', label: 'conectando campus, empresas e comunidade', icon: '??', delay: 0.3 },
];

const highlights = [
  {
    tag: 'Jornada 01',
    icon: '???',
    title: 'P?gina para palestrantes',
    description: 'Mostra por que vale estar no palco da TechWeek, quais temas fazem sentido para a curadoria e como sua contribui??o encontra um p?blico pronto para aplicar conhecimento.',
    accent: '#8A00C4',
  },
  {
    tag: 'Jornada 02',
    icon: '??',
    title: 'P?gina para participantes',
    description: 'Traduz a edi??o 2026 como experi?ncia de carreira, repert?rio e networking para quem quer aprender com profundidade e sair mais perto do mercado.',
    accent: '#BF40FF',
  },
];

export default function HomePage() {
  return (
    <>
      <NavBar links={navLinks} cta={{ label: 'Abrir p?gina de palestrantes', href: '?audience=speakers' }} />
      <main>
        <Hero
          tag={'> 13 a 18 de outubro de 2026 ? Francisco Beltr?o, PR'}
          titleLines={[
            'TechWeek 2026 para',
            'quem sobe ao palco',
            'e para quem quer viver a experi?ncia',
          ]}
          subtitle="A edi??o 2026 agora tem duas jornadas de apresenta??o: uma focada em poss?veis palestrantes e outra pensada para aquecer futuros participantes com contexto, desejo e dire??o clara."
          actions={[
            { label: 'Ver p?gina para palestrantes', href: '?audience=speakers', variant: 'primary' },
            { label: 'Ver p?gina para participantes', href: '?audience=participants', variant: 'secondary' },
          ]}
          pills={['Palestrantes', 'Participantes', 'Trilhas em tecnologia', 'Hackathon 48h']}
        />

        <Vision
          id="journeys"
          tag="// 01 ? Duas Jornadas"
          title="O Mesmo Evento, Duas Conversas Diferentes"
          subtitle="A TechWeek continua uma s?, mas a forma de apresent?-la agora respeita o que cada p?blico precisa enxergar primeiro."
          pillars={pillars}
          quote="Essa nova estrutura facilita apresenta??o comercial, institucional e acad?mica sem depender de explica??o paralela. Cada p?gina passa a defender melhor o mesmo evento."
        />

        <Numbers
          id="numbers"
          tag="// 02 ? Panorama"
          title="O Tamanho da Oportunidade em 2026"
          subtitle="Os principais elementos da edi??o aparecem aqui como contexto comum para qualquer conversa sobre a TechWeek."
          stats={stats}
        />

        <Highlights
          id="highlights"
          tag="// 03 ? Escolha o Caminho"
          title="P?ginas Prontas Para Cada P?blico"
          subtitle="Voc? pode apresentar a edi??o a partir da vis?o de palco ou da vis?o de experi?ncia, sem misturar objetivos."
          highlights={highlights}
        />

        <Contact audience="general" />
      </main>
      <FooterSection
        sections={[
          ['#journeys', 'Jornadas'],
          ['#numbers', 'Panorama'],
          ['#highlights', 'P?ginas'],
          ['#contact', 'Contato'],
        ]}
      />
    </>
  );
}
