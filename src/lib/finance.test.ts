import { describe, expect, it } from 'vitest';
import { createDemoData } from '../data/demo';
import type { Account, Transaction } from '../data/types';
import { formatDate, monthLabel, addMonths, monthEnd } from './dates';
import { formatBRL } from './money';
import { availableMonths, categoriesByAccount, defaultMonth, summarizeMonth } from './finance';

const accounts: Account[] = [
  { unit: 'Sede', id: 'especie', name: 'Dinheiro em espécie', openingBalanceCents: 50000 },
  { unit: 'Sede', id: 'sicoob', name: 'Banco Sicoob', openingBalanceCents: 100000 },
];

function tx(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'kind' | 'date' | 'amountCents' | 'accountId'>): Transaction {
  return { unit: 'Sede', method: 'pix', category: partial.kind === 'entrada' ? 'dizimo' : 'outras', description: 'Teste', ...partial };
}

describe('saldos por conta', () => {
  it('R$ 1.000 + R$ 100 − R$ 30 = R$ 1.070 sem alterar a outra conta', () => {
    const txs = [
      tx({ id: 'a', kind: 'entrada', date: '2026-09-10', amountCents: 10000, accountId: 'sicoob' }),
      tx({ id: 'b', kind: 'saida', date: '2026-09-11', amountCents: 3000, accountId: 'sicoob' }),
    ];
    const summary = summarizeMonth(accounts, txs, '2026-09');
    const sicoob = summary.accounts.find((a) => a.accountId === 'sicoob')!;
    const especie = summary.accounts.find((a) => a.accountId === 'especie')!;
    expect(sicoob.closingCents).toBe(107000);
    expect(especie.closingCents).toBe(50000);
    expect(summary.total.closingCents).toBe(157000);
  });

  it('saldo anterior vem dos meses passados e não conta como entrada do mês', () => {
    const txs = [
      tx({ id: 'a', kind: 'entrada', date: '2026-08-31', amountCents: 20000, accountId: 'especie' }),
      tx({ id: 'b', kind: 'entrada', date: '2026-09-01', amountCents: 5000, accountId: 'especie' }),
    ];
    const sep = summarizeMonth(accounts, txs, '2026-09').accounts.find((a) => a.accountId === 'especie')!;
    expect(sep.openingCents).toBe(70000);
    expect(sep.incomeCents).toBe(5000);
    expect(sep.closingCents).toBe(75000);
  });
});

describe('dados de demonstração', () => {
  const data = createDemoData();

  it('abre no mês mais recente dos lançamentos', () => {
    expect(defaultMonth(data)).toBe('2026-09');
  });

  const sedeAccounts = data.accounts.filter((a) => a.unit === 'Sede');
  const sedeTx = data.transactions.filter((t) => t.unit === 'Sede');

  it('fecha agosto e setembro da sede com os valores esperados', () => {
    const aug = summarizeMonth(sedeAccounts, sedeTx, '2026-08');
    const sep = summarizeMonth(sedeAccounts, sedeTx, '2026-09');
    const closing = (s: typeof aug, id: string) => s.accounts.find((a) => a.accountId === id)!.closingCents;

    expect(closing(aug, 'especie')).toBe(295960);
    expect(closing(aug, 'sicoob')).toBe(1855869);
    expect(closing(sep, 'especie')).toBe(383710);
    expect(closing(sep, 'sicoob')).toBe(1845673);
    expect(sep.total.closingCents).toBe(2229383);
    // Saldo final de agosto é o saldo anterior de setembro.
    expect(sep.total.openingCents).toBe(aug.total.closingCents);
  });

  it('mesmo recebendo todos os lançamentos, cada conta só soma a própria unidade', () => {
    const mixed = summarizeMonth(sedeAccounts, data.transactions, '2026-09');
    expect(mixed.accounts.map((a) => a.closingCents)).toEqual([383710, 1845673]);
  });

  it('cada repasse de congregação corresponde a um recebimento da sede (mesma data e valor)', () => {
    const transfers = data.transactions.filter((t) => t.category === 'repasse_sede');
    const received = sedeTx.filter((t) => t.category === 'congregacao');
    expect(transfers.length).toBe(received.length);
    for (const t of transfers) {
      const match = received.filter((r) => r.date === t.date && r.amountCents === t.amountCents && r.origin === t.unit);
      expect(match.length, `${t.unit} ${t.date}`).toBe(1);
    }
  });

  it('nenhuma conta de congregação fica negativa em agosto e setembro', () => {
    for (const unit of data.congregations.filter((c) => c !== 'Sede')) {
      const accounts = data.accounts.filter((a) => a.unit === unit);
      const txs = data.transactions.filter((t) => t.unit === unit);
      expect(accounts.length).toBe(2);
      for (const month of ['2026-08', '2026-09']) {
        for (const a of summarizeMonth(accounts, txs, month).accounts) expect(a.closingCents).toBeGreaterThan(0);
      }
    }
  });

  it('inclui meses até o mês atual, mesmo sem lançamentos', () => {
    expect(availableMonths(data, '2026-11')).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    expect(availableMonths(data, '2026-01')).toEqual(['2026-08', '2026-09']);
  });
});

describe('formatação', () => {
  it('usa reais e datas brasileiras sem mudar o dia', () => {
    expect(formatBRL(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(formatDate('2026-09-01')).toBe('01/09/2026');
    expect(monthLabel('2026-09')).toBe('setembro de 2026');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
  });
});

describe('fechamento mensal', () => {
  const data = createDemoData();

  it('categorias por conta somam os totais do mês', () => {
    const sep = summarizeMonth(
      data.accounts.filter((a) => a.unit === 'Sede'),
      data.transactions.filter((t) => t.unit === 'Sede'),
      '2026-09',
    );
    const income = categoriesByAccount(sep.transactions, 'entrada');
    const expense = categoriesByAccount(sep.transactions, 'saida');
    expect(income.reduce((s, r) => s + r.totalCents, 0)).toBe(sep.total.incomeCents);
    expect(expense.reduce((s, r) => s + r.totalCents, 0)).toBe(sep.total.expenseCents);
    const especieIncome = income.reduce((s, r) => s + r.byAccount.especie, 0);
    expect(especieIncome).toBe(sep.accounts.find((a) => a.accountId === 'especie')!.incomeCents);
    const dizimo = income.find((r) => r.category === 'dizimo')!;
    expect(dizimo.byAccount).toEqual({ especie: 30000, sicoob: 126000 });
  });

  it('período termina no último dia do mês', () => {
    expect(monthEnd('2026-09')).toBe('2026-09-30');
    expect(monthEnd('2028-02')).toBe('2028-02-29');
  });
});
