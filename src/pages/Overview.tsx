import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { RegisterButtons, useTransactionEditor } from '../components/TransactionEditor';
import { AccountTag, MonthPicker, PageHeader } from '../components/ui';
import { CATEGORY_LABELS } from '../data/labels';
import { currentMonth, formatDate, monthLabel, monthName } from '../lib/dates';
import { describeTransaction, sortRecentFirst, summarizeMonth, type PeriodTotals } from '../lib/finance';
import { formatBRL, formatSigned } from '../lib/money';
import { SEDE, unitPhrase } from '../lib/profiles';
import { useStore } from '../state/store';

export function Overview() {
  const { month, peopleById, unit, unitAccounts, unitTransactions } = useStore();
  const editor = useTransactionEditor();
  const summary = summarizeMonth(unitAccounts, unitTransactions, month);
  // "Recebido de congregação" só existe na sede.
  const incomeRows = summary.incomeByCategory.filter((row) => unit === SEDE || row.category !== 'congregacao');
  const recent = sortRecentFirst(summary.transactions).slice(0, 6);
  // Mês já encerrado: "ao final do período"; mês corrente: saldo atual.
  const balanceLabel = month < currentMonth() ? 'Saldo ao final do período' : 'Saldo atual';
  const name = monthName(month);

  return (
    <>
      <PageHeader
        title="Visão geral"
        description={`Resumo financeiro ${unitPhrase(unit)} em ${monthLabel(month)}.`}
        actions={
          <>
            <MonthPicker />
            <RegisterButtons />
          </>
        }
      />

      <section className="balances" aria-label="Saldos">
        {summary.accounts.map((account) => (
          <BalancePanel
            key={account.accountId}
            heading={<AccountTag accountId={account.accountId} />}
            className={`balance-${account.accountId}`}
            label={balanceLabel}
            totals={account}
          />
        ))}
        <BalancePanel
          heading={<span className="balance-total-heading">Total da unidade</span>}
          className="balance-total"
          label={`${balanceLabel} (espécie + banco)`}
          totals={summary.total}
        />
      </section>

      <div className="two-columns">
        <section className="panel" aria-labelledby="entradas-titulo">
          <div className="panel-header">
            <h2 id="entradas-titulo">Entradas de {name}</h2>
            <strong className="amount">{formatBRL(summary.total.incomeCents)}</strong>
          </div>
          <dl className="category-list">
            {incomeRows.map((row) => (
              <div key={row.category} className="category-row">
                <dt>{CATEGORY_LABELS[row.category]}</dt>
                <dd className="amount">{formatBRL(row.cents)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel" aria-labelledby="despesas-titulo">
          <div className="panel-header">
            <h2 id="despesas-titulo">Despesas de {name}</h2>
            <strong className="amount">{formatBRL(summary.total.expenseCents)}</strong>
          </div>
          {summary.expenseByCategory.length === 0 ? (
            <p className="empty-text">Nenhuma despesa registrada neste mês.</p>
          ) : (
            <dl className="category-list">
              {summary.expenseByCategory.map((row) => (
                <div key={row.category} className="category-row">
                  <dt>{CATEGORY_LABELS[row.category]}</dt>
                  <dd className="amount">{formatBRL(row.cents)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="recentes-titulo">
        <div className="panel-header">
          <h2 id="recentes-titulo">Movimentações recentes de {name}</h2>
          <Link to="/financeiro" className="text-link">
            Ver todas no Financeiro
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="empty-text">Nenhuma movimentação registrada em {monthLabel(month)}.</p>
        ) : (
          <ul className="recent-list">
            {recent.map((tx) => {
              const { title, detail } = describeTransaction(tx, peopleById);
              return (
                <li key={tx.id} className="recent-item">
                  <span className="recent-date">{formatDate(tx.date)}</span>
                  <span className="recent-main">
                    <button type="button" className="link-button recent-title" onClick={() => editor.openDetails(tx.id)}>
                      {title}
                    </button>
                    <span className="recent-detail">
                      {CATEGORY_LABELS[tx.category]}
                      {detail ? ` · ${detail}` : ''}
                    </span>
                  </span>
                  <AccountTag accountId={tx.accountId} />
                  <span className={`amount recent-amount amount-${tx.kind}`}>
                    {formatSigned(tx.amountCents, tx.kind)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

function BalancePanel({
  heading,
  label,
  totals,
  className,
}: {
  heading: ReactNode;
  label: string;
  totals: PeriodTotals;
  className: string;
}) {
  return (
    <article className={`balance ${className}`}>
      <div className="balance-heading">{heading}</div>
      <p className="balance-label">{label}</p>
      <p className="balance-value amount">{formatBRL(totals.closingCents)}</p>
      <dl className="balance-breakdown">
        <div>
          <dt>Saldo inicial do mês</dt>
          <dd className="amount">{formatBRL(totals.openingCents)}</dd>
        </div>
        <div>
          <dt>Entradas</dt>
          <dd className="amount">+ {formatBRL(totals.incomeCents)}</dd>
        </div>
        <div>
          <dt>Saídas</dt>
          <dd className="amount">− {formatBRL(totals.expenseCents)}</dd>
        </div>
      </dl>
    </article>
  );
}
