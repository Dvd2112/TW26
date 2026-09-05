import NavBar from '../components/NavBar/NavBar';
import Admin from '../views/Admin/Admin';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Oficinas', href: '?page=oficinas' },
  { label: 'Sair', href: '?page=login' },
];

export default function AdminPage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <Admin />
      <FooterSection />
    </>
  );
}