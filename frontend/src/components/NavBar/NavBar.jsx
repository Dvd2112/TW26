import { useState, useEffect } from 'react';
import { Button } from 'antd';
import styles from './NavBar.module.css';

const links = [
  { label: 'Visão', href: '#vision' },
  { label: 'Números', href: '#numbers' },
  { label: 'Patrocinadores', href: '#sponsors' },
  { label: 'Destaques', href: '#highlights' },
  { label: 'Cotas', href: '#tiers' },
  { label: 'Contato', href: '#contact' },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <a href="#hero" className={styles.logo}>
          <span className={styles.logoNeon}>Tech</span>Week
          <span className={styles.logoYear}> 2026</span>
        </a>

        <ul className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setMenuOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
          <li className={styles.mobileCtaItem}>
            <a href="#contact" onClick={() => setMenuOpen(false)} className={styles.mobileCta}>
              Quero Patrocinar
            </a>
          </li>
        </ul>

        <a href="#contact">
          <Button
            type="primary"
            className={styles.cta}
            style={{
              background: '#00FF00',
              color: '#000',
              border: 'none',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            Quero Patrocinar
          </Button>
        </a>

        <button
          className={styles.burger}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}
