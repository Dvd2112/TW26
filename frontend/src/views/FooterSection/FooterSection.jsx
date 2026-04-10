import styles from './FooterSection.module.css';

const defaultSections = [
  ['#journeys', 'Jornadas'],
  ['#highlights', 'Destaques'],
  ['#contact', 'Contato'],
];

const defaultQuickLinks = [
  ['?audience=speakers', 'Página para palestrantes'],
  ['?audience=participants', 'Página para participantes'],
];

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
            <span className={styles.logoNeon}>Tech</span>Week
            <span className={styles.logoYear}> 2026</span>
            <p className={styles.tagline}>
              {tagline}
            </p>
          </div>

          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>📅 Data</span>
              <span className={styles.infoValue}>13 a 18 de Outubro de 2026</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>📍 Local</span>
              <span className={styles.infoValue}>Francisco Beltrão, Paraná</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>📧 Contato</span>
              <a href={`mailto:${contactEmail}`} className={styles.infoLink}>
                {contactEmail}
              </a>
            </div>
          </div>

          <nav className={styles.nav}>
            <span className={styles.navTitle}>Seções</span>
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

        <div className={styles.footerActions}>
          <a href="?audience=participants" className={styles.footerBtn}>
            Ir para Participantes
          </a>
          <a href="?audience=speakers" className={styles.footerBtn}>
            Ir para Patrocinadores
          </a>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © 2026 TechWeek. Comitê Organizador — UTFPR Francisco Beltrão.
          </p>
          <p className={styles.built}>
            <span style={{ color: '#00BF63' }}>{'</>'}</span> Feito com React + Ant Design
          </p>
        </div>
      </div>
    </footer>
  );
}
