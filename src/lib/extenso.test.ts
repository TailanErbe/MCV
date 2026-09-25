import { describe, expect, it } from 'vitest';
import { amountInWords } from './extenso';

describe('valor por extenso', () => {
  it.each([
    [150000, 'mil e quinhentos reais'],
    [280000, 'dois mil e oitocentos reais'],
    [123456, 'mil duzentos e trinta e quatro reais e cinquenta e seis centavos'],
    [51206, 'quinhentos e doze reais e seis centavos'],
    [10000, 'cem reais'],
    [11000, 'cento e dez reais'],
    [100, 'um real'],
    [1, 'um centavo'],
    [50, 'cinquenta centavos'],
    [100100, 'mil e um reais'],
    [210000, 'dois mil e cem reais'],
    [1500000, 'quinze mil reais'],
    [100000000, 'um milhão de reais'],
    [125000050, 'um milhão duzentos e cinquenta mil reais e cinquenta centavos'],
    [1999, 'dezenove reais e noventa e nove centavos'],
  ])('%i centavos → %s', (cents, words) => {
    expect(amountInWords(cents)).toBe(words);
  });
});
