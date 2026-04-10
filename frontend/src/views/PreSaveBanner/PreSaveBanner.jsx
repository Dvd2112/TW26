import { motion } from 'framer-motion';
import { Button } from 'antd';
import styles from './PreSaveBanner.module.css';

export default function PreSaveBanner({ registerHref = '?page=register' }) {
  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={styles.gridLine} />
        ))}
      </div>
      <div className={styles.glow} />

      <div className={styles.inner}>
        <motion.span
          className={styles.tag}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          // Pré-Save 2026
        </motion.span>

        <motion.h2
          className={styles.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Venha viver a <span className={styles.neon}>TechWeek.</span>
        </motion.h2>

        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Experiencie tecnologia que conecta mentes, desafia limites e transforma
          trajetórias em uma semana de conteúdo, rede e intensidade prática.
          A sua vaga começa aqui.
        </motion.p>

        <motion.div
          className={styles.pills}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {['Talks', 'Workshops', 'Hackathon 48h', 'Networking', 'Carreira'].map((p) => (
            <span key={p} className={styles.pill}>{p}</span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <a href={registerHref}>
            <Button
              type="primary"
              size="large"
              className={styles.cta}
              style={{
                background: '#00FF00',
                color: '#000',
                border: 'none',
                fontWeight: 800,
                letterSpacing: '0.07em',
                height: 52,
                padding: '0 40px',
                fontSize: '0.95rem',
              }}
            >
              Garantir minha vaga — Pré-Save
            </Button>
          </a>
        </motion.div>

        <motion.p
          className={styles.note}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          Leva menos de 2 minutos. Você recebe as novidades antes de todo mundo.
        </motion.p>
      </div>
    </section>
  );
}
