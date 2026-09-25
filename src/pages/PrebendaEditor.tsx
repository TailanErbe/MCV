import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PrebendaView } from '../components/ReceiptView';
import { ConfirmDialog, Field, PageHeader } from '../components/ui';
import { ACCOUNT_LABELS } from '../data/labels';
import type { PrebendaContent } from '../data/types';
import { formatDate, isValidISODate, monthOf } from '../lib/dates';
import { amountInWords } from '../lib/extenso';
import { formatBRL } from '../lib/money';
import { nextDocumentNumber, useStore } from '../state/store';

// Texto recebido no modelo original, tratado como condição revisável e não como regra.
const DEFAULT_CONDITIONS =
  'Primeira parte até o quinto dia útil e o restante até o dia 15, conforme combinado com a igreja. Referência legal: pendente de aprovação da igreja.';

const STAGES = ['Pagamento integral', 'Primeira parte', 'Parte restante'];

type Errors = Partial<Record<'transactionId' | 'receiverName' | 'competence' | 'place' | 'date', string>>;

export function PrebendaEditor() {
  const { data, issueDocument, notify, unit, unitTransactions } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const found = data.documents.find((d) => d.id === params.get('base'));
  const base = found?.type === 'recibo_prebenda' ? found : undefined;

  const payments = unitTransactions
    .filter((tx) => tx.kind === 'saida' && tx.category === 'prebenda')
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const [transactionId, setTransactionId] = useState(base?.content.transactionId ?? '');
  const [receiverPersonId, setReceiverPersonId] = useState(base?.content.receiverPersonId ?? '');
  const people = useMemo(() => [...data.people].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [data.people]);
  const [receiverName, setReceiverName] = useState(base?.content.receiverName ?? data.settings.pastor.name);
  const [receiverDocument, setReceiverDocument] = useState(base?.content.receiverDocument ?? '');
  const [receiverAddress, setReceiverAddress] = useState(base?.content.receiverAddress ?? '');
  const [competence, setCompetence] = useState(base?.content.competence ?? '');
  const [stage, setStage] = useState(base?.content.stage ?? STAGES[0]);
  const [conditions, setConditions] = useState(base?.content.conditions ?? DEFAULT_CONDITIONS);
  const [place, setPlace] = useState(base?.content.place ?? data.settings.city);
  const [date, setDate] = useState(base?.content.date ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [confirming, setConfirming] = useState(false);
  const issuing = useRef(false);

  const tx = data.transactions.find((t) => t.id === transactionId);
  const payment = tx
    ? { amountCents: tx.amountCents, paymentDate: tx.date, paymentMethod: tx.method, accountId: tx.accountId }
    : base && base.content.transactionId === transactionId
      ? base.content
      : undefined;

  const content: PrebendaContent = {
    churchName: data.settings.churchName,
    cnpj: data.settings.cnpj,
    address: data.settings.address,
    transactionId,
    amountCents: payment?.amountCents ?? 0,
    amountWords: payment ? amountInWords(payment.amountCents) : '[valor por extenso]',
    paymentDate: payment?.paymentDate ?? '',
    paymentMethod: payment?.paymentMethod ?? 'transferencia',
    accountId: payment?.accountId ?? 'sicoob',
    receiverPersonId: receiverPersonId || undefined,
    receiverName: receiverName.trim(),
    receiverDocument: receiverDocument.trim(),
    receiverAddress: receiverAddress.trim(),
    competence: competence || (payment ? monthOf(payment.paymentDate) : ''),
    stage,
    conditions,
    place: place.trim(),
    date: date || payment?.paymentDate || '',
    receiver: { name: receiverName.trim() || '[recebedor]', role: 'Recebedor' },
  };

  const sameNumber = base ? data.documents.filter((d) => d.number === base.number) : [];
  const nextLabel = base
    ? `${base.number} (versão ${Math.max(...sameNumber.map((d) => d.version)) + 1})`
    : `${nextDocumentNumber(data.documents)} (versão 1)`;

  function clearError(field: keyof Errors) {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (!payment) e.transactionId = 'Escolha o pagamento registrado no Financeiro.';
    if (!receiverName.trim()) e.receiverName = 'Informe quem recebeu a prebenda.';
    if (!/^\d{4}-\d{2}$/.test(content.competence)) e.competence = 'Informe o mês de competência.';
    if (!place.trim()) e.place = 'Informe o local de emissão.';
    if (!isValidISODate(content.date)) e.date = 'Informe uma data válida.';
    return e;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const foundErrors = validate();
    setErrors(foundErrors);
    const first = Object.keys(foundErrors)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setConfirming(true);
  }

  function emit() {
    if (issuing.current) return;
    issuing.current = true;
    setConfirming(false);
    const doc = issueDocument({ type: 'recibo_prebenda', content }, unit, base);
    notify(`Recibo emitido: ${doc.number}, versão ${doc.version}.`);
    navigate(`/documentos/${doc.id}`, { replace: true });
  }

  const backTo = base ? `/documentos/${base.id}` : '/documentos';

  return (
    <>
      <Link to={backTo} className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        {base ? `${base.number} · versão ${base.version}` : 'Documentos'}
      </Link>
      <PageHeader
        title={base ? 'Nova versão do recibo de prebenda' : 'Recibo de prebenda pastoral'}
        description="O recibo usa um pagamento já registrado. Emitir ou reimprimir não cria outra despesa nem altera os saldos."
      />
      {base && (
        <p className="notice">
          Esta será uma nova versão de {base.number}. A versão {base.version} continua no histórico, e a assinatura dela não
          passa para a nova versão.
        </p>
      )}

      <div className="doc-editor">
        <form className="panel doc-form" onSubmit={handleSubmit} noValidate>
          {payments.length === 0 && !base ? (
            <p className="notice">
              Nenhum pagamento de prebenda registrado nesta unidade. Registre o pagamento no{' '}
              <Link to="/financeiro">Financeiro</Link> com a categoria “Prebenda pastoral” e volte aqui.
            </p>
          ) : null}
          <Field name="transactionId" label="Pagamento registrado" error={errors.transactionId}>
            <select
              id="f-transactionId"
              value={transactionId}
              onChange={(e) => {
                setTransactionId(e.target.value);
                clearError('transactionId');
              }}
            >
              <option value="">Escolha o pagamento</option>
              {payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatDate(p.date)} · {formatBRL(p.amountCents)} · {p.description}
                </option>
              ))}
            </select>
          </Field>
          {payment && (
            <dl className="details-list receipt-payment">
              <div>
                <dt>Valor</dt>
                <dd>
                  <strong>{formatBRL(payment.amountCents)}</strong>
                </dd>
              </div>
              <div>
                <dt>Por extenso</dt>
                <dd>{amountInWords(payment.amountCents)}</dd>
              </div>
              <div>
                <dt>Conta</dt>
                <dd>{ACCOUNT_LABELS[payment.accountId]}</dd>
              </div>
            </dl>
          )}

          <Field
            name="receiverPersonId"
            label="Pessoa do cadastro (opcional)"
            hint="Preenche o nome a partir do cadastro de Pessoas. Quem não está no cadastro pode ser digitado abaixo."
          >
            <select
              id="f-receiverPersonId"
              value={receiverPersonId}
              onChange={(e) => {
                const person = data.people.find((p) => p.id === e.target.value);
                setReceiverPersonId(e.target.value);
                if (person) {
                  setReceiverName(person.name);
                  clearError('receiverName');
                }
              }}
            >
              <option value="">Não está no cadastro</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.registration}
                </option>
              ))}
            </select>
          </Field>

          <Field name="receiverName" label="Beneficiário" error={errors.receiverName}>
            <input
              id="f-receiverName"
              type="text"
              value={receiverName}
              onChange={(e) => {
                setReceiverName(e.target.value);
                clearError('receiverName');
                // Nome digitado diferente do cadastro desfaz o vínculo com a pessoa
                const linked = data.people.find((p) => p.id === receiverPersonId);
                if (linked && e.target.value.trim() !== linked.name) setReceiverPersonId('');
              }}
              maxLength={100}
            />
          </Field>
          <div className="field-pair">
            <Field name="receiverDocument" label="CPF/RG (opcional)">
              <input
                id="f-receiverDocument"
                type="text"
                value={receiverDocument}
                onChange={(e) => setReceiverDocument(e.target.value)}
                maxLength={30}
              />
            </Field>
            <Field name="receiverAddress" label="Endereço (opcional)">
              <input
                id="f-receiverAddress"
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                maxLength={120}
              />
            </Field>
          </div>

          <div className="field-pair">
            <Field name="competence" label="Competência (mês)" error={errors.competence}>
              <input
                id="f-competence"
                type="month"
                value={content.competence}
                onChange={(e) => {
                  setCompetence(e.target.value);
                  clearError('competence');
                }}
              />
            </Field>
            <Field name="stage" label="Etapa do pagamento">
              <select id="f-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            name="conditions"
            label="Condições"
            hint="Texto do modelo recebido, revisável. Não gera prazos, cobranças nem cálculo de impostos."
          >
            <textarea id="f-conditions" rows={4} value={conditions} onChange={(e) => setConditions(e.target.value)} />
          </Field>

          <div className="field-pair">
            <Field name="place" label="Local" error={errors.place}>
              <input
                id="f-place"
                type="text"
                value={place}
                onChange={(e) => {
                  setPlace(e.target.value);
                  clearError('place');
                }}
                maxLength={80}
              />
            </Field>
            <Field name="date" label="Data do recibo" error={errors.date}>
              <input
                id="f-date"
                type="date"
                value={content.date}
                onChange={(e) => {
                  setDate(e.target.value);
                  clearError('date');
                }}
              />
            </Field>
          </div>

          <div className="dialog-actions">
            <Link to={backTo} className="button button-secondary">
              Cancelar
            </Link>
            <button type="submit" className="button button-primary">
              Revisar e emitir
            </button>
          </div>
        </form>

        <div className="doc-preview" aria-label="Prévia">
          <p className="doc-preview-label">Prévia</p>
          <PrebendaView content={content} />
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Emitir recibo de prebenda?"
        message={`O recibo de ${formatBRL(content.amountCents)} para ${content.receiverName} será registrado no histórico como ${nextLabel}. Nenhuma despesa nova será criada.`}
        confirmLabel="Emitir recibo"
        onCancel={() => setConfirming(false)}
        onConfirm={emit}
      />
    </>
  );
}
