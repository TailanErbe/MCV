import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../data/labels';
import type {
  Account,
  AccountId,
  DemoData,
  ExpenseCategory,
  IncomeCategory,
  Person,
  Transaction,
} from '../data/types';
import { currentMonth, monthOf, monthRange, monthStart, addMonths } from './dates';

// Fonte única dos cálculos: visão geral, lista e relatório usam estas funções.

export function signedAmount(tx: Transaction): number {
  return tx.kind === 'entrada' ? tx.amountCents : -tx.amountCents;
}

/** Saldo da conta imediatamente antes de `date` (AAAA-MM-DD, exclusiva). */
export function balanceBefore(account: Account, transactions: Transaction[], date: string): number {
  return transactions
    .filter((tx) => tx.accountId === account.id && tx.unit === account.unit && tx.date < date)
    .reduce((sum, tx) => sum + signedAmount(tx), account.openingBalanceCents);
}

export function transactionsInMonth(transactions: Transaction[], month: string): Transaction[] {
  return transactions.filter((tx) => monthOf(tx.date) === month);
}

/** Mais recentes primeiro; no mesmo dia, o último registrado aparece antes. */
export function sortRecentFirst(transactions: Transaction[]): Transaction[] {
  return transactions
    .map((tx, index) => ({ tx, index }))
    .sort((a, b) => (a.tx.date === b.tx.date ? b.index - a.index : a.tx.date < b.tx.date ? 1 : -1))
    .map(({ tx }) => tx);
}

export interface PeriodTotals {
  openingCents: number;
  incomeCents: number;
  expenseCents: number;
  closingCents: number;
}

export interface AccountPeriod extends PeriodTotals {
  accountId: AccountId;
  name: string;
}

export interface MonthSummary {
  month: string;
  accounts: AccountPeriod[];
  total: PeriodTotals;
  incomeByCategory: { category: IncomeCategory; cents: number }[];
  expenseByCategory: { category: ExpenseCategory; cents: number }[];
  transactions: Transaction[];
}

export function summarizeMonth(
  accounts: Account[],
  transactions: Transaction[],
  month: string,
): MonthSummary {
  const start = monthStart(month);
  const inMonth = transactionsInMonth(transactions, month);

  const perAccount: AccountPeriod[] = accounts.map((account) => {
    const own = inMonth.filter((tx) => tx.accountId === account.id && tx.unit === account.unit);
    const openingCents = balanceBefore(account, transactions, start);
    const incomeCents = sumOf(own.filter((tx) => tx.kind === 'entrada'));
    const expenseCents = sumOf(own.filter((tx) => tx.kind === 'saida'));
    return {
      accountId: account.id,
      name: account.name,
      openingCents,
      incomeCents,
      expenseCents,
      closingCents: openingCents + incomeCents - expenseCents,
    };
  });

  const total: PeriodTotals = {
    openingCents: sumField(perAccount, 'openingCents'),
    incomeCents: sumField(perAccount, 'incomeCents'),
    expenseCents: sumField(perAccount, 'expenseCents'),
    closingCents: sumField(perAccount, 'closingCents'),
  };

  const incomeByCategory = INCOME_CATEGORIES.map((category) => ({
    category,
    cents: sumOf(inMonth.filter((tx) => tx.kind === 'entrada' && tx.category === category)),
  }));

  const expenseByCategory = EXPENSE_CATEGORIES.map((category) => ({
    category,
    cents: sumOf(inMonth.filter((tx) => tx.kind === 'saida' && tx.category === category)),
  }))
    .filter((row) => row.cents > 0)
    .sort((a, b) => b.cents - a.cents);

  return { month, accounts: perAccount, total, incomeByCategory, expenseByCategory, transactions: inMonth };
}

function sumOf(transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + tx.amountCents, 0);
}

function sumField(rows: PeriodTotals[], field: keyof PeriodTotals): number {
  return rows.reduce((sum, row) => sum + row[field], 0);
}

/** Mês em que a demonstração abre: o mais recente com lançamentos. */
export function defaultMonth(data: DemoData): string {
  const months = data.transactions.map((tx) => monthOf(tx.date)).sort();
  return months[months.length - 1] ?? monthOf(data.openingDate);
}

/** Meses disponíveis para consulta: do início dos dados até o mês atual. */
export function availableMonths(data: DemoData, today = currentMonth()): string[] {
  const months = data.transactions.map((tx) => monthOf(tx.date)).sort();
  const first = [monthOf(data.openingDate), months[0]].filter(Boolean).sort()[0];
  const last = [defaultMonth(data), today].sort()[1];
  // Limite de segurança caso o relógio do aparelho esteja muito adiantado.
  const capped = last > addMonths(first, 36) ? addMonths(first, 36) : last;
  return monthRange(first, capped);
}

/** Texto principal e complementar de uma movimentação na lista. */
export function describeTransaction(
  tx: Transaction,
  peopleById: Map<string, Person>,
): { title: string; detail?: string } {
  if (tx.kind === 'saida') {
    return { title: tx.description, detail: tx.responsible ? `Responsável: ${tx.responsible}` : undefined };
  }
  const person = tx.personId ? peopleById.get(tx.personId) : undefined;
  if (person) return { title: person.name, detail: tx.origin };
  if (tx.category === 'congregacao' && tx.origin) return { title: tx.origin };
  const anonymous = tx.category === 'oferta' || tx.category === 'missoes' ? 'Sem identificação' : undefined;
  return { title: tx.description, detail: tx.origin ?? anonymous };
}

export interface CategoryByAccount {
  category: IncomeCategory | ExpenseCategory;
  byAccount: Record<AccountId, number>;
  totalCents: number;
}

/** Totais de cada categoria separados por conta, para o fechamento mensal. */
export function categoriesByAccount(
  transactions: Transaction[],
  kind: 'entrada' | 'saida',
): CategoryByAccount[] {
  const categories = kind === 'entrada' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories
    .map((category) => {
      const own = transactions.filter((tx) => tx.kind === kind && tx.category === category);
      const byAccount: Record<AccountId, number> = {
        especie: sumOf(own.filter((tx) => tx.accountId === 'especie')),
        sicoob: sumOf(own.filter((tx) => tx.accountId === 'sicoob')),
      };
      return { category, byAccount, totalCents: byAccount.especie + byAccount.sicoob };
    })
    .filter((row) => kind === 'entrada' || row.totalCents > 0);
}

/** Ordem cronológica, como na planilha. */
export function sortChronological(transactions: Transaction[]): Transaction[] {
  return transactions
    .map((tx, index) => ({ tx, index }))
    .sort((a, b) => (a.tx.date === b.tx.date ? a.index - b.index : a.tx.date < b.tx.date ? -1 : 1))
    .map(({ tx }) => tx);
}
