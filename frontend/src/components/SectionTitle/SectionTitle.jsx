import styles from './SectionTitle.module.css';

export default function SectionTitle({ tag, title, subtitle, center = false }) {
  return (
    <div className={`${styles.wrapper} ${center ? styles.center : ''}`}>
      {tag && <span className={styles.tag}>{tag}</span>}
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <div className={styles.divider} />
    </div>
  );
}
