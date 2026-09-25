import { useState } from 'react';
import { Search } from 'lucide-react';
import { RegisterButtons, useTransactionEditor } from '../components/TransactionEditor';
import { AccountTag, MonthPicker, PageHeader } from '../components/ui';
import { CATEGORY_LABELS, METHOD_LABELS } from '../data/labels';
import type { AccountId, TxKind } from '../data/types';
import { formatDate, monthLabel } from '../lib/dates';
import { describeTransaction, sortRecentFirst, transactionsInMonth } from '../lib/finance';
import { formatBRL, formatSigned } from '../lib/money';
import { normalize } from '../lib/text';
import { unitPhrase } from '../lib/profiles';
import { useStore } from '../state/store';

type AccountFilter = AccountId | 'todas';
type KindFilter = TxKind | 'todos';

export function Finance() {
  const { month, peopleById, unit, readOnly, unitTransactions } = useStore();
  const [query, setQuery] = useState('');
  const term = normalize(query);
  const editor = useTransactionEditor();
  const [account, setAccount] = useState<AccountFilter>('todas');
  const [kind, setKind] = useState<KindFilter>('todos');

  const rows = sortRecentFirst(
    transactionsInMonth(unitTransactions, month).filter((tx) => {
      if (account !== 'todas' && tx.accountId !== account) return false;
      if (kind !== 'todos' && tx.kind !== kind) return false;
      if (!term) return true;
      // Busca básica de doadores: nome identificado no lançamento, descrição ou origem.
      const { title, detail } = describeTransaction(tx, peopleById);
      return normalize([title, detail, tx.description].filter(Boolean).join(' ')).includes(term);
    }),
  );
  const income = rows.filter((tx) => tx.kind === 'entrada').reduce((sum, tx) => sum + tx.amountCents, 0);
  const expense = rows.filter((tx) => tx.kind === 'saida').reduce((sum, tx) => sum + tx.amountCents, 0);
  const filtered = account !== 'todas' || kind !== 'todos' || term !== '';

  return (
    <>
      <PageHeader
        title="Financeiro"
        description={
          readOnly
            ? `Lançamentos ${unitPhrase(unit)}, somente para consulta. Clique num lançamento para ver os detalhes.`
            : `Recebimentos e despesas ${unitPhrase(unit)}, nas duas contas. Clique num lançamento para ver os detalhes ou corrigir.`
        }
        actions={<RegisterButtons />}
      />

      <div className="filter-bar" role="group" aria-label="Filtros">
        <MonthPicker />
        <div className="filter">
          <label htmlFor="filter-account">Conta</label>
          <select id="filter-account" value={account} onChange={(e) => setAccount(e.target.value as AccountFilter)}>
            <option value="todas">Todas as contas</option>
            <option value="especie">Dinheiro em espécie</option>
            <option value="sicoob">Banco Sicoob</option>
          </select>
        </div>
        <div className="filter">
          <label htmlFor="filter-kind">Tipo</label>
          <select id="filter-kind" value={kind} onChange={(e) => setKind(e.target.value as KindFilter)}>
            <option value="todos">Entradas e saídas</option>
            <option value="entrada">Somente entradas</option>
            <option value="saida">Somente saídas</option>
          </select>
        </div>
        <div className="filter filter-search">
          <label htmlFor="filter-search">Buscar doador ou descrição</label>
          <div className="input-with-icon">
            <Search size={17} aria-hidden="true" />
            <input
              id="filter-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: nome do doador"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <div className="totals-strip" aria-label="Totais da lista">
        <div>
          <span>Entradas</span>
          <strong className="amount">{formatBRL(income)}</strong>
        </div>
        <div>
          <span>Saídas</span>
          <strong className="amount">{formatBRL(expense)}</strong>
        </div>
        <div>
          <span>Resultado</span>
          <strong className="amount">{formatBRL(income - expense)}</strong>
        </div>
        <div>
          <span>Movimentações</span>
          <strong>{rows.length}</strong>
        </div>
      </div>

      <section className="panel panel-flush" aria-label="Lista de movimentações">
        {rows.length === 0 ? (
          <div className="empty-state panel-pad">
            <p className="empty-text">
              {filtered
                ? `Nenhuma movimentação encontrada com estes filtros em ${monthLabel(month)}.`
                : `Nenhuma movimentação registrada em ${monthLabel(month)}.`}
            </p>
            {filtered && (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setAccount('todas');
                  setKind('todos');
                  setQuery('');
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Descrição / pessoa</th>
                <th scope="col">Categoria</th>
                <th scope="col">Conta</th>
                <th scope="col">Forma</th>
                <th scope="col" className="col-amount">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => {
                const { title, detail } = describeTransaction(tx, peopleById);
                return (
                  <tr key={tx.id} className="clickable-row" onClick={() => editor.openDetails(tx.id)}>
                    <td className="cell-date">{formatDate(tx.date)}</td>
                    <td className="cell-desc">
                      <button
                        type="button"
                        className="link-button cell-title"
                        onClick={(e) => {
                          e.stopPropagation();
                          editor.openDetails(tx.id);
                        }}
                      >
                        {title}
                      </button>
                      {detail && <span className="cell-detail">{detail}</span>}
                    </td>
                    <td className="cell-category">{CATEGORY_LABELS[tx.category]}</td>
                    <td className="cell-account">
                      <AccountTag accountId={tx.accountId} />
                    </td>
                    <td className="cell-method">{METHOD_LABELS[tx.method]}</td>
                    <td className={`cell-amount amount amount-${tx.kind}`}>
                      <span className="sr-only">{tx.kind === 'entrada' ? 'Entrada: ' : 'Saída: '}</span>
                      {formatSigned(tx.amountCents, tx.kind)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
