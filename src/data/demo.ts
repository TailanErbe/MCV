import type {
  AccountId,
  Category,
  DemoData,
  PaymentMethod,
  Person,
  Transaction,
} from './types';

// Base de demonstração: todos os nomes, valores e contatos são fictícios.
// Nome e logo da igreja são a única identificação real, autorizada para a demo.

const TREASURER = 'Paulo Henrique Dias';

// Tesoureiros fictícios de cada congregação (lançam as despesas da própria unidade).
const UNIT_TREASURERS: Record<string, string> = {
  Sede: TREASURER,
  'Congregação Vila Esperança': 'Marta Silveira Lopes',
  'Congregação Jardim Primavera': 'Rogério Antunes Brito',
  'Congregação Boa Vista': 'Sandra Queiroz Melo',
};

export const CONGREGATIONS = [
  'Sede',
  'Congregação Vila Esperança',
  'Congregação Jardim Primavera',
  'Congregação Boa Vista',
];

const people: Person[] = [
  { id: 'p01', name: 'Adriana Souza Lima', registration: 'MCV-001', classification: 'membro', congregation: 'Sede', phone: '(00) 00000-0001' },
  { id: 'p02', name: 'Benedito Carvalho Neto', registration: 'MCV-002', classification: 'obreiro', congregation: 'Sede', phone: '(00) 00000-0002' },
  { id: 'p03', name: 'Cláudia Ferreira Rocha', registration: 'MCV-003', classification: 'membro', congregation: 'Congregação Vila Esperança' },
  { id: 'p04', name: 'Daniel Moreira Santos', registration: 'MCV-004', classification: 'obreiro', congregation: 'Sede', phone: '(00) 00000-0004' },
  { id: 'p05', name: 'Elaine Cristina Barros', registration: 'MCV-005', classification: 'membro', congregation: 'Congregação Jardim Primavera', phone: '(00) 00000-0005' },
  { id: 'p06', name: 'Fábio Nascimento Alves', registration: 'MCV-006', classification: 'membro', congregation: 'Sede' },
  { id: 'p07', name: 'Gisele Martins Prado', registration: 'MCV-007', classification: 'membro', congregation: 'Congregação Boa Vista', phone: '(00) 00000-0007' },
  { id: 'p08', name: 'Hélio Ramos Teixeira', registration: 'MCV-008', classification: 'doador', congregation: 'Sede' },
  { id: 'p09', name: 'Ivone Pereira Duarte', registration: 'MCV-009', classification: 'obreiro', congregation: 'Congregação Vila Esperança', phone: '(00) 00000-0009' },
  { id: 'p10', name: 'Jonas Albuquerque Reis', registration: 'MCV-010', classification: 'membro', congregation: 'Sede', phone: '(00) 00000-0010' },
  { id: 'p11', name: 'Luciana Campos Vieira', registration: 'MCV-011', classification: 'membro', congregation: 'Congregação Jardim Primavera' },
  { id: 'p12', name: 'Marcos Tavares Pinto', registration: 'MCV-012', classification: 'doador', congregation: 'Sede' },
];

function entrada(
  id: string,
  date: string,
  amountCents: number,
  category: Category,
  accountId: AccountId,
  method: PaymentMethod,
  description: string,
  extra: Partial<Pick<Transaction, 'personId' | 'origin' | 'unit'>> = {},
): Transaction {
  return { unit: 'Sede', id, kind: 'entrada', date, amountCents, category, accountId, method, description, ...extra };
}

function saida(
  id: string,
  date: string,
  amountCents: number,
  category: Category,
  accountId: AccountId,
  method: PaymentMethod,
  description: string,
  unit = 'Sede',
): Transaction {
  return { unit, id, kind: 'saida', date, amountCents, category, accountId, method, description, responsible: UNIT_TREASURERS[unit] };
}

const transactions: Transaction[] = [
  // Agosto de 2026
  entrada('t01', '2026-08-02', 35000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { personId: 'p01' }),
  entrada('t02', '2026-08-02', 41250, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo'),
  saida('t03', '2026-08-05', 48673, 'energia', 'sicoob', 'boleto', 'Conta de energia do templo sede'),
  saida('t04', '2026-08-06', 280000, 'prebenda', 'sicoob', 'transferencia', 'Prebenda pastoral de agosto'),
  entrada('t05', '2026-08-09', 28000, 'dizimo', 'especie', 'dinheiro', 'Dízimo', { personId: 'p04' }),
  entrada('t06', '2026-08-09', 19000, 'missoes', 'especie', 'dinheiro', 'Oferta de missões'),
  entrada('t07', '2026-08-12', 215000, 'congregacao', 'sicoob', 'pix', 'Valores recebidos da congregação', { origin: 'Congregação Vila Esperança' }),
  saida('t08', '2026-08-15', 150000, 'terreno', 'sicoob', 'transferencia', 'Terreno da nova congregação, parcela 3 de 10'),
  entrada('t09', '2026-08-16', 50000, 'oferta', 'sicoob', 'pix', 'Oferta', { personId: 'p08' }),
  entrada('t10', '2026-08-16', 60000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { personId: 'p06' }),
  saida('t11', '2026-08-18', 13790, 'limpeza', 'especie', 'dinheiro', 'Material de limpeza'),
  entrada('t12', '2026-08-23', 42000, 'dizimo', 'sicoob', 'transferencia', 'Dízimo', { personId: 'p03', origin: 'Congregação Vila Esperança' }),
  saida('t13', '2026-08-25', 14218, 'agua', 'sicoob', 'boleto', 'Conta de água do templo sede'),
  entrada('t14', '2026-08-28', 168000, 'congregacao', 'sicoob', 'deposito', 'Valores recebidos da congregação', { origin: 'Congregação Jardim Primavera' }),
  entrada('t15', '2026-08-30', 36500, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo'),
  saida('t16', '2026-08-30', 61240, 'acao_social', 'sicoob', 'cartao_debito', 'Alimentos para cestas da ação social'),

  // Setembro de 2026
  entrada('t17', '2026-09-01', 40000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { personId: 'p10' }),
  saida('t18', '2026-09-04', 51206, 'energia', 'sicoob', 'boleto', 'Conta de energia do templo sede'),
  saida('t19', '2026-09-05', 280000, 'prebenda', 'sicoob', 'transferencia', 'Prebenda pastoral de setembro'),
  entrada('t20', '2026-09-06', 43800, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo'),
  entrada('t21', '2026-09-06', 30000, 'dizimo', 'especie', 'dinheiro', 'Dízimo', { personId: 'p02' }),
  entrada('t22', '2026-09-06', 35000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { personId: 'p01' }),
  entrada('t23', '2026-09-10', 126000, 'congregacao', 'sicoob', 'pix', 'Valores recebidos da congregação', { origin: 'Congregação Boa Vista' }),
  saida('t24', '2026-09-12', 25000, 'manutencao', 'especie', 'dinheiro', 'Reparo no sistema de som'),
  entrada('t25', '2026-09-13', 27500, 'missoes', 'sicoob', 'pix', 'Oferta de missões', { personId: 'p11', origin: 'Congregação Jardim Primavera' }),
  saida('t26', '2026-09-15', 150000, 'terreno', 'sicoob', 'transferencia', 'Terreno da nova congregação, parcela 4 de 10'),
  entrada('t27', '2026-09-20', 51000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { personId: 'p05', origin: 'Congregação Jardim Primavera' }),
  entrada('t28', '2026-09-20', 38950, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo'),
  saida('t29', '2026-09-21', 16490, 'escritorio', 'sicoob', 'cartao_debito', 'Papel e tinta para impressora'),
  entrada('t30', '2026-09-22', 208000, 'congregacao', 'sicoob', 'pix', 'Valores recebidos da congregação', { origin: 'Congregação Vila Esperança' }),
];

// Congregações: cada uma com suas contas e lançamentos. Os repasses à sede têm a
// mesma data e o mesmo valor dos "Recebido de congregação" lançados na sede
// (t07, t14, t23 e t30). Não há consolidado da rede nesta demonstração.
const VE = 'Congregação Vila Esperança';
const JP = 'Congregação Jardim Primavera';
const BV = 'Congregação Boa Vista';

const congregationTransactions: Transaction[] = [
  // Congregação Vila Esperança
  entrada('ve01', '2026-08-03', 28600, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo', { unit: VE }),
  entrada('ve02', '2026-08-09', 31000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { unit: VE, personId: 'p09' }),
  entrada('ve03', '2026-08-10', 198000, 'dizimo', 'sicoob', 'deposito', 'Dízimos entregues no culto', { unit: VE }),
  saida('ve04', '2026-08-12', 215000, 'repasse_sede', 'sicoob', 'pix', 'Repasse à sede de agosto', VE),
  saida('ve05', '2026-08-20', 19840, 'energia', 'sicoob', 'boleto', 'Conta de energia da congregação', VE),
  entrada('ve06', '2026-08-24', 25450, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo', { unit: VE }),
  saida('ve07', '2026-09-05', 90000, 'prebenda', 'sicoob', 'transferencia', 'Prebenda do dirigente de setembro', VE),
  entrada('ve08', '2026-09-07', 30100, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo', { unit: VE }),
  entrada('ve09', '2026-09-13', 31000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { unit: VE, personId: 'p09' }),
  entrada('ve10', '2026-09-14', 201000, 'dizimo', 'sicoob', 'deposito', 'Dízimos entregues no culto', { unit: VE }),
  saida('ve11', '2026-09-15', 8690, 'limpeza', 'especie', 'dinheiro', 'Material de limpeza', VE),
  saida('ve12', '2026-09-18', 20570, 'energia', 'sicoob', 'boleto', 'Conta de energia da congregação', VE),
  saida('ve13', '2026-09-22', 208000, 'repasse_sede', 'sicoob', 'pix', 'Repasse à sede de setembro', VE),

  // Congregação Jardim Primavera
  entrada('jp01', '2026-08-02', 19800, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo', { unit: JP }),
  entrada('jp02', '2026-08-16', 152000, 'dizimo', 'sicoob', 'deposito', 'Dízimos entregues no culto', { unit: JP }),
  entrada('jp03', '2026-08-17', 12000, 'missoes', 'especie', 'dinheiro', 'Oferta de missões', { unit: JP }),
  saida('jp04', '2026-08-21', 8830, 'agua', 'sicoob', 'boleto', 'Conta de água da congregação', JP),
  saida('jp05', '2026-08-28', 168000, 'repasse_sede', 'sicoob', 'transferencia', 'Repasse à sede de agosto', JP),
  entrada('jp06', '2026-09-06', 21550, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo', { unit: JP }),
  entrada('jp07', '2026-09-13', 146000, 'dizimo', 'sicoob', 'deposito', 'Dízimos entregues no culto', { unit: JP }),
  saida('jp08', '2026-09-19', 24000, 'manutencao', 'especie', 'dinheiro', 'Tinta para a fachada', JP),
  saida('jp09', '2026-09-21', 9110, 'agua', 'sicoob', 'boleto', 'Conta de água da congregação', JP),

  // Congregação Boa Vista
  entrada('bv01', '2026-08-09', 14200, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo', { unit: BV }),
  entrada('bv02', '2026-08-16', 18000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { unit: BV, personId: 'p07' }),
  entrada('bv03', '2026-08-23', 82000, 'dizimo', 'sicoob', 'deposito', 'Dízimos entregues no culto', { unit: BV }),
  saida('bv04', '2026-08-26', 13260, 'energia', 'sicoob', 'boleto', 'Conta de energia da congregação', BV),
  entrada('bv05', '2026-09-06', 15600, 'oferta', 'especie', 'dinheiro', 'Oferta do culto de domingo', { unit: BV }),
  saida('bv06', '2026-09-10', 126000, 'repasse_sede', 'sicoob', 'pix', 'Repasse à sede de setembro', BV),
  entrada('bv07', '2026-09-14', 18000, 'dizimo', 'sicoob', 'pix', 'Dízimo', { unit: BV, personId: 'p07' }),
  saida('bv08', '2026-09-20', 6480, 'limpeza', 'especie', 'dinheiro', 'Material de limpeza', BV),
];

export const DEMO_DATA: DemoData = {
  openingDate: '2026-08-01',
  accounts: [
    { unit: 'Sede', id: 'especie', name: 'Dinheiro em espécie', openingBalanceCents: 185000 },
    { unit: 'Sede', id: 'sicoob', name: 'Banco Sicoob', openingBalanceCents: 1840000 },
    { unit: VE, id: 'especie', name: 'Dinheiro em espécie', openingBalanceCents: 42000 },
    { unit: VE, id: 'sicoob', name: 'Banco Sicoob', openingBalanceCents: 315000 },
    { unit: JP, id: 'especie', name: 'Dinheiro em espécie', openingBalanceCents: 31000 },
    { unit: JP, id: 'sicoob', name: 'Banco Sicoob', openingBalanceCents: 187000 },
    { unit: BV, id: 'especie', name: 'Dinheiro em espécie', openingBalanceCents: 18000 },
    { unit: BV, id: 'sicoob', name: 'Banco Sicoob', openingBalanceCents: 96000 },
  ],
  congregations: CONGREGATIONS,
  people,
  transactions: [...transactions, ...congregationTransactions],
  settings: {
    churchName: 'Igreja Evangélica Assembleia de Deus — Ministério Celebrando a Vitória',
    compactName: 'Celebrando a Vitória',
    cnpj: '00.000.000/0000-00',
    address: 'Endereço a confirmar',
    city: 'Cidade/UF a confirmar',
    pastor: { name: 'Pr. Samuel Andrade', role: 'Pastor presidente' },
    secretary: { name: 'Raquel Menezes Costa', role: 'Secretária' },
    treasurer: { name: TREASURER, role: 'Tesoureiro' },
  },
  documents: [],
};

export function createDemoData(): DemoData {
  return structuredClone(DEMO_DATA);
}
