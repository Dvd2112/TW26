import dayjs from 'dayjs';

/** Minúsculas e sem acentos, para a busca não depender de "José" vs "jose". */
export const normalizeText = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Filtra linhas por texto livre. `getText(row)` devolve tudo que é pesquisável na linha;
 * a busca com várias palavras exige que todas apareçam (ex.: "maria pago").
 */
export function filterRows(rows, query, getText) {
  const terms = normalizeText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return rows;
  return rows.filter((row) => {
    const haystack = normalizeText(getText(row));
    return terms.every((t) => haystack.includes(t));
  });
}

/** Junta uma data (DatePicker) e um horário (TimePicker), ambos dayjs, num ISO local. */
export function combineDateTime(date, time) {
  if (!date) return null;
  const withTime = time ? date.hour(time.hour()).minute(time.minute()) : date.hour(0).minute(0);
  return withTime.second(0).format('YYYY-MM-DDTHH:mm:ss');
}

/** Formata início/término de uma atividade, cobrindo o caso de virar o dia. */
export function formatActivitySchedule(startAt, endAt) {
  if (!startAt) return '—';
  const start = dayjs(startAt);
  const startLabel = start.format('DD/MM HH:mm');
  if (!endAt) return startLabel;
  const end = dayjs(endAt);
  return start.isSame(end, 'day')
    ? `${startLabel} – ${end.format('HH:mm')}`
    : `${startLabel} até ${end.format('DD/MM HH:mm')}`;
}
