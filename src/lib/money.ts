const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos inteiros em reais: 123456 -> "R$ 1.234,56". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Valor com sinal explícito, para listas de movimentações. */
export function formatSigned(cents: number, kind: 'entrada' | 'saida'): string {
  return `${kind === 'entrada' ? '+' : '−'} ${formatBRL(Math.abs(cents))}`;
}

const MAX_CENTS = 99_999_999_99;

/**
 * Lê um valor digitado em reais e devolve centavos inteiros, sem passar por
 * ponto flutuante. Aceita "150", "150,5", "1.234,56", "R$ 1.234,56" e "12.50".
 * Devolve null se o texto não for um valor válido.
 */
export function parseMoneyInput(text: string): number | null {
  const s = text.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!s || !/^[\d.,]+$/.test(s)) return null;

  let intPart: string;
  let fracPart = '';
  if (s.includes(',')) {
    if (s.indexOf(',') !== s.lastIndexOf(',')) return null;
    [intPart, fracPart] = s.split(',');
    if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(intPart)) return null;
    intPart = intPart.replace(/\./g, '');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    const last = parts[parts.length - 1];
    if (parts.length === 2 && last.length <= 2) {
      // "12.50": ponto como separador decimal
      [intPart, fracPart] = parts;
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      intPart = s.replace(/\./g, '');
    } else {
      return null;
    }
  } else {
    intPart = s;
  }

  if (!/^\d+$/.test(intPart || '0') || !/^\d{0,2}$/.test(fracPart)) return null;
  const cents = Number(intPart || '0') * 100 + Number(fracPart.padEnd(2, '0') || '0');
  if (!Number.isSafeInteger(cents) || cents > MAX_CENTS) return null;
  return cents;
}

/** Valor para exibir num campo de digitação: 123456 -> "1.234,56". */
export function formatMoneyInput(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}
