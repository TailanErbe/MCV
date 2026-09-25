// Valor por extenso em reais, a partir dos mesmos centavos do lançamento.

const UNITS = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos',
  'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

/** 0 a 999. */
function upTo999(n: number): string {
  if (n === 100) return 'cem';
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h) parts.push(HUNDREDS[h]);
  if (rest) {
    if (rest < 20) parts.push(UNITS[rest]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
    }
  }
  return parts.join(' e ');
}

/** Inteiro por extenso (até 999.999.999). */
function integerWords(n: number): string {
  if (n === 0) return 'zero';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const units = n % 1000;
  const groups: string[] = [];
  if (millions) groups.push(millions === 1 ? 'um milhão' : `${upTo999(millions)} milhões`);
  if (thousands) groups.push(thousands === 1 ? 'mil' : `${upTo999(thousands)} mil`);
  if (units) {
    // "mil e quinhentos", "mil e vinte"; mas "mil quinhentos e vinte"
    const joiner = groups.length && (units < 100 || units % 100 === 0) ? ' e ' : ' ';
    return groups.join(' ') + (groups.length ? joiner : '') + upTo999(units);
  }
  return groups.join(' ');
}

export function amountInWords(cents: number): string {
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const parts: string[] = [];
  if (reais > 0) {
    const words = integerWords(reais);
    const exactMillions = reais >= 1_000_000 && reais % 1_000_000 === 0;
    parts.push(`${words}${exactMillions ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (centavos > 0) parts.push(`${integerWords(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  return parts.length ? parts.join(' e ') : 'zero real';
}
