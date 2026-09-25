import { matchPath } from 'react-router-dom';
import type { IssuedDocument, Unit } from '../data/types';

// Simulação de perfis da demonstração: define o que cada função enxerga.
// Não é controle de acesso real; tudo continua no mesmo navegador.

export type Profile = 'sede' | 'congregacao' | 'secretaria';

export const SEDE: Unit = 'Sede';

export const PROFILE_LABELS: Record<Profile, string> = {
  sede: 'Tesouraria da sede',
  congregacao: 'Tesouraria da congregação',
  secretaria: 'Secretaria',
};

export const PROFILES: Profile[] = ['sede', 'congregacao', 'secretaria'];

export function homeFor(profile: Profile): string {
  return profile === 'secretaria' ? '/pessoas' : '/';
}

/** A tesouraria da sede só consulta as congregações; registra apenas na sede. */
export function isReadOnly(profile: Profile, unit: Unit): boolean {
  return profile === 'sede' && unit !== SEDE;
}

const FINANCE_ROUTES = ['/', '/financeiro', '/relatorios', '/documentos', '/documentos/:id'];
const RECEIPT_EDITORS = ['/documentos/recibo-terreno/novo', '/documentos/recibo-prebenda/novo'];
const SECRETARIA_ROUTES = [
  '/pessoas',
  '/pessoas/:id',
  '/pessoas/:id/carteirinha',
  '/documentos',
  '/documentos/carta/nova',
  '/documentos/:id',
  '/configuracoes',
];

export function canAccess(pathname: string, profile: Profile, unit: Unit): boolean {
  const routes =
    profile === 'secretaria'
      ? SECRETARIA_ROUTES
      : [
          ...FINANCE_ROUTES,
          ...(isReadOnly(profile, unit) ? [] : RECEIPT_EDITORS),
          ...(profile === 'sede' ? ['/configuracoes'] : []),
        ];
  return routes.some((path) => matchPath({ path, end: true }, pathname) !== null);
}

/** Cartas e declarações ficam com a secretaria; recibos, com a tesouraria da unidade. */
export function canSeeDocument(doc: IssuedDocument, profile: Profile, unit: Unit): boolean {
  if (profile === 'secretaria') return doc.type === 'carta_recomendacao';
  return doc.type !== 'carta_recomendacao' && (doc.unit ?? SEDE) === unit;
}

/** "da sede" ou "da Congregação ..." para textos corridos. */
export function unitPhrase(unit: Unit): string {
  return unit === SEDE ? 'da sede' : `da ${unit}`;
}
