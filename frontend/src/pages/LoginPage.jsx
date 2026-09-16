import NavBar from '../components/NavBar/NavBar';
import Login from '../views/Login/Login';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Edição 2026', href: './#edition2026' },
  { label: 'Destaques', href: './#highlights' },
];

export default function LoginPage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <Login />
      <FooterSection />
    </>
  );
}