import NavBar from '../components/NavBar/NavBar';
import Oficinas from '../views/Oficinas/Oficinas';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Minha Conta', href: '?page=conta' },
];

export default function OficinasPage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <Oficinas />
      <FooterSection />
    </>
  );
}