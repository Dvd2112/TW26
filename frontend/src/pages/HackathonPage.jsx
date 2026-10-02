import NavBar from '../components/NavBar/NavBar';
import Hackathon from '../views/Hackathon/Hackathon';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Oficinas', href: '?page=oficinas' },
];

const ideathonInfo = [
  'Seja bem-vindo(a) ao Ideathon da Jornada GovTech! 🚀 Este é um evento de ideação focado em desenvolver soluções inovadoras para problemas reais do poder público de Francisco Beltrão.',
  'Formato de inscrição: por equipe, de 3 a 6 integrantes. A equipe deve contar obrigatoriamente com pelo menos uma pessoa de outro curso ou de outra instituição de ensino/organização.',
  'Local dos encontros: Sebrae Francisco Beltrão — Rua Ponta Grossa, 2509, Centro, Francisco Beltrão - PR.',
  'Cronograma: sábado (17/10), presencial das 08h às 18h; domingo (18/10), presencial das 13h às 18h; segunda-feira (26/10), banca de apresentação dos projetos (pitchs), junto à abertura da Semana Municipal de Ciência, Tecnologia e Inovação.',
];

export default function HackathonPage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <Hackathon
        tag="// Ideathon - Jornada GovTech"
        title="Inscrição para Ideathon - Jornada GovTech | Francisco Beltrão"
        subtitle="Preencha os campos abaixo para garantir a vaga da sua equipe."
        information={ideathonInfo}
      />
      <FooterSection />
    </>
  );
}
