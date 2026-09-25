import { Link } from 'react-router-dom';
import { FilePlus2 } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { formatDateTime } from '../lib/dates';
import { DOCUMENT_LABELS, ROLE_LABELS, documentSubject, signerRoles } from '../lib/documents';
import { canSeeDocument, unitPhrase } from '../lib/profiles';
import { useStore } from '../state/store';

export function Documents() {
  const { data, profile, unit, readOnly } = useStore();
  const isSecretaria = profile === 'secretaria';
  // Cartas e declarações ficam com a secretaria; recibos, com a tesouraria da unidade.
  const visible = data.documents.filter((d) => canSeeDocument(d, profile, unit));
  const history = [...visible].sort((a, b) =>
    a.issuedAt === b.issuedAt ? b.version - a.version : a.issuedAt < b.issuedAt ? 1 : -1,
  );
  const latestVersion = new Map<string, number>();
  for (const d of data.documents) latestVersion.set(d.number, Math.max(latestVersion.get(d.number) ?? 0, d.version));

  return (
    <>
      <PageHeader
        title={isSecretaria ? 'Cartas e declarações' : profile === 'sede' ? 'Documentos financeiros' : 'Recibos'}
        description={
          isSecretaria
            ? 'Carta de recomendação com declarações revisadas pela secretaria. Cada emissão fica registrada no histórico deste navegador.'
            : readOnly
              ? `Recibos ${unitPhrase(unit)}, somente para consulta.`
              : `Recibos ${unitPhrase(unit)}, emitidos a partir de pagamentos já registrados.`
        }
      />

      <section className="panel" aria-labelledby="modelos-titulo">
        <div className="panel-header">
          <h2 id="modelos-titulo">Modelos</h2>
        </div>
        <ul className="model-list">
          {isSecretaria && (
          <li>
            <div>
              <strong>Carta de recomendação</strong>
              <span>Preenchida a partir do cadastro da pessoa, com declarações revisadas pela secretaria e assinatura do pastor e da secretaria.</span>
            </div>
            <Link to="/documentos/carta/nova" className="button button-primary">
              <FilePlus2 size={18} aria-hidden="true" />
              Emitir carta de recomendação
            </Link>
          </li>
          )}
          {!isSecretaria && (
          <li>
            <div>
              <strong>Recibo de pagamento de terreno</strong>
              <span>Emitido a partir de uma despesa de terreno já registrada, sem lançar o valor de novo. O valor por extenso é calculado automaticamente.</span>
            </div>
            {!readOnly && (
              <Link to="/documentos/recibo-terreno/novo" className="button button-secondary">
                <FilePlus2 size={18} aria-hidden="true" />
                Emitir recibo de terreno
              </Link>
            )}
          </li>
          )}
          {!isSecretaria && (
          <li>
            <div>
              <strong>Recibo de prebenda pastoral</strong>
              <span>Emitido a partir de um pagamento de prebenda já registrado, com competência, etapa e condições revisáveis.</span>
            </div>
            {!readOnly && (
              <Link to="/documentos/recibo-prebenda/novo" className="button button-secondary">
                <FilePlus2 size={18} aria-hidden="true" />
                Emitir recibo de prebenda
              </Link>
            )}
          </li>
          )}
        </ul>
      </section>

      <section className="panel panel-flush" aria-labelledby="historico-titulo">
        <div className="panel-header panel-pad history-header">
          <h2 id="historico-titulo">Histórico de documentos</h2>
        </div>
        {history.length === 0 ? (
          <p className="empty-text panel-pad">
            {isSecretaria ? 'Nenhuma carta emitida ainda neste navegador.' : `Nenhum recibo emitido ${unitPhrase(unit)} neste navegador.`}
          </p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Número</th>
                <th scope="col">Documento</th>
                <th scope="col">Pessoa</th>
                <th scope="col">Emitido em</th>
                <th scope="col">Assinaturas</th>
              </tr>
            </thead>
            <tbody>
              {history.map((doc) => {
                const roles = signerRoles(doc);
                const signed = roles.filter((r) => doc.signatures[r]);
                const superseded = (latestVersion.get(doc.number) ?? 0) > doc.version;
                return (
                  <tr key={doc.id}>
                    <td data-label="Número">
                      <Link to={`/documentos/${doc.id}`} className="link-button">
                        {doc.number} · v{doc.version}
                      </Link>
                      {superseded && <span className="cell-detail">Substituída por versão mais recente</span>}
                    </td>
                    <td data-label="Documento">{DOCUMENT_LABELS[doc.type]}</td>
                    <td data-label="Pessoa">{documentSubject(doc)}</td>
                    <td data-label="Emitido em">
                      {formatDateTime(doc.issuedAt)}
                      <span className="cell-detail">por {doc.issuedBy}</span>
                    </td>
                    <td data-label="Assinaturas">
                      {signed.length === 0
                        ? 'Pendentes'
                        : signed.length === roles.length
                          ? roles.length === 2 ? 'Pastor e secretaria' : 'Assinado'
                          : `Só ${ROLE_LABELS[signed[0]]}`}
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
