import SectionTitle from '../../components/SectionTitle/SectionTitle';
import StatCard from '../../components/StatCard/StatCard';
import styles from './Numbers.module.css';

const defaultStats = [
  { value: 300, suffix: '+', label: 'Participantes na última edição\n(+150% em relação à edição anterior)', icon: '👥', delay: 0 },
  { value: 90, suffix: '%', label: 'Taxa de comparecimento\n270 presentes no evento', icon: '✅', delay: 0.1 },
  { value: 40, suffix: 'h', label: 'Horas de imersão total\n16h evento + 24h Hackathon', icon: '⏱️', delay: 0.2 },
  { value: 100, suffix: 'k+', label: 'Visualizações orgânicas\nem apenas 60 dias', icon: '👁️', delay: 0.3 },
  { value: 14, suffix: 'k', label: 'Contas alcançadas\norganicamente nas redes', icon: '📡', delay: 0.4 },
  { value: 500, suffix: '', label: 'Participantes esperados\nem 2026', icon: '🎯', delay: 0.5 },
];

export default function Numbers({
  id = 'numbers',
  tag = '// 02 — Performance Comprovada',
  title = 'O Sucesso em Números',
  subtitle = 'Os resultados da última edição não são apenas estatísticas — são provas de tração e eficiência operacional.',
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
