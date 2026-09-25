import { describe, expect, it } from 'vitest';
import { createDemoData } from '../data/demo';
import type { IssuedDocument } from '../data/types';
import { suggestedLetterText } from '../lib/letter';
import { nextDocumentNumber, nextRegistration } from './store';

describe('documentos', () => {
  it('numera os documentos em sequência', () => {
    expect(nextDocumentNumber([])).toBe('DEMO-0001');
    expect(nextDocumentNumber([{ number: 'DEMO-0007' } as IssuedDocument])).toBe('DEMO-0008');
  });

  it('carta só declara o que foi marcado', () => {
    const base = {
      personName: 'Adriana Souza Lima',
      personRegistration: 'MCV-001',
      personClassification: 'membro' as const,
      personCongregation: 'Sede',
      destinationChurch: 'Igreja de Destino',
      destinationCity: 'Cidade/UF',
    };
    const none = suggestedLetterText({ ...base, declarations: [] });
    expect(none).not.toContain('Declaramos');
    expect(none).not.toContain('dízimos');
    const some = suggestedLetterText({ ...base, declarations: ['testemunho', 'vinculo'] });
    expect(some).toContain('Declaramos que o(a) irmão(ã) está em plena comunhão com esta igreja e tem bom testemunho entre os irmãos.');
    expect(some).not.toContain('dízimos');
  });
});

describe('matrícula', () => {
  it('continua a numeração da base', () => {
    expect(nextRegistration(createDemoData().people)).toBe('MCV-013');
  });

  it('usa o maior número existente, mesmo fora de ordem', () => {
    const people = createDemoData().people.slice(0, 2);
    people[0] = { ...people[0], registration: 'MCV-040' };
    expect(nextRegistration(people)).toBe('MCV-041');
  });
});
