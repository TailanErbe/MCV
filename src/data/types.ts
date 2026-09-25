// Tipos da demonstração. Valores monetários sempre em centavos inteiros;
// datas de lançamento como texto AAAA-MM-DD (data local, sem fuso).

export type AccountId = 'especie' | 'sicoob';

/** Unidade: "Sede" ou o nome de uma congregação (lista em DemoData.congregations). */
export type Unit = string;

export interface Account {
  id: AccountId;
  unit: Unit;
  name: string;
  /** Saldo na data de abertura da demonstração (DemoData.openingDate). */
  openingBalanceCents: number;
}

export type TxKind = 'entrada' | 'saida';

export type IncomeCategory = 'dizimo' | 'oferta' | 'missoes' | 'congregacao';

export type ExpenseCategory =
  | 'prebenda'
  | 'terreno'
  | 'energia'
  | 'agua'
  | 'manutencao'
  | 'limpeza'
  | 'acao_social'
  | 'escritorio'
  | 'repasse_sede'
  | 'outras';

export type Category = IncomeCategory | ExpenseCategory;

export type PaymentMethod =
  | 'dinheiro'
  | 'pix'
  | 'transferencia'
  | 'deposito'
  | 'boleto'
  | 'cartao_debito'
  | 'cartao_credito';

export interface Transaction {
  id: string;
  /** Unidade dona do lançamento; cada unidade tem suas próprias contas. */
  unit: Unit;
  kind: TxKind;
  date: string;
  amountCents: number;
  accountId: AccountId;
  method: PaymentMethod;
  category: Category;
  description: string;
  /** Recebimentos: pessoa opcional (ofertas podem ser anônimas). */
  personId?: string;
  /** Recebimentos: congregação de origem, opcional. */
  origin?: string;
  /** Despesas: responsável pelo pagamento. */
  responsible?: string;
}

export type PersonClass = 'obreiro' | 'membro' | 'doador';

export interface Person {
  id: string;
  name: string;
  registration: string;
  classification: PersonClass;
  congregation: string;
  phone?: string;
  /** Foto anexada pela secretaria (imagem local). */
  photo?: string;
}

export interface Signatory {
  name: string;
  role: string;
}

export interface Settings {
  churchName: string;
  compactName: string;
  cnpj: string;
  address: string;
  city: string;
  pastor: Signatory;
  secretary: Signatory;
  treasurer: Signatory;
}

export interface DemoData {
  openingDate: string;
  accounts: Account[];
  congregations: string[];
  people: Person[];
  transactions: Transaction[];
  settings: Settings;
  documents: IssuedDocument[];
}

// ------------------------------------------------------------------
// Documentos emitidos (carta de recomendação) e assinaturas ilustrativas
// ------------------------------------------------------------------

export type DocumentType = 'carta_recomendacao' | 'recibo_terreno' | 'recibo_prebenda';
export type SignerRole = 'pastor' | 'secretary' | 'receiver';
export type LetterDeclaration = 'vinculo' | 'testemunho' | 'dizimos' | 'frequencia';

export interface LetterContent {
  churchName: string;
  cnpj: string;
  address: string;
  personId: string;
  personName: string;
  personRegistration: string;
  personClassification: PersonClass;
  personCongregation: string;
  destinationChurch: string;
  destinationCity: string;
  declarations: LetterDeclaration[];
  body: string;
  place: string;
  date: string;
  pastor: Signatory;
  secretary: Signatory;
}

/** Recibo de pagamento de terreno, sempre ligado a uma despesa já registrada. */
export interface ReceiptContent {
  churchName: string;
  cnpj: string;
  address: string;
  transactionId: string;
  amountCents: number;
  amountWords: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  accountId: AccountId;
  /** Pessoa do cadastro único, quando o recebedor foi escolhido de lá. */
  receiverPersonId?: string;
  receiverName: string;
  receiverDocument: string;
  receiverAddress: string;
  installmentCurrent?: number;
  installmentTotal?: number;
  landDescription: string;
  place: string;
  date: string;
  receiver: Signatory;
}

/**
 * Recibo de prebenda pastoral, ligado a um pagamento já registrado.
 * Competência, etapa e condições são texto revisável: nada aqui gera
 * folha, recorrência, cálculo tributário ou agendamento.
 */
export interface PrebendaContent {
  churchName: string;
  cnpj: string;
  address: string;
  transactionId: string;
  amountCents: number;
  amountWords: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  accountId: AccountId;
  /** Pessoa do cadastro único, quando o recebedor foi escolhido de lá. */
  receiverPersonId?: string;
  receiverName: string;
  receiverDocument: string;
  receiverAddress: string;
  competence: string;
  stage: string;
  conditions: string;
  place: string;
  date: string;
  receiver: Signatory;
}

export interface SignatureRecord {
  signerName: string;
  signerRole: string;
  /** Desenho feito com dedo ou mouse. */
  image: string;
  signedAt: string;
  documentId: string;
  documentNumber: string;
  version: number;
}

interface IssuedBase {
  id: string;
  /** Unidade que emitiu (recibos seguem a unidade do pagamento; cartas são da sede). */
  unit: Unit;
  number: string;
  version: number;
  issuedAt: string;
  issuedBy: string;
  /** Versão anterior que este documento substitui. */
  supersedes?: string;
  signatures: Partial<Record<SignerRole, SignatureRecord>>;
}

/** O conteúdo é uma cópia do momento da emissão; a reimpressão usa só esta cópia. */
export type IssuedDocument =
  | (IssuedBase & { type: 'carta_recomendacao'; content: LetterContent })
  | (IssuedBase & { type: 'recibo_terreno'; content: ReceiptContent })
  | (IssuedBase & { type: 'recibo_prebenda'; content: PrebendaContent });

export type DocumentDraft =
  | { type: 'carta_recomendacao'; content: LetterContent }
  | { type: 'recibo_terreno'; content: ReceiptContent }
  | { type: 'recibo_prebenda'; content: PrebendaContent };
