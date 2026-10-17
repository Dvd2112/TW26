import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../../styles/DayCarousel.module.css';

const AUTO_ROTATE_MS = 8000;

const pad = (n) => String(n).padStart(2, '0');

function dayKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Agrupa por dia de início (ordem cronológica); atividades sem data vão para o fim. */
function groupByDay(activities) {
  const groups = new Map();
  [...activities]
    .sort((a, b) => (a.start_at ? new Date(a.start_at) : Infinity) - (b.start_at ? new Date(b.start_at) : Infinity))
    .forEach((activity) => {
      const key = activity.start_at ? dayKey(activity.start_at) : 'tbd';
      if (!groups.has(key)) {
        const date = activity.start_at ? new Date(activity.start_at) : null;
        groups.set(key, {
          key,
          weekday: date ? capitalize(date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')) : 'A definir',
          short: date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--',
          label: date ? capitalize(date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })) : 'Data a definir',
          items: [],
        });
      }
      groups.get(key).items.push(activity);
    });
  return [...groups.values()];
}

/**
 * Carrossel por dia: abas clicáveis (uma por dia), setas e rotação automática
 * entre os dias (pausa ao interagir). `renderCard(activity, index)` desenha cada card.
 */
export default function DayCarousel({ activities, renderCard, interval = AUTO_ROTATE_MS }) {
  const days = useMemo(() => groupByDay(activities), [activities]);
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const count = days.length;
  const current = Math.min(active, Math.max(count - 1, 0));

  const goTo = (index) => {
    setDirection(index >= current ? 1 : -1);
    setActive(index);
  };
  const step = (delta) => goTo((current + delta + count) % count);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    const timer = setTimeout(() => {
      setDirection(1);
      setActive((current + 1) % count);
    }, interval);
    return () => clearTimeout(timer);
  }, [current, count, paused, interval]);

  if (count === 0) return null;
  const day = days[current];

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className={styles.tabsRow}>
        {count > 1 && (
          <button type="button" className={styles.arrow} aria-label="Dia anterior" onClick={() => step(-1)}>‹</button>
        )}
        <div className={styles.tabs} role="tablist">
          {days.map((d, i) => (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={i === current}
              className={`${styles.tab} ${i === current ? styles.tabActive : ''}`}
              onClick={() => goTo(i)}
            >
              <span className={styles.tabWeekday}>{d.weekday}</span>
              <span className={styles.tabDate}>{d.short}</span>
            </button>
          ))}
        </div>
        {count > 1 && (
          <button type="button" className={styles.arrow} aria-label="Próximo dia" onClick={() => step(1)}>›</button>
        )}
      </div>

      <h3 className={styles.dayHeading}>
        {day.label}
        <span className={styles.dayCount}>
          {day.items.length} {day.items.length === 1 ? 'atividade' : 'atividades'}
        </span>
      </h3>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={day.key}
          className={styles.grid}
          initial={{ opacity: 0, x: 40 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 * direction }}
          transition={{ duration: 0.3 }}
        >
          {day.items.map((activity, i) => renderCard(activity, i))}
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <div className={styles.dots}>
          {days.map((d, i) => (
            <span key={d.key} className={`${styles.dot} ${i === current ? styles.dotActive : ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}
