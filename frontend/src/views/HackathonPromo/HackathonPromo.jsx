import { motion } from 'framer-motion';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/HackathonPromo.module.css';

/**
 * Seção de destaque do Hackathon na home: descrição longa, ficha rápida
 * (details), regras de valor (notes, vindas da configuração do admin) e CTA.
 */
export default function HackathonPromo({
  id = 'hackathon',
  tag,
  title,
  brand,
  subtitle,
  paragraphs = [],
  details = [],
  steps = [],
  status,
  notes = [],
  cta,
}) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.wrapper}>
        <SectionTitle
          tag={tag}
          title={(
            <>
              <span className={styles.titleAccent}>{title}</span>
              {brand && <span className={styles.titleBrand}>{brand}</span>}
            </>
          )}
          subtitle={subtitle}
          center
        />

        <div className={styles.layout}>
          <motion.div
            className={styles.text}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            {paragraphs.map((p) => <p key={p}>{p}</p>)}

            {steps.length > 0 && (
              <ol className={styles.steps}>
                {steps.map((s) => (
                  <li key={s.title}>
                    <strong>{s.title}</strong>
                    <span>{s.desc}</span>
                  </li>
                ))}
              </ol>
            )}
          </motion.div>

          <motion.aside
            className={styles.panel}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {status && <span className={`${styles.status} ${status.open ? styles.open : ''}`}>{status.label}</span>}

            <ul className={styles.details}>
              {details.map((d) => (
                <li key={d.label}>
                  <span className={styles.detailIcon}>{d.icon}</span>
                  <span>
                    <span className={styles.detailLabel}>{d.label}</span>
                    <span className={styles.detailValue}>{d.value}</span>
                  </span>
                </li>
              ))}
            </ul>

            {notes.length > 0 && (
              <ul className={styles.notes}>
                {notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}

            {cta && <a href={cta.href} className={styles.cta}>{cta.label}</a>}
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
