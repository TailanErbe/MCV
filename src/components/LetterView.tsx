import type { LetterContent, SignatureRecord, SignerRole } from '../data/types';
import { formatDateTime } from '../lib/dates';
import { longDate } from '../lib/letter';

const LOGO_SRC = `${import.meta.env.BASE_URL}assets/logo-igreja.jpeg`;
const ROLES: ('pastor' | 'secretary')[] = ['pastor', 'secretary'];

/** Carta de recomendação em formato A4. Na prévia, sem número; emitida, com número e versão. */
export function LetterView({
  content,
  signatures = {},
  number,
  version,
}: {
  content: LetterContent;
  signatures?: Partial<Record<SignerRole, SignatureRecord>>;
  number?: string;
  version?: number;
}) {
  const paragraphs = content.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <article className="letter" aria-label="Carta de recomendação">
      <header className="letter-header">
        <img src={LOGO_SRC} width={1600} height={834} alt={content.churchName} className="letter-logo" />
        <div className="letter-church">
          <strong>{content.churchName}</strong>
          <span>CNPJ {content.cnpj}</span>
          <span>{content.address}</span>
        </div>
      </header>
      <p className="letter-demo">DEMONSTRAÇÃO — dados fictícios — sem validade oficial</p>

      <h2 className="letter-title">Carta de recomendação</h2>
      <p className="letter-number">
        {number ? `Nº ${number} · versão ${version}` : 'Prévia — ainda não emitida'}
      </p>

      <div className="letter-body">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <p className="letter-place">
        {content.place}, {longDate(content.date)}.
      </p>

      <div className="letter-signatures">
        {ROLES.map((role) => {
          const signer = content[role];
          const record = signatures[role];
          return (
            <div key={role} className="letter-signature">
              <div className="letter-signature-area">
                {record && <img src={record.image} alt={`Assinatura ilustrativa de ${record.signerName}`} />}
              </div>
              <div className="letter-signature-line" />
              <strong>{signer.name}</strong>
              <span>{signer.role}</span>
              {record ? (
                <small>
                  Assinatura ilustrativa · {formatDateTime(record.signedAt)} · versão {record.version}
                </small>
              ) : (
                <small className="no-print">Assinatura pendente</small>
              )}
            </div>
          );
        })}
      </div>

      <footer className="letter-footer">
        Texto adaptado para demonstração, sujeito à aprovação da igreja. Assinaturas desenhadas apenas para ilustrar o
        fluxo, sem validade jurídica.
      </footer>
    </article>
  );
}
