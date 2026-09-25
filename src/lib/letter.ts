import { PERSON_CLASS_LABELS } from '../data/labels';
import type { LetterDeclaration, PersonClass } from '../data/types';

// Texto adaptado para a demonstração, sujeito à aprovação da igreja.
// As declarações são marcadas pela secretaria; nada é deduzido do financeiro.

export const DECLARATION_TEXT: Record<LetterDeclaration, string> = {
  vinculo: 'está em plena comunhão com esta igreja',
  testemunho: 'tem bom testemunho entre os irmãos',
  dizimos: 'é fiel nos dízimos',
  frequencia: 'é frequente aos cultos',
};

export const DECLARATION_LABELS: Record<LetterDeclaration, string> = {
  vinculo: 'Vínculo: está em plena comunhão com a igreja',
  testemunho: 'Testemunho: tem bom testemunho',
  dizimos: 'Dízimos: é fiel nos dízimos',
  frequencia: 'Frequência: é frequente aos cultos',
};

export const DECLARATION_ORDER: LetterDeclaration[] = ['vinculo', 'testemunho', 'frequencia', 'dizimos'];

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** 2026-09-24 -> "24 de setembro de 2026". */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export interface LetterTextInput {
  personName: string;
  personRegistration: string;
  personClassification: PersonClass;
  personCongregation: string;
  destinationChurch: string;
  destinationCity: string;
  declarations: LetterDeclaration[];
}

/** Texto sugerido da carta; a secretaria pode editá-lo antes de emitir. */
export function suggestedLetterText(input: LetterTextInput): string {
  const destination = [input.destinationChurch.trim(), input.destinationCity.trim()].filter(Boolean).join(', ');
  const classification = PERSON_CLASS_LABELS[input.personClassification].toLowerCase();
  const paragraphs = [
    `À ${destination || '[igreja de destino]'}.`,
    `Recomendamos o(a) irmão(ã) ${input.personName || '[nome]'}, matrícula ${input.personRegistration || '[matrícula]'}, ${classification} da ${input.personCongregation || '[congregação]'} desta igreja.`,
  ];
  const declared = DECLARATION_ORDER.filter((d) => input.declarations.includes(d)).map((d) => DECLARATION_TEXT[d]);
  if (declared.length > 0) {
    paragraphs.push(`Declaramos que o(a) irmão(ã) ${joinList(declared)}.`);
  }
  paragraphs.push('Solicitamos que seja recebido(a) com a devida consideração cristã.');
  return paragraphs.join('\n\n');
}
