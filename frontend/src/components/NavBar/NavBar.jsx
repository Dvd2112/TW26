import { useState, useEffect } from 'react';
import { Button } from 'antd';
import axios from 'axios';
import styles from '../../styles/NavBar.module.css';
import logoHorizontalNegativo from '../../assets/TW26 HORIZONTAL/TW26 navbar icon.png';

const defaultLinks = [
  { label: 'Jornadas', href: '#journeys' },
  { label: 'Destaques', href: '#highlights' },
  { label: 'Contato', href: '#contact' },
];

export default function NavBar({
  links = defaultLinks,
  cta = { label: 'Falar com a organização', href: '#contact' },
  logoHref = './',
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [auth, setAuth] = useState({ user: null, isAdmin: false });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);

    axios
      .get('/TW26/backend/api/me.php')
      .then((res) => setAuth({ user: res.data?.user ?? null, isAdmin: Boolean(res.data?.is_admin) }))
      .catch(() => {});

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <a href={logoHref} className={styles.logo}>
          <img src={logoHorizontalNegativo} alt="TechWeek 2026" className={styles.logoImage} />
        </a>

        <ul className={`${styles.links} ${menuOpen ? styles.open : ''}`}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={closeMenu}>
                {l.label}
              </a>
            </li>
          ))}

          {!auth.user && (
            <li className={styles.mobileCtaItem}>
              <a href="?page=login" onClick={closeMenu} className={styles.mobileCta}>
                Entrar
              </a>
            </li>
          )}
          {auth.user && (
            <>
              {auth.isAdmin && (
                <li className={styles.mobileCtaItem}>
                  <a href="?page=admin" onClick={closeMenu} className={styles.mobileCta}>
                    Painel Admin
                  </a>
                </li>
              )}
              <li className={styles.mobileCtaItem}>
                <a href="?page=conta" onClick={closeMenu} className={styles.mobileCta}>
                  Minha conta
                </a>
              </li>
            </>
          )}
          {cta && (
            <li className={styles.mobileCtaItem}>
              <a href={cta.href} onClick={closeMenu} className={styles.mobileCta}>
                {cta.label}
              </a>
            </li>
          )}
        </ul>

        <div className={styles.actions}>
          {!auth.user ? (
            <a href="?page=login">
              <Button className={styles.ctaGhost}>Entrar</Button>
            </a>
          ) : (
            <>
              {auth.isAdmin && (
                <a href="?page=admin">
                  <Button className={styles.ctaGhost}>Painel Admin</Button>
                </a>
              )}
              <a href="?page=conta">
                <Button className={styles.ctaGhost}>Minha conta</Button>
              </a>
            </>
          )}

          {cta && (
            <a href={cta.href}>
              <Button
                type="primary"
                className={styles.cta}
                style={{
                  background: '#8A00C4',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                {cta.label}
              </Button>
            </a>
          )}
        </div>

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