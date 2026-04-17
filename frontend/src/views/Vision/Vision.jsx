import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Vision.module.css';

const defaultPillars = [
  {
    icon: '??',
    title: 'Inteligï¿½ncia Artificial',
    description:
      'Palestras e workshops prï¿½ticos com profissionais que aplicam IA no mercado real. Do conceito ao deploy.',
  },
  {
    icon: '??',
    title: 'Games & Entretenimento Digital',
    description:
      'Novo curso, nova vertical. O universo de games como vetor de inovaï¿½ï¿½o, criatividade e negï¿½cios.',
  },
  {
    icon: '??',
    title: 'Sustentabilidade & ESG',
    description:
      'Tecnologia Verde como diferencial competitivo. Empresas que lideram a agenda ESG constroem o amanhï¿½ hoje.',
  },
];

export default function Vision({
  id = 'vision',
  tag = '// 01 ï¿½ A Visï¿½o',
  title = 'Onde a Inovaï¿½ï¿½o Encontra o Mercado',
  subtitle = 'Mais do que um evento acadï¿½mico, somos a ponte estratï¿½gica entre a formaï¿½ï¿½o de talentos de elite e as demandas reais do mercado de trabalho no Sudoeste do Paranï¿½.',
  pillars = defaultPillars,
  quote = 'Em 2026, nossa missï¿½o se expande. Criamos um ecossistema de alto impacto para marcas que desejam liderar a transformaï¿½ï¿½o digital e garantir o top of mind perante a nova geraï¿½ï¿½o de decisores.',
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id={id} className={styles.section}>
      <div className={styles.wrapper}>
        <SectionTitle
          tag={tag}
          title={title}
          subtitle={subtitle}
        />

        <div ref={ref} className={styles.grid}>
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              className={styles.card}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              <span className={styles.icon}>{p.icon}</span>
              <h3 className={styles.cardTitle}>{p.title}</h3>
              <p className={styles.cardDesc}>{p.description}</p>
            </motion.div>
          ))}
        </div>

        {quote && (
          <motion.blockquote
            className={styles.quote}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <span className={styles.quoteBar} />
            {quote}
          </motion.blockquote>
        )}
      </div>
    </section>
  );
}
