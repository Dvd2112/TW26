import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Highlights.module.css';

const defaultHighlights = [
  {
    tag: 'Nível Executivo',
    icon: '🌍',
    title: 'Speakers de Calibre Global',
    description:
      'Trazemos o mundo para o Sudoeste. Contamos com a expertise de líderes como Julien Decultot (CFO da LVMH) e referências regionais como Renan Bisato (COO da CISS S.A.).',
    accent: '#8A00C4',
  },
  {
    tag: 'Hands-on',
    icon: '💻',
    title: 'Conteúdo 100% Prático',
    description:
      'Oficinas de alta demanda esgotadas em horas. "GitHub para Gestão de Projetos" atingiu 100% de ocupação. Aprendizado que vai direto para o mercado.',
    accent: '#BF40FF',
  },
  {
    tag: 'Tecnologia & Sociedade',
    icon: '🔒',
    title: 'Debates que Importam',
    description:
      'Discussões disruptivas com a Polícia Penal sobre uso de tecnologia no setor público, unindo ética, segurança e inovação em uma mesa única.',
    accent: '#BF40FF',
  },
  {
    tag: 'Hackathon 48h',
    icon: '⚡',
    title: 'Maratona de Inovação',
    description:
      'Em 2026, 48h ininterruptas de desenvolvimento. Times resolvem desafios reais propostos por empresas parceiras. Recrutamento acontece em tempo real.',
    accent: '#8A00C4',
  },
];

export default function Highlights({
  id = 'highlights',
  tag = '// 04 – Highlights',
  title = 'Onde a Inovação Acontece',
  subtitle = 'O que tornou a TechWeek um marco no calendário regional e o que tornará 2026 ainda maior.',
  highlights = defaultHighlights,
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id={id} className={styles.section}>
      <div className={styles.wrapper}>
        <SectionTitle
          tag={tag}
          title={title}
          subtitle={subtitle}
        />

        <div ref={ref} className={styles.grid}>
          {highlights.map((h, i) => (
            <motion.div
              key={h.title}
              className={styles.card}
              style={{ '--accent': h.accent }}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 }}
            >
              <div className={styles.topBar} />
              <span className={styles.cardTag}>{h.tag}</span>
              <span className={styles.cardIcon}>{h.icon}</span>
              <h3 className={styles.cardTitle}>{h.title}</h3>
              <p className={styles.cardDesc}>{h.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

