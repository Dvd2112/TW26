import styles from '../../styles/FooterSection.module.css';
import logoHorizontalNegativo from '../../assets/TW26 BRANCO/tw26-logo-horizontal-negativo.png';

const defaultSections = [
  ['#journeys', 'Jornadas'],
  ['#highlights', 'Destaques'],
  ['#contact', 'Contato'],
];

const defaultQuickLinks = [];

export default function FooterSection({
  sections = defaultSections,
  quickLinks = defaultQuickLinks,
  contactEmail = 'david.junior211204@gmail.com',
  tagline = 'Conectando Talentos, Tecnologia e o Futuro do Sudoeste',
}) {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrapper}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <img src={logoHorizontalNegativo} alt="TechWeek 2026" className={styles.brandLogo} />
            <p className={styles.tagline}>
              {tagline}
            </p>
          </div>

          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Data</span>
              <span className={styles.infoValue}>13 a 18 de Outubro de 2026</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Local</span>
              <span className={styles.infoValue}>Francisco Beltrao, Parana</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Contato</span>
              <a href={`mailto:${contactEmail}`} className={styles.infoLink}>
                {contactEmail}
              </a>
            </div>
          </div>

          <nav className={styles.nav}>
            <span className={styles.navTitle}>Secoes</span>
            {sections.map(([href, label]) => (
              <a key={href} href={href} className={styles.navLink}>{label}</a>
            ))}
            {quickLinks.length > 0 && <span className={styles.navTitle}>Jornadas</span>}
            {quickLinks.map(([href, label]) => (
              <a key={href} href={href} className={styles.navLink}>{label}</a>
            ))}
          </nav>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © 2026 TechWeek. Comite Organizador - UTFPR Francisco Beltrao.
          </p>
          <p className={styles.built}>
            <span style={{ color: '#BF40FF' }}>{'</>'}</span> Feito com React + Ant Design
          </p>
        </div>
      </div>
    </footer>
  );
}

