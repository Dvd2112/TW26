import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Sponsors.module.css';

export default function Sponsors({ id, tag, title, subtitle, tiers = [] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id={id} className={styles.section}>
      <div className={styles.wrapper}>
        <SectionTitle tag={tag} title={title} subtitle={subtitle} center />

        <div ref={ref} className={styles.groups}>
          {tiers.filter((tier) => tier.sponsors.length > 0).map((tier, gi) => (
            <motion.div
              key={tier.name}
              className={styles.groupBlock}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: gi * 0.15 }}
            >
              <div className={styles.groupHeader}>
                <span className={styles.medal} style={{ color: tier.color }}>{tier.medal}</span>
                <h3 className={styles.groupTitle} style={{ color: tier.color }}>{tier.name}</h3>
              </div>

              <div className={styles.logoGrid}>
                {tier.sponsors.map((sponsor, si) => (
                  <motion.div
                    key={sponsor.name}
                    className={`${styles.logoCard} ${styles[`logoCard-${tier.size}`] || ''}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.35, delay: gi * 0.15 + si * 0.07 }}
                  >
                    <img
                      className={`${styles.logoImg} ${styles[`logoImg-${tier.size}`] || ''}`}
                      src={sponsor.logo}
                      alt={sponsor.name}
                      loading="lazy"
                    />
                    <span className={styles.logoName}>{sponsor.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
