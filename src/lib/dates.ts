// Datas de lançamento são texto AAAA-MM-DD e meses são AAAA-MM.
// Nada aqui passa por new Date('AAAA-MM-DD'), que seria interpretado em UTC.

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
}

export function monthName(month: string): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1];
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  const year = Math.floor(index / 12);
  const mon = (index % 12) + 1;
  return `${year}-${String(mon).padStart(2, '0')}`;
}

/** Primeiro dia do mês, AAAA-MM-01. */
export function monthStart(month: string): string {
  return `${month}-01`;
}

/** Mês atual pelo relógio local do navegador. */
export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Lista de meses de `from` até `to`, inclusive. */
export function monthRange(from: string, to: string): string[] {
  const months: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m);
  return months;
}

/** Data de hoje pelo relógio local, AAAA-MM-DD. */
export function todayISO(now = new Date()): string {
  return `${currentMonth(now)}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Confere formato e existência da data (ex.: rejeita 31/02). */
export function isValidISODate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const last = new Date(y, m, 0).getDate();
  return m >= 1 && m <= 12 && d >= 1 && d <= last;
}

/** Último dia do mês, AAAA-MM-DD. */
export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
}

/** "2026-09-24T18:55" -> "24/09/2026 18:55". */
export function formatDateTime(value: string): string {
  const [date, time = ''] = value.split('T');
  return `${formatDate(date)} ${time.slice(0, 5)}`.trim();
}
