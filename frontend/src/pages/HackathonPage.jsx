import NavBar from '../components/NavBar/NavBar';
import Hackathon from '../views/Hackathon/Hackathon';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Oficinas', href: '?page=oficinas' },
];

export default function HackathonPage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <Hackathon
        tag="// Hackathon 48h"
        title="Inscrição do Hackathon"
        subtitle="Monte sua equipe, convide os integrantes e garanta a vaga no Hackathon da TechWeek 2026 (17 e 18 de outubro)."
      />
      <FooterSection />
    </>
  );
}
