import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from './Vision.module.css';

const defaultPillars = [
  {
    icon: '🤖',
    title: 'Inteligência Artificial',
    description:
      'Palestras e workshops práticos com profissionais que aplicam IA no mercado real. Do conceito ao deploy.',
  },
  {
    icon: '🎮',
    title: 'Games & Entretenimento Digital',
    description:
      'Novo curso, nova vertical. O universo de games como vetor de inovação, criatividade e negócios.',
  },
  {
    icon: '🌱',
    title: 'Sustentabilidade & ESG',
    description:
      'Tecnologia Verde como diferencial competitivo. Empresas que lideram a agenda ESG constroem o amanhã hoje.',
  },
];

export default function Vision({
  id = 'vision',
  tag = '// 01 — A Visão',
  title = 'Onde a Inovação Encontra o Mercado',
  subtitle = 'Mais do que um evento acadêmico, somos a ponte estratégica entre a formação de talentos de elite e as demandas reais do mercado de trabalho no Sudoeste do Paraná.',
  pillars = defaultPillars,
  quote = 'Em 2026, nossa missão se expande. Criamos um ecossistema de alto impacto para marcas que desejam liderar a transformação digital e garantir o top of mind perante a nova geração de decisores.',
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
