import NavBar from '../components/NavBar/NavBar';
import Account from '../views/Account/Account';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Oficinas', href: '?page=oficinas' },
  { label: 'Sair', href: '?page=login' },
];

export default function AccountPage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <Account />
      <FooterSection />
    </>
  );
}