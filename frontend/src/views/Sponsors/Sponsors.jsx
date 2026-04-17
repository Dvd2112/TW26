import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Sponsors.module.css';

const sponsorGroups = [
  {
    category: 'Patrocinadores Master',
    sponsors: ['Cresol', 'CISS S.A.', 'DEZ Telecom', 'Megasult', 'Maxis Card'],
  },
  {
    category: 'Apoio Tï¿½cnico e Governamental',
    sponsors: ['SEBRAE', 'Prefeitura de Francisco Beltrï¿½o', 'Sudovalley & Dev Paranï¿½', 'Sec. de Ciï¿½ncia e Tecnologia'],
  },
  {
    category: 'Instituiï¿½ï¿½es de Ensino',
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
          tag="// 03 ï¿½ Chancelas de Sucesso"
          title="Quem Caminha Conosco"
          subtitle="Sua marca estarï¿½ acompanhada pelos lï¿½deres que movem a economia e a tecnologia da regiï¿½o."
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
