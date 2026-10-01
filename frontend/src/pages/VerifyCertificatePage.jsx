import NavBar from '../components/NavBar/NavBar';
import VerifyCertificate from '../views/VerifyCertificate/VerifyCertificate';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Minha conta', href: '?page=conta' },
  { label: 'Oficinas', href: '?page=oficinas' },
];

export default function VerifyCertificatePage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <VerifyCertificate
        tag="// Certificados"
        title="Verificar certificado"
        subtitle="Digite o código impresso no certificado para confirmar a autenticidade."
      />
      <FooterSection />
    </>
  );
}
