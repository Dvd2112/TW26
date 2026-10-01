import NavBar from '../components/NavBar/NavBar';
import ForgotPassword from '../views/ForgotPassword/ForgotPassword';
import FooterSection from '../views/FooterSection/FooterSection';

const navLinks = [
  { label: 'Início', href: './' },
  { label: 'Edição 2026', href: './#edition2026' },
  { label: 'Destaques', href: './#highlights' },
];

const content = {
  tag: '// Recuperar acesso',
  title: 'Recuperar senha',
  subtitleRequest: 'Informe seu CPF e e-mail cadastrados. Enviaremos um código válido por 15 minutos.',
  subtitleReset: 'Digite o código enviado ao seu e-mail e escolha uma nova senha.',
  subtitleDone: 'Tudo certo com a sua conta.',
  successTitle: 'Senha alterada com sucesso!',
  successText: 'Você será redirecionado para o login em instantes.',
  loginLabel: 'Ir para o login',
};

export default function ForgotPasswordPage() {
  return (
    <>
      <NavBar links={navLinks} cta={null} logoHref="./" />
      <ForgotPassword {...content} />
      <FooterSection />
    </>
  );
}
