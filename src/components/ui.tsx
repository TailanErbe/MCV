import { cloneElement, isValidElement, useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { Banknote, ChevronLeft, ChevronRight, Landmark } from 'lucide-react';
import { ACCOUNT_LABELS } from '../data/labels';
import type { AccountId } from '../data/types';
import { capitalize, monthLabel } from '../lib/dates';
import { useStore } from '../state/store';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

/** Conta sempre identificada por texto e ícone, além da cor. */
export function AccountTag({ accountId }: { accountId: AccountId }) {
  const Icon = accountId === 'especie' ? Banknote : Landmark;
  return (
    <span className={`account-tag account-${accountId}`}>
      <Icon size={15} aria-hidden="true" />
      {ACCOUNT_LABELS[accountId]}
    </span>
  );
}

export function MonthPicker() {
  const { month, months, setMonth } = useStore();
  const index = months.indexOf(month);
  return (
    <div className="month-picker">
      <label htmlFor="month-select">Mês</label>
      <div className="month-picker-controls">
        <button
          type="button"
          className="icon-button"
          onClick={() => setMonth(months[index - 1])}
          disabled={index <= 0}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <select id="month-select" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m} value={m}>
              {capitalize(monthLabel(m))}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="icon-button"
          onClick={() => setMonth(months[index + 1])}
          disabled={index >= months.length - 1}
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Depois que uma janela fecha, ignora por um instante o clique que sobrar de um
 * duplo clique, para ele não acionar o que estiver por baixo (ex.: outra linha da lista).
 */
let lastPointerUp = 0;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerup', () => (lastPointerUp = Date.now()), true);
}

function ignoreStrayClick() {
  // Só quando a janela foi fechada por um clique (Esc e teclado não armam a proteção).
  if (Date.now() - lastPointerUp > 250) return;
  const until = Date.now() + 300;
  const swallow = (event: MouseEvent) => {
    if (Date.now() < until) {
      event.stopPropagation();
      event.preventDefault();
    }
  };
  window.addEventListener('click', swallow, true);
  window.setTimeout(() => window.removeEventListener('click', swallow, true), 350);
}

/** Janela modal nativa. Esc chama onClose; o foco vai para [data-autofocus] ou o primeiro campo. */
export function Modal({
  open,
  onClose,
  labelledBy,
  className = '',
  focusKey,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  focusKey?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      dialog.close();
      ignoreStrayClick();
    }
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const target =
      dialog.querySelector<HTMLElement>('[data-autofocus]') ??
      dialog.querySelector<HTMLElement>('input:not([type="radio"]), select, textarea, button');
    target?.focus();
  }, [open, focusKey]);

  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = false,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      dialog.close();
      ignoreStrayClick();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="dialog-title">{title}</h2>
      <p>{message}</p>
      <div className="dialog-actions">
        <button type="button" className="button button-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className={`button ${danger ? 'button-danger' : 'button-primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export function ToastRegion() {
  const { toast } = useStore();
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="toast">
          {toast.message}
        </div>
      )}
    </div>
  );
}

/** Campo com rótulo fixo, dica e erro ligados ao controle para leitores de tela. */
export function Field({
  name,
  label,
  error,
  hint,
  wide = false,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const id = `f-${name}`;
  return (
    <div className={`field ${wide ? 'field-wide' : ''} ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            'aria-invalid': error ? true : undefined,
            'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
          })
        : children}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
