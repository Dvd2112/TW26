import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from './Sponsors.module.css';

const sponsorGroups = [
  {
    category: 'Patrocinadores Master',
    sponsors: ['Cresol', 'CISS S.A.', 'DEZ Telecom', 'Megasult', 'Maxis Card'],
  },
  {
    category: 'Apoio Técnico e Governamental',
    sponsors: ['SEBRAE', 'Prefeitura de Francisco Beltrão', 'Sudovalley & Dev Paraná', 'Sec. de Ciência e Tecnologia'],
  },
  {
    category: 'Instituições de Ensino',
    sponsors: ['UTFPR', 'CESUL', 'UNIPAR'],
  },
];

export default function Sponsors() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="sponsors" className={styles.section}>
      <div className={styles.wrapper}>
        <SectionTitle
          tag="// 03 — Chancelas de Sucesso"
          title="Quem Caminha Conosco"
          subtitle="Sua marca estará acompanhada pelos líderes que movem a economia e a tecnologia da região."
          center
        />

        <div ref={ref} className={styles.groups}>
          {sponsorGroups.map((group, gi) => (
            <motion.div
              key={group.category}
              className={styles.groupBlock}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: gi * 0.15 }}
            >
              <h3 className={styles.groupTitle}>{group.category}</h3>
              <div className={styles.logoGrid}>
                {group.sponsors.map((name, si) => (
                  <motion.div
                    key={name}
                    className={styles.logoCard}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.35, delay: gi * 0.15 + si * 0.07 }}
                  >
                    <span className={styles.logoName}>{name}</span>
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
