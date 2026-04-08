import { motion } from 'framer-motion';
import { Button } from 'antd';
import styles from './Hero.module.css';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: 'easeOut' },
});

export default function Hero({
  id = 'hero',
  tag,
  titleLines = [],
  highlightLine = 1,
  subtitle,
  actions = [],
  pills = [],
  showScrollIndicator = true,
}) {
  return (
    <section id={id} className={styles.section}>
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
        {tag && (
          <motion.span className={styles.tag} {...fadeUp(0)}>
            {tag}
          </motion.span>
        )}

        <motion.h1 className={styles.title} {...fadeUp(0.15)}>
          {titleLines.map((line, index) => (
            <span key={line}>
              {index === highlightLine ? <span className={styles.neon}>{line}</span> : line}
              {index < titleLines.length - 1 && <br />}
            </span>
          ))}
        </motion.h1>

        {subtitle && (
          <motion.p className={styles.subtitle} {...fadeUp(0.3)}>
            {subtitle}
          </motion.p>
        )}

        {actions.length > 0 && (
          <motion.div className={styles.actions} {...fadeUp(0.45)}>
            {actions.map((action) => (
              <a key={action.label} href={action.href}>
                <Button
                  type={action.variant === 'primary' ? 'primary' : 'default'}
                  size="large"
                  style={action.variant === 'primary'
                    ? {
                      background: '#00FF00',
                      color: '#000',
                      border: 'none',
                      fontWeight: 700,
                      height: 52,
                      padding: '0 36px',
                      fontSize: '1rem',
                      letterSpacing: '0.04em',
                      borderRadius: 4,
                    }
                    : {
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
                  {action.label}
                </Button>
              </a>
            ))}
          </motion.div>
        )}

        {pills.length > 0 && (
          <motion.div className={styles.pills} {...fadeUp(0.6)}>
            {pills.map((p) => (
            <span key={p} className={styles.pill}>{p}</span>
            ))}
          </motion.div>
        )}
      </div>

      {showScrollIndicator && (
        <div className={styles.scrollIndicator}>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            className={styles.mouse}
          >
            <div className={styles.wheel} />
          </motion.div>
        </div>
      )}
    </section>
  );
}
