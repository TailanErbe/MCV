import { describe, expect, it } from 'vitest';
import { formatMoneyInput, parseMoneyInput } from './money';
import { isValidISODate, todayISO } from './dates';

describe('leitura de valores digitados', () => {
  it.each([
    ['100', 10000],
    ['100,5', 10050],
    ['100,50', 10050],
    ['1.234,56', 123456],
    ['R$ 1.234,56', 123456],
    ['12.50', 1250],
    ['1.234', 123400],
    ['0,01', 1],
    ['0', 0],
  ])('"%s" vira %i centavos', (text, cents) => {
    expect(parseMoneyInput(text)).toBe(cents);
  });

  it.each(['', 'abc', '-5', '1,2,3', '10,555', '1.23.4', '12,3a'])('"%s" é inválido', (text) => {
    expect(parseMoneyInput(text)).toBeNull();
  });

  it('formata para digitação sem símbolo', () => {
    expect(formatMoneyInput(123456)).toBe('1.234,56');
  });
});

describe('datas', () => {
  it('valida existência da data', () => {
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
  });

  it('hoje usa o relógio local', () => {
    expect(todayISO(new Date(2026, 8, 24, 23, 59))).toBe('2026-09-24');
  });
});
