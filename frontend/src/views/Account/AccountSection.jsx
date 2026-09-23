import { motion } from 'framer-motion';
import styles from '../../styles/Account.module.css';

export default function AccountSection({ children, center }) {
  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={center ? { display: 'flex', flexDirection: 'column', alignItems: 'center' } : undefined}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
