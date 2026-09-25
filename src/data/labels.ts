import type {
  AccountId,
  ExpenseCategory,
  IncomeCategory,
  PaymentMethod,
  PersonClass,
  TxKind,
} from './types';

export const ACCOUNT_LABELS: Record<AccountId, string> = {
  especie: 'Dinheiro em espécie',
  sicoob: 'Banco Sicoob',
};

export const INCOME_CATEGORIES: IncomeCategory[] = ['dizimo', 'oferta', 'missoes', 'congregacao'];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'prebenda',
  'terreno',
  'energia',
  'agua',
  'manutencao',
  'limpeza',
  'acao_social',
  'escritorio',
  'repasse_sede',
  'outras',
];

export const CATEGORY_LABELS: Record<IncomeCategory | ExpenseCategory, string> = {
  dizimo: 'Dízimo',
  oferta: 'Oferta',
  missoes: 'Missões',
  congregacao: 'Recebido de congregação',
  prebenda: 'Prebenda pastoral',
  terreno: 'Pagamento de terreno',
  energia: 'Energia elétrica',
  agua: 'Água',
  manutencao: 'Manutenção',
  limpeza: 'Limpeza',
  acao_social: 'Ação social',
  escritorio: 'Material de escritório',
  repasse_sede: 'Repasse à sede',
  outras: 'Outras despesas',
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  transferencia: 'Transferência',
  deposito: 'Depósito',
  boleto: 'Boleto',
  cartao_debito: 'Cartão de débito',
  cartao_credito: 'Cartão de crédito',
};

export const PERSON_CLASS_LABELS: Record<PersonClass, string> = {
  obreiro: 'Obreiro',
  membro: 'Membro / congregado',
  doador: 'Outro doador',
};

/** Formas aceitas em cada conta. Espécie é sempre dinheiro; as demais passam pelo Sicoob. */
export const METHODS_BY_ACCOUNT: Record<AccountId, Record<TxKind, PaymentMethod[]>> = {
  especie: { entrada: ['dinheiro'], saida: ['dinheiro'] },
  sicoob: {
    entrada: ['pix', 'transferencia', 'deposito', 'cartao_debito', 'cartao_credito'],
    saida: ['pix', 'transferencia', 'boleto', 'cartao_debito', 'cartao_credito'],
  },
};

/** Descrição gravada nos recebimentos, conforme a categoria. */
export const INCOME_DESCRIPTIONS: Record<IncomeCategory, string> = {
  dizimo: 'Dízimo',
  oferta: 'Oferta',
  missoes: 'Oferta de missões',
  congregacao: 'Valores recebidos da congregação',
};
