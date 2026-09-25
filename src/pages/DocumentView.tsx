import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FilePenLine, PenLine, Printer } from 'lucide-react';
import { LetterView } from '../components/LetterView';
import { PrebendaView, ReceiptView } from '../components/ReceiptView';
import { SignatureDialog } from '../components/SignaturePad';
import { PageHeader } from '../components/ui';
import type { SignerRole } from '../data/types';
import { formatDateTime } from '../lib/dates';
import { DOCUMENT_LABELS, ROLE_LABELS, documentSubject, newVersionPath, signerFor, signerRoles } from '../lib/documents';
import { canSeeDocument } from '../lib/profiles';
import { useStore } from '../state/store';

export function DocumentView() {
  const { id } = useParams();
  const { data, signDocument, notify, profile, unit, readOnly } = useStore();
  const [signing, setSigning] = useState<SignerRole | null>(null);
  const doc = data.documents.find((d) => d.id === id);

  if (!doc || !canSeeDocument(doc, profile, unit)) {
    return (
      <>
        <Link to="/documentos" className="back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Documentos
        </Link>
        <section className="panel">
          <h1 className="not-found-title">{doc ? 'Documento indisponível neste perfil' : 'Documento não encontrado'}</h1>
          <p className="empty-text">
            {doc
              ? 'Na simulação, este documento pertence a outro perfil ou unidade.'
              : 'Ele pode ter sido apagado ao restaurar a demonstração.'}
          </p>
        </section>
      </>
    );
  }

  const latest = data.documents
    .filter((d) => d.number === doc.number)
    .reduce((a, b) => (b.version > a.version ? b : a), doc);
  const superseded = latest.id !== doc.id;
  const locked = superseded || readOnly;
  const typeLabel = DOCUMENT_LABELS[doc.type];
  const subject = documentSubject(doc);
  const label = `${typeLabel} ${doc.number}, versão ${doc.version} — ${subject}`;

  return (
    <>
      <Link to="/documentos" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Documentos
      </Link>
      <PageHeader
        title={`${typeLabel} ${doc.number}`}
        description={`Versão ${doc.version} · emitido em ${formatDateTime(doc.issuedAt)} por ${doc.issuedBy} · ${subject}`}
        actions={
          <div className="register-buttons">
            {!locked && (
              <Link to={newVersionPath(doc)} className="button button-secondary">
                <FilePenLine size={18} aria-hidden="true" />
                Criar nova versão
              </Link>
            )}
            <button type="button" className="button button-primary" onClick={() => window.print()}>
              <Printer size={18} aria-hidden="true" />
              Imprimir / salvar em PDF
            </button>
          </div>
        }
      />

      <div className="doc-editor">
        <div className="doc-side no-print">
          {superseded && (
            <p className="notice notice-warning no-print">
              Esta versão foi substituída pela versão {latest.version}. Ela continua no histórico para consulta e reimpressão, mas
              não pode mais ser assinada. <Link to={`/documentos/${latest.id}`}>Abrir a versão {latest.version}</Link>
            </p>
          )}

          <section className="panel sign-panel no-print" aria-labelledby="assinaturas-titulo">
            <div className="panel-header">
              <h2 id="assinaturas-titulo">Assinaturas desta versão</h2>
            </div>
            <ul className="sign-list">
              {signerRoles(doc).map((role) => {
                const signer = signerFor(doc, role);
                const record = doc.signatures[role];
                return (
                  <li key={role}>
                    <div>
                      <strong>{signer.name}</strong>
                      <span>{signer.role}</span>
                    </div>
                    {record ? (
                      <span className="sign-status sign-done">Assinada em {formatDateTime(record.signedAt)}</span>
                    ) : locked ? (
                      <span className="sign-status">{readOnly ? 'Pendente (consulta)' : 'Não assinada'}</span>
                    ) : (
                      <button type="button" className="button button-secondary" onClick={() => setSigning(role)}>
                        <PenLine size={17} aria-hidden="true" />
                        Assinar como {ROLE_LABELS[role]}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="field-hint">
              A impressão usa a cópia registrada na emissão. Mudanças posteriores no cadastro ou no lançamento não alteram este
              documento, e reimprimir não cria outro lançamento.
            </p>
          </section>
        </div>

        <div className="doc-preview">
          {doc.type === 'carta_recomendacao' ? (
            <LetterView content={doc.content} signatures={doc.signatures} number={doc.number} version={doc.version} />
          ) : doc.type === 'recibo_terreno' ? (
            <ReceiptView content={doc.content} signatures={doc.signatures} number={doc.number} version={doc.version} />
          ) : (
            <PrebendaView content={doc.content} signatures={doc.signatures} number={doc.number} version={doc.version} />
          )}
        </div>
      </div>

      <SignatureDialog
        open={signing !== null}
        signer={signerFor(doc, signing ?? signerRoles(doc)[0])}
        documentLabel={label}
        onCancel={() => setSigning(null)}
        onConfirm={(image) => {
          if (!signing) return;
          const signer = signerFor(doc, signing);
          signDocument(doc.id, signing, { signerName: signer.name, signerRole: signer.role, image });
          notify(`Assinatura de ${signer.name} registrada na versão ${doc.version}.`);
          setSigning(null);
        }}
      />
    </>
  );
}
