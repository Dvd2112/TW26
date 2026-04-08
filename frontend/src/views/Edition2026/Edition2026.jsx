import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from './Edition2026.module.css';

const defaultTimeline = [
  { date: '13–16 Out', label: 'Evento Principal', desc: 'Palestras, workshops, painéis e networking com líderes de tecnologia da região e do Brasil.', icon: '🎤' },
  { date: '16–18 Out', label: 'Hackathon 48h', desc: 'Maratona de desenvolvimento com desafios reais propostos por empresas parceiras. Recrutamento ao vivo.', icon: '💡' },
];

const defaultFacts = [
  { icon: '500', label: 'participantes diretos esperados' },
  { icon: '80%', label: 'estudantes de TI (maioria 18+)' },
  { icon: '2', label: 'verticais novas: Games & ESG' },
  { icon: '48h', label: 'de Hackathon ininterrupto' },
];

export default function Edition2026({
  id = 'edition2026',
  tag = '// 05 — A Próxima Fronteira',
  title = 'TechWeek 2026',
  subtitle = 'A nova edição será itinerante e ainda mais ambiciosa. Com o lançamento do curso de Games/IA, focamos na vertical de Tecnologia Verde (ESG) e entretenimento digital.',
  timeline = defaultTimeline,
  facts = defaultFacts,
  profile = {
    tag: 'Perfil do Público',
    desc: '80% estudantes de TI — jovens talentos em fase de contratação — e decisores da comunidade de inovação. Uma oportunidade única de acesso direto ao maior banco de talentos técnicos da região.',
  },
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

        <div ref={ref} className={styles.layout}>
          <div className={styles.timelineCol}>
            {timeline.map((t, i) => (
              <motion.div
                key={t.label}
                className={styles.timeItem}
                initial={{ opacity: 0, x: -30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.18 }}
              >
                <div className={styles.timeConnector}>
                  <div className={styles.dot} />
                  {i < timeline.length - 1 && <div className={styles.line} />}
                </div>
                <div className={styles.timeContent}>
                  <span className={styles.timeDate}>{t.date}</span>
                  <span className={styles.timeIcon}>{t.icon}</span>
                  <h3 className={styles.timeLabel}>{t.label}</h3>
                  <p className={styles.timeDesc}>{t.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className={styles.factsCol}>
            <div className={styles.factsGrid}>
              {facts.map((f, i) => (
                <motion.div
                  key={f.label}
                  className={styles.factCard}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={inView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                >
                  <span className={styles.factIcon}>{f.icon}</span>
                  <span className={styles.factLabel}>{f.label}</span>
                </motion.div>
              ))}
            </div>

            {profile && (
              <motion.div
                className={styles.profileBox}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.55 }}
              >
                <span className={styles.profileTag}>{profile.tag}</span>
                <p className={styles.profileDesc}>{profile.desc}</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
