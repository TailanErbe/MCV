import type { ReactNode } from 'react';
import { ACCOUNT_LABELS, METHOD_LABELS } from '../data/labels';
import type {
  PrebendaContent,
  ReceiptContent,
  SignatureRecord,
  SignerRole,
} from '../data/types';
import { capitalize, formatDate, formatDateTime, monthLabel } from '../lib/dates';
import { longDate } from '../lib/letter';
import { formatBRL } from '../lib/money';

const LOGO_SRC = `${import.meta.env.BASE_URL}assets/logo-igreja.jpeg`;

type Signatures = Partial<Record<SignerRole, SignatureRecord>>;

/** Recibo de pagamento de terreno. O valor vem da despesa registrada, sem redigitação. */
export function ReceiptView({
  content,
  signatures,
  number,
  version,
}: {
  content: ReceiptContent;
  signatures?: Signatures;
  number?: string;
  version?: number;
}) {
  const installment =
    content.installmentCurrent && content.installmentTotal
      ? `da parcela ${content.installmentCurrent} de ${content.installmentTotal} `
      : '';
  return (
    <ReceiptFrame
      label="Recibo de pagamento de terreno"
      content={content}
      signatures={signatures}
      number={number}
      version={version}
      footer="Texto adaptado para demonstração, sujeito à aprovação da igreja. A parcela é apenas descritiva e não gera contas futuras. Assinatura desenhada apenas para ilustrar o fluxo, sem validade jurídica."
    >
      <p>
        Recebi da {content.churchName}, CNPJ {content.cnpj}, a importância de {formatBRL(content.amountCents)} (
        {content.amountWords}), referente ao pagamento {installment}do terreno{' '}
        {content.landDescription || '[descrição do terreno]'}.
      </p>
      <PaymentLine content={content} />
      <p>Para clareza, firmo o presente recibo.</p>
    </ReceiptFrame>
  );
}

/** Recibo de prebenda pastoral. Condições são texto revisável, sem regra automática. */
export function PrebendaView({
  content,
  signatures,
  number,
  version,
}: {
  content: PrebendaContent;
  signatures?: Signatures;
  number?: string;
  version?: number;
}) {
  const competence = /^\d{4}-\d{2}$/.test(content.competence) ? monthLabel(content.competence) : '[competência]';
  return (
    <ReceiptFrame
      label="Recibo de prebenda pastoral"
      content={content}
      signatures={signatures}
      number={number}
      version={version}
      footer="Texto adaptado para demonstração, sujeito à aprovação da igreja. Condições e referência legal pendentes de aprovação; nada aqui gera folha, recorrência ou cálculo de impostos. Assinatura desenhada apenas para ilustrar o fluxo, sem validade jurídica."
    >
      <p>
        Recebi da {content.churchName}, CNPJ {content.cnpj}, a importância de {formatBRL(content.amountCents)} (
        {content.amountWords}), referente à prebenda pastoral da competência de {competence}
        {content.stage ? ` (${content.stage.toLowerCase()})` : ''}.
      </p>
      <PaymentLine content={content} />
      {content.conditions.trim() && <p>Condições: {content.conditions.trim()}</p>}
      <p>Para clareza, firmo o presente recibo.</p>
    </ReceiptFrame>
  );
}

function PaymentLine({ content }: { content: ReceiptContent | PrebendaContent }) {
  if (!content.paymentDate) return null;
  return (
    <p>
      Pagamento efetuado em {formatDate(content.paymentDate)} por {METHOD_LABELS[content.paymentMethod].toLowerCase()}, com
      saída de {ACCOUNT_LABELS[content.accountId]}.
    </p>
  );
}

function ReceiptFrame({
  label,
  content,
  signatures = {},
  number,
  version,
  footer,
  children,
}: {
  label: string;
  content: ReceiptContent | PrebendaContent;
  signatures?: Signatures;
  number?: string;
  version?: number;
  footer: string;
  children: ReactNode;
}) {
  const record = signatures.receiver;
  return (
    <article className="letter receipt" aria-label={label}>
      <header className="letter-header">
        <img src={LOGO_SRC} width={1600} height={834} alt={content.churchName} className="letter-logo" />
        <div className="letter-church">
          <strong>{content.churchName}</strong>
          <span>CNPJ {content.cnpj}</span>
          <span>{content.address}</span>
        </div>
      </header>
      <p className="letter-demo">DEMONSTRAÇÃO — dados fictícios — sem validade oficial</p>

      <div className="receipt-title-row">
        <div>
          <h2 className="letter-title receipt-title">Recibo</h2>
          <p className="letter-number receipt-number">
            {capitalize(label.replace(/^Recibo de /, ''))} ·{' '}
            {number ? `Nº ${number} · versão ${version}` : 'Prévia — ainda não emitido'}
          </p>
        </div>
        <p className="receipt-amount">{formatBRL(content.amountCents)}</p>
      </div>

      <div className="letter-body">{children}</div>

      <p className="letter-place">
        {content.place}, {longDate(content.date)}.
      </p>

      <div className="letter-signatures receipt-signatures">
        <div className="letter-signature">
          <div className="letter-signature-area">
            {record && <img src={record.image} alt={`Assinatura ilustrativa de ${record.signerName}`} />}
          </div>
          <div className="letter-signature-line" />
          <strong>{content.receiverName || '[recebedor]'}</strong>
          <span>Recebedor</span>
          {content.receiverDocument && <span>CPF/RG: {content.receiverDocument}</span>}
          {content.receiverAddress && <span>{content.receiverAddress}</span>}
          {record ? (
            <small>
              Assinatura ilustrativa · {formatDateTime(record.signedAt)} · versão {record.version}
            </small>
          ) : (
            <small className="no-print">Assinatura pendente</small>
          )}
        </div>
      </div>

      <footer className="letter-footer">{footer}</footer>
    </article>
  );
}
