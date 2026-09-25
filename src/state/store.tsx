import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createDemoData } from '../data/demo';
import type {
  Account,
  DemoData,
  DocumentDraft,
  IssuedDocument,
  Person,
  Settings,
  SignatureRecord,
  SignerRole,
  Transaction,
  Unit,
} from '../data/types';
import { monthOf } from '../lib/dates';
import { availableMonths, defaultMonth } from '../lib/finance';
import { PROFILES, SEDE, isReadOnly, type Profile } from '../lib/profiles';

const STORAGE_KEY = 'igreja-mcv-demonstracao';
const STORAGE_VERSION = 2;
// Perfil simulado fica separado dos dados: trocar de perfil nunca apaga lançamentos.
const PROFILE_KEY = 'igreja-mcv-perfil';

interface Stored {
  version: number;
  data: DemoData;
}

function isValidData(value: unknown): value is DemoData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<DemoData>;
  return (
    typeof data.openingDate === 'string' &&
    Array.isArray(data.accounts) &&
    Array.isArray(data.transactions) &&
    Array.isArray(data.people) &&
    Array.isArray(data.congregations) &&
    typeof data.settings === 'object' &&
    data.settings !== null
  );
}

/** Lê os dados salvos neste navegador; qualquer problema volta para a base da demonstração. */
function loadInitial(): { data: DemoData; storageOk: boolean } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { data: createDemoData(), storageOk: true };
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.version === STORAGE_VERSION && isValidData(parsed.data)) {
      const data = { ...parsed.data, documents: Array.isArray(parsed.data.documents) ? parsed.data.documents : [] };
      return { data, storageOk: true };
    }
    if (parsed?.version === 1 && isValidData(parsed.data)) {
      return { data: migrateFromV1(parsed.data), storageOk: true };
    }
    return { data: createDemoData(), storageOk: true };
  } catch {
    return { data: createDemoData(), storageOk: false };
  }
}

/**
 * Versão 1 (antes das unidades): tudo pertencia à sede. Mantém os testes já feitos
 * neste navegador e acrescenta as contas e os lançamentos das congregações.
 */
function migrateFromV1(old: DemoData): DemoData {
  const seed = createDemoData();
  return {
    ...old,
    accounts: seed.accounts,
    congregations: seed.congregations,
    transactions: [
      ...old.transactions.map((t) => ({ ...t, unit: t.unit ?? SEDE })),
      ...seed.transactions.filter((t) => t.unit !== SEDE),
    ],
    documents: (Array.isArray(old.documents) ? old.documents : []).map((d) => ({ ...d, unit: d.unit ?? SEDE })),
  };
}

interface ProfileView {
  profile: Profile;
  unit: Unit;
}

function loadProfile(congregations: string[]): ProfileView {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? 'null') as ProfileView | null;
    if (saved && PROFILES.includes(saved.profile) && congregations.includes(saved.unit)) {
      if (saved.profile === 'secretaria') return { profile: 'secretaria', unit: SEDE };
      if (saved.profile === 'congregacao' && saved.unit === SEDE) throw new Error('unidade inválida');
      return saved;
    }
  } catch {
    // Sem perfil salvo válido: começa pela tesouraria da sede.
  }
  return { profile: 'sede', unit: SEDE };
}

interface Toast {
  id: number;
  message: string;
}

interface StoreValue {
  data: DemoData;
  peopleById: Map<string, Person>;
  month: string;
  months: string[];
  setMonth: (month: string) => void;
  storageOk: boolean;
  resetDemo: () => void;
  toast: Toast | null;
  notify: (message: string) => void;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  savePerson: (person: Omit<Person, 'id' | 'registration'> & { id?: string }) => Person;
  issueDocument: (draft: DocumentDraft, unit: Unit, previous?: IssuedDocument) => IssuedDocument;
  saveSettings: (settings: Settings) => void;
  /** Perfil simulado e unidade em exibição. */
  profile: Profile;
  unit: Unit;
  readOnly: boolean;
  setView: (profile: Profile, unit: Unit) => void;
  /** Contas e lançamentos só da unidade em exibição. */
  unitAccounts: Account[];
  unitTransactions: Transaction[];
  signDocument: (id: string, role: SignerRole, signature: Omit<SignatureRecord, 'documentId' | 'documentNumber' | 'version' | 'signedAt'>) => void;
}

/** Data e hora locais, AAAA-MM-DDTHH:MM. */
export function localDateTime(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}

/** Próximo número demonstrativo: DEMO-0001, DEMO-0002... */
export function nextDocumentNumber(documents: IssuedDocument[]): string {
  const max = documents.reduce((m, d) => Math.max(m, Number(/(\d+)$/.exec(d.number)?.[1] ?? 0)), 0);
  return `DEMO-${String(max + 1).padStart(4, '0')}`;
}

/** Próxima matrícula fictícia: MCV-013, MCV-014... */
export function nextRegistration(people: Person[]): string {
  const max = people.reduce((m, p) => Math.max(m, Number(/(\d+)$/.exec(p.registration)?.[1] ?? 0)), 0);
  return `MCV-${String(max + 1).padStart(3, '0')}`;
}

function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(loadInitial, []);
  const [data, setData] = useState<DemoData>(initial.data);
  const [storageOk, setStorageOk] = useState(initial.storageOk);
  const [month, setMonth] = useState(() => defaultMonth(initial.data));
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const skipNextSave = useRef(false);
  const [view, setViewState] = useState<ProfileView>(() => loadProfile(initial.data.congregations));

  const setView = useCallback((profile: Profile, unit: Unit) => {
    const next: ProfileView = { profile, unit: profile === 'secretaria' ? SEDE : unit };
    setViewState(next);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
      // Sem armazenamento: o perfil vale só nesta sessão.
    }
  }, []);

  useEffect(() => {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      const stored: Stored = { version: STORAGE_VERSION, data };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  }, [data]);

  const notify = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message });
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = createDemoData();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sem acesso ao armazenamento: a base é restaurada só nesta sessão.
    }
    skipNextSave.current = true;
    setData(fresh);
    setMonth(defaultMonth(fresh));
    notify('Demonstração restaurada.');
  }, [notify]);

  // Após salvar, o mês do lançamento passa a ser exibido para o resultado aparecer na tela.
  const addTransaction = useCallback((draft: Omit<Transaction, 'id'>) => {
    const tx: Transaction = { ...draft, id: newId('t') };
    setData((current) => ({ ...current, transactions: [...current.transactions, tx] }));
    setMonth(monthOf(tx.date));
    return tx;
  }, []);

  const updateTransaction = useCallback((tx: Transaction) => {
    setData((current) => ({
      ...current,
      transactions: current.transactions.map((t) => (t.id === tx.id ? tx : t)),
    }));
    setMonth(monthOf(tx.date));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData((current) => ({ ...current, transactions: current.transactions.filter((t) => t.id !== id) }));
  }, []);

  // Cadastro calculado antes de atualizar o estado, para devolver a ficha salva de imediato.
  const dataRef = useRef(data);
  dataRef.current = data;

  const savePerson = useCallback((draft: Omit<Person, 'id' | 'registration'> & { id?: string }) => {
    const current = dataRef.current;
    const existing = draft.id ? current.people.find((p) => p.id === draft.id) : undefined;
    const saved: Person = existing
      ? { ...existing, ...draft, id: existing.id, registration: existing.registration }
      : { ...draft, id: newId('p'), registration: nextRegistration(current.people) };
    setData((cur) => ({
      ...cur,
      people: existing ? cur.people.map((p) => (p.id === saved.id ? saved : p)) : [...cur.people, saved],
    }));
    return saved;
  }, []);

  const issueDocument = useCallback((draft: DocumentDraft, unit: Unit, previous?: IssuedDocument) => {
    const current = dataRef.current;
    const sameNumber = previous ? current.documents.filter((d) => d.number === previous.number) : [];
    const doc = {
      id: newId('d'),
      unit: previous?.unit ?? unit,
      number: previous ? previous.number : nextDocumentNumber(current.documents),
      version: previous ? Math.max(...sameNumber.map((d) => d.version)) + 1 : 1,
      issuedAt: localDateTime(),
      issuedBy: current.settings.secretary.name,
      supersedes: previous?.id,
      ...structuredClone(draft),
      signatures: {},
    } as IssuedDocument;
    setData((cur) => ({ ...cur, documents: [...cur.documents, doc] }));
    return doc;
  }, []);

  const signDocument = useCallback(
    (id: string, role: SignerRole, signature: Omit<SignatureRecord, 'documentId' | 'documentNumber' | 'version' | 'signedAt'>) => {
      setData((cur) => ({
        ...cur,
        documents: cur.documents.map((d) =>
          d.id === id && !d.signatures[role]
            ? {
                ...d,
                signatures: {
                  ...d.signatures,
                  [role]: { ...signature, signedAt: localDateTime(), documentId: d.id, documentNumber: d.number, version: d.version },
                },
              }
            : d,
        ),
      }));
    },
    [],
  );

  const saveSettings = useCallback((settings: Settings) => {
    setData((cur) => ({ ...cur, settings: structuredClone(settings) }));
  }, []);

  const value = useMemo<StoreValue>(() => {
    const months = availableMonths(data);
    return {
      data,
      peopleById: new Map(data.people.map((p) => [p.id, p])),
      month: months.includes(month) ? month : defaultMonth(data),
      months,
      setMonth,
      storageOk,
      resetDemo,
      toast,
      notify,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      savePerson,
      issueDocument,
      signDocument,
      saveSettings,
      profile: view.profile,
      unit: view.unit,
      readOnly: isReadOnly(view.profile, view.unit),
      setView,
      unitAccounts: data.accounts.filter((a) => a.unit === view.unit),
      unitTransactions: data.transactions.filter((t) => t.unit === view.unit),
    };
  }, [data, month, storageOk, resetDemo, toast, notify, addTransaction, updateTransaction, deleteTransaction, savePerson, issueDocument, signDocument, saveSettings, view, setView]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore precisa estar dentro de StoreProvider');
  return store;
}
