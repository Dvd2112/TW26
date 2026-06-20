import NavBar from '../components/NavBar/NavBar';
import Register from '../views/Register/Register';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Edição 2026', href: './#edition2026' },
  { label: 'Destaques', href: './#highlights' },
];

export default function RegisterPage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <Register />
      <FooterSection />
    </>
  );
}
