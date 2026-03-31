import styles from './FooterSection.module.css';

export default function FooterSection() {
  return (
    <footer className={styles.footer}>
      <div className={styles.wrapper}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.logoNeon}>Tech</span>Week
            <span className={styles.logoYear}> 2026</span>
            <p className={styles.tagline}>
              Conectando Talentos, Tecnologia e o Futuro do Sudoeste
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
              <a href="mailto:david.junior211204@gmail.com" className={styles.infoLink}>
                david.junior211204@gmail.com
              </a>
            </div>
          </div>

          <nav className={styles.nav}>
            <span className={styles.navTitle}>Seções</span>
            {[
              ['#vision', 'A Visão'],
              ['#numbers', 'Números'],
              ['#sponsors', 'Patrocinadores'],
              ['#highlights', 'Destaques'],
              ['#tiers', 'Cotas'],
              ['#contact', 'Contato'],
            ].map(([href, label]) => (
              <a key={href} href={href} className={styles.navLink}>{label}</a>
            ))}
          </nav>
        </div>

        <div className={styles.divider} />

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
