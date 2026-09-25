import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Banknote, Landmark, Minus, Plus } from 'lucide-react';
import {
  ACCOUNT_LABELS,
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  INCOME_DESCRIPTIONS,
  METHOD_LABELS,
  METHODS_BY_ACCOUNT,
} from '../data/labels';
import type {
  AccountId,
  Category,
  IncomeCategory,
  PaymentMethod,
  Transaction,
  TxKind,
} from '../data/types';
import { currentMonth, formatDate, isValidISODate, todayISO } from '../lib/dates';
import { formatBRL, formatMoneyInput, parseMoneyInput } from '../lib/money';
import { SEDE } from '../lib/profiles';
import { useStore } from '../state/store';
import { AccountTag, ConfirmDialog, Field, Modal } from './ui';

// ------------------------------------------------------------------
// Abertura do editor a partir de qualquer tela
// ------------------------------------------------------------------

type EditorState =
  | { mode: 'new'; kind: TxKind; session: number }
  | { mode: 'view' | 'edit'; id: string; session: number }
  | null;

interface EditorApi {
  openNew: (kind: TxKind) => void;
  openDetails: (id: string) => void;
}

const EditorContext = createContext<EditorApi | null>(null);

export function useTransactionEditor(): EditorApi {
  const api = useContext(EditorContext);
  if (!api) throw new Error('useTransactionEditor precisa estar dentro de TransactionEditorProvider');
  return api;
}

export function TransactionEditorProvider({ children }: { children: ReactNode }) {
  const { data, deleteTransaction, notify } = useStore();
  const [state, setState] = useState<EditorState>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const session = useRef(0);

  const api = useMemo<EditorApi>(
    () => ({
      openNew: (kind) => setState({ mode: 'new', kind, session: ++session.current }),
      openDetails: (id) => setState({ mode: 'view', id, session: ++session.current }),
    }),
    [],
  );

  const tx = state && state.mode !== 'new' ? data.transactions.find((t) => t.id === state.id) : undefined;
  const kind: TxKind | undefined = state?.mode === 'new' ? state.kind : tx?.kind;
  const open = state !== null && (state.mode === 'new' || tx !== undefined);
  const close = () => setState(null);

  let title = '';
  if (state?.mode === 'new') title = kind === 'entrada' ? 'Registrar recebimento' : 'Registrar despesa';
  if (state?.mode === 'view') title = 'Detalhes do lançamento';
  if (state?.mode === 'edit') title = kind === 'entrada' ? 'Corrigir recebimento' : 'Corrigir despesa';

  return (
    <EditorContext.Provider value={api}>
      {children}
      <Modal open={open} onClose={close} labelledBy="editor-title" className="modal-form" focusKey={state?.session}>
        {open && kind && (
          <>
            <h2 id="editor-title">{title}</h2>
            {state?.mode === 'view' && tx ? (
              <TransactionDetails
                tx={tx}
                onClose={close}
                onEdit={() => setState({ mode: 'edit', id: tx.id, session: ++session.current })}
                onDelete={() => setConfirmDelete(true)}
              />
            ) : (
              <TransactionForm
                key={state?.session}
                kind={kind}
                initial={state?.mode === 'edit' ? tx : undefined}
                onDone={close}
                onCancel={state?.mode === 'edit' && tx ? () => setState({ mode: 'view', id: tx.id, session: ++session.current }) : close}
              />
            )}
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir lançamento?"
        message={
          tx
            ? `${tx.kind === 'entrada' ? 'Recebimento' : 'Despesa'} de ${formatBRL(tx.amountCents)} em ${formatDate(tx.date)}. Os saldos serão recalculados sem este lançamento.`
            : ''
        }
        confirmLabel="Excluir"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          if (tx) {
            deleteTransaction(tx.id);
            notify('Lançamento excluído. Os totais foram atualizados.');
          }
          close();
        }}
      />
    </EditorContext.Provider>
  );
}

/** Ações diretas "Registrar recebimento" e "Registrar despesa". */
export function RegisterButtons() {
  const editor = useTransactionEditor();
  const { readOnly } = useStore();
  if (readOnly) return null;
  return (
    <div className="register-buttons">
      <button type="button" className="button button-primary" onClick={() => editor.openNew('entrada')}>
        <Plus size={18} aria-hidden="true" />
        Registrar recebimento
      </button>
      <button type="button" className="button button-secondary" onClick={() => editor.openNew('saida')}>
        <Minus size={18} aria-hidden="true" />
        Registrar despesa
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// Detalhes
// ------------------------------------------------------------------

function TransactionDetails({
  tx,
  onClose,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { peopleById, readOnly } = useStore();
  const person = tx.personId ? peopleById.get(tx.personId) : undefined;
  const rows: [string, ReactNode][] = [
    ['Tipo', tx.kind === 'entrada' ? 'Recebimento (entrada)' : 'Despesa (saída)'],
    ['Valor', <strong className="amount">{formatBRL(tx.amountCents)}</strong>],
    ['Data', formatDate(tx.date)],
    ['Categoria', CATEGORY_LABELS[tx.category]],
    ['Conta', <AccountTag accountId={tx.accountId} />],
    ['Forma', METHOD_LABELS[tx.method]],
  ];
  if (tx.kind === 'entrada') {
    rows.push(['Pessoa', person ? person.name : 'Sem identificação']);
    rows.push(['Origem', tx.origin ?? 'Não informada']);
    rows.push(['Descrição', tx.description]);
  } else {
    rows.push(['Descrição', tx.description]);
    rows.push(['Responsável', tx.responsible ?? 'Não informado']);
  }

  return (
    <>
      <dl className="details-list">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {readOnly ? (
        <>
          <p className="field-hint readonly-note">
            Somente consulta: os lançamentos desta unidade são registrados pela tesouraria da própria congregação.
          </p>
          <div className="dialog-actions">
            <button type="button" className="button button-secondary" onClick={onClose} data-autofocus>
              Fechar
            </button>
          </div>
        </>
      ) : (
        <div className="dialog-actions dialog-actions-split">
          <button type="button" className="button button-danger-text" onClick={onDelete}>
            Excluir
          </button>
          <div>
            <button type="button" className="button button-secondary" onClick={onClose} data-autofocus>
              Fechar
            </button>
            <button type="button" className="button button-primary" onClick={onEdit}>
              Corrigir lançamento
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------
// Formulário de recebimento e despesa
// ------------------------------------------------------------------

interface Draft {
  description: string;
  amount: string;
  date: string;
  category: Category | '';
  accountId: AccountId;
  method: PaymentMethod;
  personId: string;
  origin: string;
  responsible: string;
}

type Errors = Partial<Record<keyof Draft, string>>;

function TransactionForm({
  kind,
  initial,
  onDone,
  onCancel,
}: {
  kind: TxKind;
  initial?: Transaction;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data, month, addTransaction, updateTransaction, notify, unit: viewUnit } = useStore();
  const unit = initial?.unit ?? viewUnit;
  const atSede = unit === SEDE;
  const today = todayISO();
  const saving = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [draft, setDraft] = useState<Draft>(() => {
    if (initial) {
      return {
        description: initial.description,
        amount: formatMoneyInput(initial.amountCents),
        date: initial.date,
        category: initial.category,
        accountId: initial.accountId,
        method: initial.method,
        personId: initial.personId ?? '',
        origin: initial.origin ?? '',
        responsible: initial.responsible ?? data.settings.treasurer.name,
      };
    }
    return {
      description: '',
      amount: '',
      date: month === currentMonth() ? today : `${month}-01`,
      category: kind === 'entrada' ? 'dizimo' : '',
      accountId: 'sicoob',
      method: kind === 'entrada' ? 'pix' : 'boleto',
      personId: '',
      origin: '',
      responsible: data.settings.treasurer.name,
    };
  });
  const [errors, setErrors] = useState<Errors>({});
  // Origem sugerida pelo cadastro da pessoa; deixa de acompanhar se for alterada à mão.
  const [originFromPerson, setOriginFromPerson] = useState(false);

  // Dados básicos para identificar doadores: na congregação, só as pessoas dela.
  const people = useMemo(
    () =>
      [...data.people]
        .filter((p) => atSede || p.congregation === unit)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [data.people, atSede, unit],
  );
  const methods = METHODS_BY_ACCOUNT[draft.accountId][kind];
  const isIncome = kind === 'entrada';

  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function chooseAccount(accountId: AccountId) {
    setDraft((d) => {
      const allowed = METHODS_BY_ACCOUNT[accountId][kind];
      return { ...d, accountId, method: allowed.includes(d.method) ? d.method : allowed[0] };
    });
  }

  function validate(d: Draft): Errors {
    const e: Errors = {};
    if (!isIncome && !d.description.trim()) e.description = 'Descreva a despesa.';
    const cents = parseMoneyInput(d.amount);
    if (!d.amount.trim()) e.amount = 'Informe o valor.';
    else if (cents === null) e.amount = 'Valor inválido. Use o formato 150,00.';
    else if (cents <= 0) e.amount = 'Informe um valor maior que zero.';
    if (!isValidISODate(d.date)) e.date = 'Informe uma data válida.';
    else if (d.date > today) e.date = 'Registre apenas valores já recebidos ou pagos. A data não pode ser futura.';
    else if (d.date < data.openingDate)
      e.date = `Use uma data a partir de ${formatDate(data.openingDate)}, início dos dados desta demonstração.`;
    if (!d.category) e.category = 'Escolha a categoria.';
    if (isIncome && d.category === 'congregacao' && !d.origin) e.origin = 'Escolha a congregação de origem.';
    if (!isIncome && !d.responsible.trim()) e.responsible = 'Informe o responsável pelo pagamento.';
    return e;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    const found = validate(draft);
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    saving.current = true;

    const cents = parseMoneyInput(draft.amount) as number;
    const category = draft.category as Category;
    const description = isIncome
      ? initial && initial.category === category
        ? initial.description
        : INCOME_DESCRIPTIONS[category as IncomeCategory]
      : draft.description.trim();

    const tx: Omit<Transaction, 'id'> = {
      unit,
      kind,
      date: draft.date,
      amountCents: cents,
      accountId: draft.accountId,
      method: draft.method,
      category,
      description,
      ...(isIncome
        ? { personId: draft.personId || undefined, origin: atSede ? draft.origin || undefined : undefined }
        : { responsible: draft.responsible.trim() }),
    };

    if (initial) {
      updateTransaction({ ...tx, id: initial.id });
      notify('Lançamento corrigido. Os totais foram atualizados.');
    } else {
      addTransaction(tx);
      notify(
        `${isIncome ? 'Recebimento' : 'Despesa'} de ${formatBRL(cents)} ${isIncome ? 'salvo' : 'salva'} em ${ACCOUNT_LABELS[draft.accountId]}.`,
      );
    }
    onDone();
  }

  // "Recebido de congregação" é da sede; "Repasse à sede" é das congregações.
  const categories = isIncome
    ? INCOME_CATEGORIES.filter((c) => atSede || c !== 'congregacao')
    : EXPENSE_CATEGORIES.filter((c) => !atSede || c !== 'repasse_sede');

  return (
    <form ref={formRef} className="tx-form" onSubmit={handleSubmit} noValidate>
      {!isIncome && (
        <Field name="description" label="Descrição" error={errors.description} wide>
          <input
            id="f-description"
            name="description"
            type="text"
            value={draft.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Ex.: Conta de energia do templo"
            autoComplete="off"
            maxLength={120}
          />
        </Field>
      )}

      <Field name="amount" label="Valor (R$)" error={errors.amount}>
        <input
          id="f-amount"
          name="amount"
          type="text"
          inputMode="decimal"
          value={draft.amount}
          onChange={(e) => update('amount', e.target.value)}
          onBlur={() => {
            const cents = parseMoneyInput(draft.amount);
            if (cents !== null && cents > 0) update('amount', formatMoneyInput(cents));
          }}
          placeholder="0,00"
          autoComplete="off"
        />
      </Field>

      <Field name="date" label="Data" error={errors.date}>
        <input
          id="f-date"
          name="date"
          type="date"
          value={draft.date}
          min={data.openingDate}
          max={today}
          onChange={(e) => update('date', e.target.value)}
        />
      </Field>

      <Field name="category" label="Categoria" error={errors.category} wide>
        <select
          id="f-category"
          name="category"
          value={draft.category}
          onChange={(e) => {
            const category = e.target.value as Category;
            update('category', category);
            if (category === 'congregacao' && draft.origin === 'Sede') update('origin', '');
          }}
        >
          {!draft.category && (
            <option value="" disabled>
              Escolha a categoria
            </option>
          )}
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="field field-wide account-choice">
        <legend>Conta</legend>
        <div className="account-options">
          {(['especie', 'sicoob'] as AccountId[]).map((id) => {
            const Icon = id === 'especie' ? Banknote : Landmark;
            return (
              <label key={id} className={`account-option account-option-${id}`}>
                <input
                  type="radio"
                  name="accountId"
                  value={id}
                  checked={draft.accountId === id}
                  onChange={() => chooseAccount(id)}
                />
                <Icon size={18} aria-hidden="true" />
                {ACCOUNT_LABELS[id]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field
        name="method"
        label={isIncome ? 'Forma de recebimento' : 'Forma de pagamento'}
        hint={methodHint(kind, draft.method)}
        wide
      >
        {methods.length === 1 ? (
          <p className="static-value" id="f-method">
            {METHOD_LABELS[methods[0]]}
          </p>
        ) : (
          <select
            id="f-method"
            name="method"
            value={draft.method}
            onChange={(e) => update('method', e.target.value as PaymentMethod)}
          >
            {methods.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        )}
      </Field>

      {isIncome ? (
        <>
          <Field
            name="personId"
            label="Pessoa (opcional)"
            hint={draft.category === 'oferta' || draft.category === 'missoes' ? 'Deixe em branco para oferta anônima.' : undefined}
          >
            <select
              id="f-personId"
              name="personId"
              value={draft.personId}
              onChange={(e) => {
                const person = data.people.find((p) => p.id === e.target.value);
                update('personId', e.target.value);
                const allowed = person && !(draft.category === 'congregacao' && person.congregation === 'Sede');
                if (person && allowed && (!draft.origin || originFromPerson)) {
                  update('origin', person.congregation);
                  setOriginFromPerson(true);
                } else if (!person && originFromPerson) {
                  update('origin', '');
                  setOriginFromPerson(false);
                }
              }}
            >
              <option value="">Sem identificação</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.registration}
                </option>
              ))}
            </select>
          </Field>

          {/* Na congregação a origem é a própria unidade; o campo só existe na sede. */}
          {atSede && (
          <Field
            name="origin"
            label={draft.category === 'congregacao' ? 'Congregação de origem' : 'Origem (opcional)'}
            error={errors.origin}
            hint={originFromPerson ? 'Preenchida pelo cadastro da pessoa. Pode alterar.' : undefined}
          >
            <select
              id="f-origin"
              name="origin"
              value={draft.origin}
              onChange={(e) => {
                update('origin', e.target.value);
                setOriginFromPerson(false);
              }}
            >
              <option value="">{draft.category === 'congregacao' ? 'Escolha a congregação' : 'Não informar'}</option>
              {data.congregations
                .filter((c) => draft.category !== 'congregacao' || c !== 'Sede')
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </select>
          </Field>
          )}
        </>
      ) : (
        <Field name="responsible" label="Responsável" error={errors.responsible} wide>
          <input
            id="f-responsible"
            name="responsible"
            type="text"
            value={draft.responsible}
            onChange={(e) => update('responsible', e.target.value)}
            autoComplete="off"
            maxLength={80}
          />
        </Field>
      )}

      <div className="dialog-actions field-wide">
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="button button-primary">
          {initial ? 'Salvar correção' : isIncome ? 'Salvar recebimento' : 'Salvar despesa'}
        </button>
      </div>
    </form>
  );
}

function methodHint(kind: TxKind, method: PaymentMethod): string | undefined {
  if (kind === 'entrada' && (method === 'cartao_debito' || method === 'cartao_credito')) {
    return 'Registre o recebimento no cartão quando o valor já estiver na conta.';
  }
  if (kind === 'saida' && method === 'cartao_credito') {
    return 'Registre quando o pagamento sair da conta. Faturas e parcelas não fazem parte desta demonstração.';
  }
  return undefined;
}
