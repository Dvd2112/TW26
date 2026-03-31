import { motion } from 'framer-motion';
import { Button } from 'antd';
import styles from './Hero.module.css';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
});

export default function Hero() {
  return (
    <section id="hero" className={styles.section}>
      <div className={styles.grid}>
        <span className={styles.gridLine} />
        <span className={styles.gridLine} />
        <span className={styles.gridLine} />
        <span className={styles.gridLine} />
        <span className={styles.gridLine} />
        <span className={styles.gridLine} />
      </div>

      <div className={styles.glow} />

      <div className={styles.content}>
        <motion.span className={styles.tag} {...fadeUp(0)}>
          {'> 13 a 18 de outubro de 2026 — Francisco Beltrão, PR'}
        </motion.span>

        <motion.h1 className={styles.title} {...fadeUp(0.15)}>
          Conectando Talentos,<br />
          <span className={styles.neon}>Tecnologia</span> e o Futuro<br />
          do Sudoeste
        </motion.h1>

        <motion.p className={styles.subtitle} {...fadeUp(0.3)}>
          A TechWeek 2026 é o epicentro da inovação em Francisco Beltrão.
          500 participantes. 48h de Hackathon. Sua marca no centro da próxima
          geração de líderes de tecnologia.
        </motion.p>

        <motion.div className={styles.actions} {...fadeUp(0.45)}>
          <a href="#contact">
            <Button
              type="primary"
              size="large"
              style={{
                background: '#00FF00',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                height: 52,
                padding: '0 36px',
                fontSize: '1rem',
                letterSpacing: '0.04em',
                borderRadius: 4,
              }}
            >
              Quero Patrocinar
            </Button>
          </a>
          <a href="#tiers">
            <Button
              size="large"
              style={{
                background: 'transparent',
                color: '#00FF00',
                border: '1px solid #00FF00',
                fontWeight: 600,
                height: 52,
                padding: '0 36px',
                fontSize: '1rem',
                borderRadius: 4,
              }}
            >
              Ver Cotas
            </Button>
          </a>
        </motion.div>

        <motion.div className={styles.pills} {...fadeUp(0.6)}>
          {['IA & Machine Learning', 'Games', 'Sustentabilidade & ESG', 'Hackathon 48h'].map((p) => (
            <span key={p} className={styles.pill}>{p}</span>
          ))}
        </motion.div>
      </div>

      <div className={styles.scrollIndicator}>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          className={styles.mouse}
        >
          <div className={styles.wheel} />
        </motion.div>
      </div>
    </section>
  );
}
