import type { IssuedDocument, Signatory, SignerRole } from '../data/types';

export const DOCUMENT_LABELS: Record<IssuedDocument['type'], string> = {
  carta_recomendacao: 'Carta de recomendação',
  recibo_terreno: 'Recibo de pagamento de terreno',
  recibo_prebenda: 'Recibo de prebenda pastoral',
};

export const ROLE_LABELS: Record<SignerRole, string> = {
  pastor: 'pastor',
  secretary: 'secretaria',
  receiver: 'recebedor',
};

/** Quem assina cada tipo de documento. */
export function signerRoles(doc: IssuedDocument): SignerRole[] {
  return doc.type === 'carta_recomendacao' ? ['pastor', 'secretary'] : ['receiver'];
}

export function signerFor(doc: IssuedDocument, role: SignerRole): Signatory {
  if (doc.type === 'carta_recomendacao') return role === 'secretary' ? doc.content.secretary : doc.content.pastor;
  return doc.content.receiver;
}

/** Pessoa a quem o documento se refere. */
export function documentSubject(doc: IssuedDocument): string {
  return doc.type === 'carta_recomendacao' ? doc.content.personName : doc.content.receiverName;
}

const EDITOR_PATHS: Record<IssuedDocument['type'], string> = {
  carta_recomendacao: '/documentos/carta/nova',
  recibo_terreno: '/documentos/recibo-terreno/novo',
  recibo_prebenda: '/documentos/recibo-prebenda/novo',
};

export function newVersionPath(doc: IssuedDocument): string {
  return `${EDITOR_PATHS[doc.type]}?base=${doc.id}`;
}
