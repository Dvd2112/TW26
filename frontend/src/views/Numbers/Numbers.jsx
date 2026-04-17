import SectionTitle from '../../components/SectionTitle/SectionTitle';
import StatCard from '../../components/StatCard/StatCard';
import styles from '../../styles/Numbers.module.css';

const defaultStats = [
  { value: 300, suffix: '+', label: 'Participantes na ï¿½ltima ediï¿½ï¿½o\n(+150% em relaï¿½ï¿½o ï¿½ ediï¿½ï¿½o anterior)', icon: '??', delay: 0 },
  { value: 90, suffix: '%', label: 'Taxa de comparecimento\n270 presentes no evento', icon: '?', delay: 0.1 },
  { value: 40, suffix: 'h', label: 'Horas de imersï¿½o total\n16h evento + 24h Hackathon', icon: '??', delay: 0.2 },
  { value: 100, suffix: 'k+', label: 'Visualizaï¿½ï¿½es orgï¿½nicas\nem apenas 60 dias', icon: '???', delay: 0.3 },
  { value: 14, suffix: 'k', label: 'Contas alcanï¿½adas\norganicamente nas redes', icon: '??', delay: 0.4 },
  { value: 500, suffix: '', label: 'Participantes esperados\nem 2026', icon: '??', delay: 0.5 },
];

export default function Numbers({
  id = 'numbers',
  tag = '// 02 ï¿½ Performance Comprovada',
  title = 'O Sucesso em Nï¿½meros',
  subtitle = 'Os resultados da ï¿½ltima ediï¿½ï¿½o nï¿½o sï¿½o apenas estatï¿½sticas ï¿½ sï¿½o provas de traï¿½ï¿½o e eficiï¿½ncia operacional.',
  stats = defaultStats,
}) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.wrapper}>
        <SectionTitle
          tag={tag}
          title={title}
          subtitle={subtitle}
        />

        <div className={styles.grid}>
          {stats.map((s) => (
            <StatCard
              key={s.label}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              icon={s.icon}
              delay={s.delay}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
