import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Statistic } from 'antd';
import styles from '../../styles/StatCard.module.css';

export default function StatCard({ value, suffix, prefix, label, icon, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      className={styles.card}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {icon && <div className={styles.icon}>{icon}</div>}
      <Statistic
        value={value}
        suffix={suffix}
        prefix={prefix}
        valueStyle={{ color: '#8A00C4', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 2.8rem)', lineHeight: 1.1 }}
      />
      <p className={styles.label}>{label}</p>
    </motion.div>
  );
}

