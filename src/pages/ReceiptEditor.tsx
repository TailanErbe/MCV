import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ReceiptView } from '../components/ReceiptView';
import { ConfirmDialog, Field, PageHeader } from '../components/ui';
import { ACCOUNT_LABELS } from '../data/labels';
import type { ReceiptContent } from '../data/types';
import { formatDate, isValidISODate } from '../lib/dates';
import { amountInWords } from '../lib/extenso';
import { formatBRL } from '../lib/money';
import { nextDocumentNumber, useStore } from '../state/store';

type Errors = Partial<
  Record<'transactionId' | 'receiverName' | 'installmentCurrent' | 'installmentTotal' | 'landDescription' | 'place' | 'date', string>
>;

export function ReceiptEditor() {
  const { data, issueDocument, notify, unit, unitTransactions } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const found = data.documents.find((d) => d.id === params.get('base'));
  const base = found?.type === 'recibo_terreno' ? found : undefined;

  // Só pagamentos de terreno já registrados; emitir não cria outra despesa.
  const payments = unitTransactions
    .filter((tx) => tx.kind === 'saida' && tx.category === 'terreno')
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const [transactionId, setTransactionId] = useState(base?.content.transactionId ?? '');
  const [receiverPersonId, setReceiverPersonId] = useState(base?.content.receiverPersonId ?? '');
  const people = useMemo(() => [...data.people].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [data.people]);
  const [receiverName, setReceiverName] = useState(base?.content.receiverName ?? '');
  const [receiverDocument, setReceiverDocument] = useState(base?.content.receiverDocument ?? '');
  const [receiverAddress, setReceiverAddress] = useState(base?.content.receiverAddress ?? '');
  const [installmentCurrent, setInstallmentCurrent] = useState(base?.content.installmentCurrent?.toString() ?? '');
  const [installmentTotal, setInstallmentTotal] = useState(base?.content.installmentTotal?.toString() ?? '');
  const [landDescription, setLandDescription] = useState(base?.content.landDescription ?? '');
  const [place, setPlace] = useState(base?.content.place ?? data.settings.city);
  const [date, setDate] = useState(base?.content.date ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [confirming, setConfirming] = useState(false);
  const issuing = useRef(false);

  // Na nova versão, o pagamento vem da cópia emitida caso o lançamento tenha sido apagado.
  const tx = data.transactions.find((t) => t.id === transactionId);
  const payment = tx
    ? { amountCents: tx.amountCents, paymentDate: tx.date, paymentMethod: tx.method, accountId: tx.accountId }
    : base && base.content.transactionId === transactionId
      ? base.content
      : undefined;

  const current = Number(installmentCurrent);
  const total = Number(installmentTotal);
  const hasInstallment = installmentCurrent.trim() !== '' && installmentTotal.trim() !== '';

  const content: ReceiptContent = {
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
    installmentCurrent: hasInstallment ? current : undefined,
    installmentTotal: hasInstallment ? total : undefined,
    landDescription: landDescription.trim(),
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
    if (!receiverName.trim()) e.receiverName = 'Informe quem recebeu o pagamento.';
    const anyInstallment = installmentCurrent.trim() !== '' || installmentTotal.trim() !== '';
    if (anyInstallment) {
      if (!Number.isInteger(total) || total < 1) e.installmentTotal = 'Informe o total de parcelas (1 ou mais).';
      if (!Number.isInteger(current) || current < 1 || (Number.isInteger(total) && total >= 1 && current > total)) {
        e.installmentCurrent = 'A parcela atual deve ficar entre 1 e o total.';
      }
    }
    if (!landDescription.trim()) e.landDescription = 'Descreva o terreno ou informe o endereço.';
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
    const doc = issueDocument({ type: 'recibo_terreno', content }, unit, base);
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
        title={base ? 'Nova versão do recibo de terreno' : 'Recibo de pagamento de terreno'}
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
              Nenhuma despesa de terreno registrada. Registre o pagamento no <Link to="/financeiro">Financeiro</Link> com a
              categoria “Pagamento de terreno” e volte aqui.
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

          <Field name="receiverName" label="Recebedor" error={errors.receiverName}>
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
              placeholder="Nome de quem recebeu"
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
            <Field name="installmentCurrent" label="Parcela atual (opcional)" error={errors.installmentCurrent}>
              <input
                id="f-installmentCurrent"
                type="text"
                inputMode="numeric"
                value={installmentCurrent}
                onChange={(e) => {
                  setInstallmentCurrent(e.target.value.replace(/[^0-9]/g, ''));
                  clearError('installmentCurrent');
                }}
                maxLength={3}
              />
            </Field>
            <Field name="installmentTotal" label="Total de parcelas" error={errors.installmentTotal}>
              <input
                id="f-installmentTotal"
                type="text"
                inputMode="numeric"
                value={installmentTotal}
                onChange={(e) => {
                  setInstallmentTotal(e.target.value.replace(/[^0-9]/g, ''));
                  clearError('installmentTotal');
                }}
                maxLength={3}
              />
            </Field>
          </div>
          <p className="field-hint">A parcela é só descritiva: não cria contas futuras.</p>

          <Field name="landDescription" label="Terreno (descrição ou endereço)" error={errors.landDescription}>
            <input
              id="f-landDescription"
              type="text"
              value={landDescription}
              onChange={(e) => {
                setLandDescription(e.target.value);
                clearError('landDescription');
              }}
              placeholder="Ex.: lote destinado à nova congregação"
              maxLength={160}
            />
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
          <ReceiptView content={content} />
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Emitir recibo de terreno?"
        message={`O recibo de ${formatBRL(content.amountCents)} para ${content.receiverName} será registrado no histórico como ${nextLabel}. Nenhuma despesa nova será criada.`}
        confirmLabel="Emitir recibo"
        onCancel={() => setConfirming(false)}
        onConfirm={emit}
      />
    </>
  );
}
