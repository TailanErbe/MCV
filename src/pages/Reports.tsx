import { Printer } from 'lucide-react';
import { MonthPicker, PageHeader } from '../components/ui';
import { ACCOUNT_LABELS, CATEGORY_LABELS, METHOD_LABELS } from '../data/labels';
import type { AccountId } from '../data/types';
import { capitalize, formatDate, monthEnd, monthLabel, monthStart } from '../lib/dates';
import {
  categoriesByAccount,
  describeTransaction,
  sortChronological,
  summarizeMonth,
  type CategoryByAccount,
} from '../lib/finance';
import { formatBRL } from '../lib/money';
import { SEDE, unitPhrase } from '../lib/profiles';
import { useStore } from '../state/store';

const LOGO_SRC = `${import.meta.env.BASE_URL}assets/logo-igreja.jpeg`;
const ACCOUNTS: AccountId[] = ['especie', 'sicoob'];

export function Reports() {
  const { data, month, peopleById, unit, unitAccounts, unitTransactions } = useStore();
  const summary = summarizeMonth(unitAccounts, unitTransactions, month);
  const income = categoriesByAccount(summary.transactions, 'entrada').filter(
    (row) => unit === SEDE || row.category !== 'congregacao',
  );
  const expense = categoriesByAccount(summary.transactions, 'saida');
  const movements = sortChronological(summary.transactions);
  const issuedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const title = `Fechamento mensal — ${monthLabel(month)}`;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description={`Fechamento mensal ${unitPhrase(unit)}, com os mesmos lançamentos do Financeiro.`}
        actions={
          <>
            <MonthPicker />
            <div className="print-action">
              <button type="button" className="button button-primary" onClick={() => window.print()}>
                <Printer size={18} aria-hidden="true" />
                Imprimir / salvar em PDF
              </button>
            </div>
          </>
        }
      />
      <p className="print-hint">
        Abre a janela de impressão do navegador. Para gerar o PDF, escolha “Salvar como PDF” no destino.
      </p>

      <article className="report" aria-label={title}>
        <header className="report-header">
          <img src={LOGO_SRC} width={1600} height={834} alt={data.settings.churchName} className="report-logo" />
          <div className="report-heading">
            <p className="report-church">{data.settings.churchName}</p>
            <h2>{capitalize(title)}</h2>
            <p>
              Período: {formatDate(monthStart(month))} a {formatDate(monthEnd(month))} · Unidade: {unit}
            </p>
            <p className="report-meta">Emitido em {issuedAt}</p>
          </div>
        </header>
        <p className="report-demo">Demonstração • dados fictícios • sem validade oficial</p>

        <section className="report-section">
          <h3>Saldos por conta</h3>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">Conta</th>
                  <th scope="col" className="num">Saldo inicial</th>
                  <th scope="col" className="num">Entradas</th>
                  <th scope="col" className="num">Saídas</th>
                  <th scope="col" className="num">Saldo final</th>
                </tr>
              </thead>
              <tbody>
                {summary.accounts.map((a) => (
                  <tr key={a.accountId}>
                    <th scope="row">
                      <span className={`report-account report-account-${a.accountId}`}>{ACCOUNT_LABELS[a.accountId]}</span>
                    </th>
                    <td className="num">{formatBRL(a.openingCents)}</td>
                    <td className="num">{formatBRL(a.incomeCents)}</td>
                    <td className="num">{formatBRL(a.expenseCents)}</td>
                    <td className="num strong">{formatBRL(a.closingCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td className="num">{formatBRL(summary.total.openingCents)}</td>
                  <td className="num">{formatBRL(summary.total.incomeCents)}</td>
                  <td className="num">{formatBRL(summary.total.expenseCents)}</td>
                  <td className="num">{formatBRL(summary.total.closingCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="report-note">
            Saldo final = saldo inicial + entradas − saídas. O saldo inicial vem do mês anterior e não é contado como
            entrada.
          </p>
        </section>

        <div className="report-columns">
          <CategoryTable title="Entradas por categoria" rows={income} total={summary.total.incomeCents} />
          <CategoryTable title="Despesas por categoria" rows={expense} total={summary.total.expenseCents} />
        </div>

        <section className="report-section">
          <h3>Movimentos do período ({movements.length})</h3>
          {movements.length === 0 ? (
            <p className="empty-text">Nenhum movimento registrado neste mês.</p>
          ) : (
            <div className="report-table-wrap">
              <table className="report-table report-movements">
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Descrição / pessoa</th>
                    <th scope="col">Categoria</th>
                    <th scope="col">Conta</th>
                    <th scope="col">Forma</th>
                    <th scope="col" className="num">Entrada</th>
                    <th scope="col" className="num">Saída</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((tx) => {
                    const { title: name, detail } = describeTransaction(tx, peopleById);
                    return (
                      <tr key={tx.id}>
                        <td className="nowrap">{formatDate(tx.date)}</td>
                        <td>
                          {name}
                          {detail && <span className="report-detail">{detail}</span>}
                        </td>
                        <td>{CATEGORY_LABELS[tx.category]}</td>
                        <td>
                          <span className={`report-account report-account-${tx.accountId}`}>
                            {tx.accountId === 'especie' ? 'Espécie' : 'Sicoob'}
                          </span>
                        </td>
                        <td>{METHOD_LABELS[tx.method]}</td>
                        <td className="num">{tx.kind === 'entrada' ? formatBRL(tx.amountCents) : ''}</td>
                        <td className="num">{tx.kind === 'saida' ? formatBRL(tx.amountCents) : ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={5}>
                      Totais do mês
                    </th>
                    <td className="num">{formatBRL(summary.total.incomeCents)}</td>
                    <td className="num">{formatBRL(summary.total.expenseCents)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>

        <footer className="report-footer">
          {data.settings.churchName} · CNPJ {data.settings.cnpj} · Relatório de demonstração gerado com dados fictícios.
        </footer>
      </article>
    </>
  );
}

function CategoryTable({ title, rows, total }: { title: string; rows: CategoryByAccount[]; total: number }) {
  return (
    <section className="report-section">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="empty-text">Nenhum valor neste mês.</p>
      ) : (
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th scope="col">Categoria</th>
                {ACCOUNTS.map((id) => (
                  <th key={id} scope="col" className="num">
                    {id === 'especie' ? 'Espécie' : 'Sicoob'}
                  </th>
                ))}
                <th scope="col" className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.category}>
                  <th scope="row">{CATEGORY_LABELS[row.category]}</th>
                  {ACCOUNTS.map((id) => (
                    <td key={id} className="num">
                      {formatBRL(row.byAccount[id])}
                    </td>
                  ))}
                  <td className="num strong">{formatBRL(row.totalCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                {ACCOUNTS.map((id) => (
                  <td key={id} className="num">
                    {formatBRL(rows.reduce((s, r) => s + r.byAccount[id], 0))}
                  </td>
                ))}
                <td className="num">{formatBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
