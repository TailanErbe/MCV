// Os 7 fluxos pedidos para a reunião, encadeados como um usuário faria.
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173/';
const OUT = fileURLToPath(new URL('./capturas/', import.meta.url));
const CHANNEL = process.env.BROWSER_CHANNEL ?? 'chrome';
const results = [];
process.on('uncaughtException', (e) => {
  console.log(results.join('\n'));
  console.log('ERRO:', e.message.split('\n')[0]);
  process.exit(1);
});
const ok = (n, c, e = '') => results.push(`${c ? 'OK  ' : 'FALHA'} ${n}${e ? ' — ' + e : ''}`);
const norm = (s) => s.replace(/\s/g, ' ');
const pause = (ms = 400) => new Promise((r) => setTimeout(r, ms));
const pdfText = (file) => readFileSync(file, 'latin1');
const pdfPages = (file) => (pdfText(file).match(/\/Type\s*\/Page[^s]/g) || []).length;

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('igreja-mcv-demonstracao')).data);
const balance = async (cls) => norm(await page.locator(`.balance-${cls} .balance-value`).innerText());
const nav = async (label) => {
  await page.click(`a.nav-link:has-text("${label}")`);
  await pause(150);
};

// Troca de perfil como uma pessoa faria (só o que muda).
async function asProfile(profile) {
  if ((await page.inputValue('#profile-select')) !== profile) {
    await page.selectOption('#profile-select', profile);
    await pause();
  }
}

async function saveTx(kind, fields) {
  await page.click(`button:has-text("${kind === 'entrada' ? 'Registrar recebimento' : 'Registrar despesa'}")`);
  await page.waitForSelector('dialog[open] form');
  if (fields.description) await page.fill('#f-description', fields.description);
  await page.fill('#f-amount', fields.amount);
  if (fields.category) await page.selectOption('#f-category', fields.category);
  if (fields.account) await page.check(`input[name="accountId"][value="${fields.account}"]`);
  if (fields.person) await page.selectOption('#f-personId', fields.person);
  await page.click(`dialog[open] button[type="submit"]`);
  await pause();
}

async function editTx(title, amount) {
  await page.click(`.ledger button.link-button:has-text("${title}")`);
  await page.click('dialog[open] button:has-text("Corrigir lançamento")');
  await page.fill('#f-amount', amount);
  await page.click('dialog[open] button:has-text("Salvar correção")');
  await pause();
}

// Cada signatário desenha um traço diferente, como na vida real.
async function drawSignature(style = 1) {
  const box = await page.locator('dialog[open] canvas').boundingBox();
  await page.mouse.move(box.x + 40, box.y + 110);
  await page.mouse.down();
  for (let i = 0; i < 28; i++) await page.mouse.move(box.x + 40 + i * 11, box.y + 105 - Math.sin(i / (2 + style)) * (30 + style * 8));
  await page.mouse.up();
  await page.check('dialog[open] .check-row input');
  await page.click('dialog[open] button:has-text("Confirmar assinatura")');
  await pause();
}

await page.goto(BASE);
await page.waitForSelector('.balance');

// ============ 1. Entrada, despesa, edição e saldos ============
ok('1. saldos iniciais de setembro', (await balance('especie')) === 'R$ 3.837,10' && (await balance('sicoob')) === 'R$ 18.456,73' && (await balance('total')) === 'R$ 22.293,83');
await saveTx('entrada', { amount: '100', category: 'dizimo', account: 'sicoob' });
ok('1. recebimento de R$ 100 soma só no Sicoob', (await balance('sicoob')) === 'R$ 18.556,73' && (await balance('especie')) === 'R$ 3.837,10');
await saveTx('saida', { description: 'Troca de lâmpadas (teste)', amount: '30', category: 'manutencao', account: 'sicoob' });
ok('1. despesa de R$ 30 desconta só no Sicoob', (await balance('sicoob')) === 'R$ 18.526,73' && (await balance('especie')) === 'R$ 3.837,10');
await nav('Financeiro');
await page.waitForSelector('.ledger');
await editTx('Troca de lâmpadas (teste)', '45,50');
const receiptRow = page.locator('.ledger tbody tr').filter({ hasText: /R\$\s100,00/ }).first();
await receiptRow.locator('button.link-button').click();
await page.click('dialog[open] button:has-text("Corrigir lançamento")');
await page.fill('#f-amount', '250');
await page.click('dialog[open] button:has-text("Salvar correção")');
await pause();
const ledger = norm(await page.locator('.ledger').innerText());
ok('1. lista mostra os valores editados', ledger.includes('R$ 250,00') && ledger.includes('R$ 45,50') && !ledger.includes('R$ 100,00'));
ok('1. edição não duplica lançamentos', (await state()).transactions.length === 62);
await nav('Visão geral');
ok('1. saldos após editar (Sicoob R$ 18.661,23; total R$ 22.498,33)', (await balance('sicoob')) === 'R$ 18.661,23' && (await balance('total')) === 'R$ 22.498,33', `${await balance('sicoob')} / ${await balance('total')}`);
await nav('Relatórios');
const rep1 = norm(await page.locator('.report').innerText());
ok('1. relatório com os mesmos saldos', rep1.includes('R$ 18.661,23') && rep1.includes('R$ 22.498,33'));

// ============ 2. Mês, conta, filtros e relatório ============
await nav('Visão geral');
ok('2. mês corrente mostra "Saldo atual" e "Saldo inicial do mês"', (await page.locator('.balance-label').first().innerText()) === 'Saldo atual' && (await page.locator('.balances').innerText()).includes('Saldo inicial do mês'));
await page.selectOption('#month-select', '2026-08');
ok('2. mês passado mostra "Saldo ao final do período"', (await page.locator('.balance-label').first().innerText()) === 'Saldo ao final do período');
ok('2. saldos de agosto não mudaram com os testes de setembro', (await balance('total')) === 'R$ 21.518,29');
const recentDates = await page.locator('.recent-date').allInnerTexts();
ok('2. movimentações recentes respeitam o mês (agosto)', recentDates.length > 0 && recentDates.every((d) => d.endsWith('/08/2026')), recentDates.join(', '));
ok('2. título das recentes indica o mês', (await page.locator('#recentes-titulo').innerText()) === 'Movimentações recentes de agosto');
await nav('Financeiro');
ok('2. mês escolhido é mantido entre as telas', (await page.locator('#month-select').inputValue()) === '2026-08');
ok('2. agosto: 16 movimentos', (await page.locator('.ledger tbody tr').count()) === 16);
await page.selectOption('#filter-account', 'especie');
const aEsp = await page.locator('.ledger tbody tr').allInnerTexts();
ok('2. filtro de conta (agosto, espécie: 5)', aEsp.length === 5 && aEsp.every((r) => r.includes('Dinheiro em espécie')), String(aEsp.length));
await page.selectOption('#filter-kind', 'saida');
ok('2. filtro de conta + tipo (agosto, espécie, saídas: 1)', (await page.locator('.ledger tbody tr').count()) === 1);
await page.selectOption('#month-select', '2026-09');
await page.selectOption('#filter-account', 'sicoob');
const sSic = (await page.locator('.ledger tbody tr').allInnerTexts()).map(norm);
ok('2. setembro, Sicoob, saídas inclui a despesa editada', sSic.some((r) => r.includes('R$ 45,50')) && sSic.every((r) => r.includes('Banco Sicoob')));
await nav('Relatórios');
await page.selectOption('#month-select', '2026-08');
const repAug = norm(await page.locator('.report').innerText());
ok('2. relatório de agosto: período e saldo final R$ 21.518,29', repAug.includes('01/08/2026 a 31/08/2026') && repAug.includes('R$ 21.518,29') && !repAug.includes('R$ 250,00'));
await page.selectOption('#month-select', '2026-09');
const repSep = norm(await page.locator('.report').innerText());
ok('2. relatório de setembro parte do saldo de agosto', repSep.includes('R$ 21.518,29') && repSep.includes('R$ 22.498,33'));

// ============ 3. Cadastro único: cadastrar, usar no financeiro e reutilizar ============
await asProfile('secretaria');
await page.click('button:has-text("Cadastrar pessoa")');
await page.fill('#f-name', 'Tiago Ramos Figueira');
await page.selectOption('#f-classification', 'obreiro');
await page.selectOption('#f-congregation', 'Congregação Boa Vista');
await page.click('dialog[open] button:has-text("Salvar cadastro")');
await page.waitForSelector('.person-sheet');
await pause();
const personUrl = page.url();
ok('3. pessoa cadastrada com matrícula MCV-013', norm(await page.locator('.person-sheet').innerText()).includes('MCV-013'));
await asProfile('sede');
await page.click('button:has-text("Registrar recebimento")');
await page.waitForSelector('dialog[open] form');
const option = await page.locator('#f-personId option', { hasText: 'Tiago Ramos Figueira' }).innerText();
ok('3. nova pessoa aparece no financeiro com matrícula', option === 'Tiago Ramos Figueira · MCV-013', option);
const tiagoId = await page.locator('#f-personId option', { hasText: 'Tiago Ramos Figueira' }).getAttribute('value');
await page.selectOption('#f-category', 'oferta');
await page.selectOption('#f-personId', tiagoId);
ok('3. origem pré-preenchida pelo cadastro', (await page.inputValue('#f-origin')) === 'Congregação Boa Vista');
ok('3. aviso de preenchimento pelo cadastro', (await page.locator('#f-origin-hint').innerText()).includes('cadastro'));
await page.selectOption('#f-origin', 'Sede');
await page.selectOption('#f-personId', 'p03');
ok('3. origem alterada à mão não é sobrescrita', (await page.inputValue('#f-origin')) === 'Sede');
await page.selectOption('#f-origin', '');
await page.selectOption('#f-personId', tiagoId);
ok('3. origem volta a vir do cadastro se estiver vazia', (await page.inputValue('#f-origin')) === 'Congregação Boa Vista');
await page.fill('#f-amount', '80');
await page.check('input[name="accountId"][value="especie"]');
await page.click('dialog[open] button:has-text("Salvar recebimento")');
await pause();
ok('3. oferta de R$ 80 em espécie (espécie R$ 3.917,10)', (await balance('especie')) === 'R$ 3.917,10');
const txTiago = (await state()).transactions.find((t) => t.personId === tiagoId);
ok('3. lançamento guarda o vínculo com a pessoa e a origem', txTiago?.origin === 'Congregação Boa Vista');
await asProfile('secretaria');
await page.goto(personUrl);
await page.click('button:has-text("Editar cadastro")');
await page.fill('#f-name', 'Tiago Ramos Figueira Neto');
await page.click('dialog[open] button:has-text("Salvar cadastro")');
await pause();
await asProfile('sede');
await nav('Financeiro');
ok('3. nome corrigido no cadastro aparece no financeiro', (await page.locator('.ledger').innerText()).includes('Tiago Ramos Figueira Neto'));
await asProfile('secretaria');
await page.goto(personUrl);
await page.click('a:has-text("Emitir carta de recomendação")');
await page.waitForSelector('.doc-form');
ok('3. carta aberta pela ficha já vem com a pessoa', (await page.inputValue('#f-personId')) === tiagoId);
const letterPreview = norm(await page.locator('.doc-preview .letter').innerText());
ok('3. carta reutiliza nome, matrícula, classificação e congregação', letterPreview.includes('Tiago Ramos Figueira Neto, matrícula MCV-013, obreiro da Congregação Boa Vista'));

// ============ 5. Documento, assinatura e PDF (continua da carta) ============
await page.fill('#f-destinationChurch', 'Igreja de Destino Exemplo');
await page.fill('#f-destinationCity', 'Cidade Exemplo/UF');
await page.check('label:has-text("Testemunho") input');
await page.click('button:has-text("Revisar e emitir")');
await page.click('dialog[open] button:has-text("Emitir carta")');
await page.waitForSelector('.sign-panel');
await pause();
const docUrl = page.url();
await page.click('button:has-text("Assinar como pastor")');
await page.waitForSelector('dialog[open] canvas');
await drawSignature();
await page.click('button:has-text("Assinar como secretaria")');
await page.waitForSelector('dialog[open] canvas');
await drawSignature(2);
const docs = (await state()).documents;
ok('5. carta emitida e assinada por pastor e secretaria', docs.length === 1 && !!docs[0].signatures.pastor && !!docs[0].signatures.secretary);
ok('5. assinaturas diferentes, ligadas à versão 1', docs[0].signatures.pastor.image !== docs[0].signatures.secretary.image && docs[0].signatures.pastor.version === 1);
await page.evaluate(() => {
  window.__printed = 0;
  window.print = () => (window.__printed += 1);
});
await page.click('button:has-text("Imprimir / salvar em PDF")');
ok('5. botão "Imprimir / salvar em PDF" abre a impressão do navegador', (await page.evaluate(() => window.__printed)) === 1);
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: OUT + 'fluxo-carta.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
ok('5. PDF da carta em uma página A4', pdfPages(OUT + 'fluxo-carta.pdf') === 1);

// Recibo com recebedor do cadastro
await asProfile('sede');
await page.goto(BASE + '#/documentos/recibo-terreno/novo');
await page.waitForSelector('.doc-form');
await page.selectOption('#f-transactionId', 't26');
await page.selectOption('#f-receiverPersonId', tiagoId);
ok('3. recibo: recebedor preenchido pelo cadastro', (await page.inputValue('#f-receiverName')) === 'Tiago Ramos Figueira Neto');
await page.fill('#f-receiverName', 'Outra Pessoa Fictícia');
ok('3. recibo: nome digitado diferente desfaz o vínculo', (await page.inputValue('#f-receiverPersonId')) === '');

// ============ 4. Foto e carteirinha ============
const png = Buffer.from(
  await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 480; c.height = 640;
    const g = c.getContext('2d');
    g.fillStyle = '#7fb3d5'; g.fillRect(0, 0, 480, 640);
    g.fillStyle = '#f4d35e'; g.beginPath(); g.arc(240, 260, 120, 0, Math.PI * 2); g.fill();
    return c.toDataURL('image/png').split(',')[1];
  }),
  'base64',
);
await asProfile('secretaria');
await page.goto(personUrl);
await page.click('button:has-text("Editar cadastro")');
await page.setInputFiles('#f-photo', { name: 'foto-teste.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('dialog[open] .photo-preview img');
await page.click('dialog[open] button:has-text("Salvar cadastro")');
await pause();
ok('4. foto na ficha', await page.locator('.person-photo img').isVisible());
await page.click('a:has-text("Gerar carteirinha")');
await page.waitForSelector('.idc');
const card = norm(await page.locator('.idc').innerText());
ok('4. carteirinha com foto e dados do cadastro', (await page.locator('.idc-photo img').isVisible()) && card.includes('Tiago Ramos Figueira Neto') && card.includes('MCV-013') && card.includes('Obreiro'));
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: OUT + 'fluxo-carteirinha.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
ok('4. carteirinha impressa em uma página', pdfPages(OUT + 'fluxo-carteirinha.pdf') === 1);

// ============ 6. Recarregar e conferir persistência ============
await asProfile('sede');
await page.goto(BASE);
await page.reload();
await page.waitForSelector('.balance');
ok('6. saldos mantidos após recarregar', (await balance('especie')) === 'R$ 3.917,10' && (await balance('sicoob')) === 'R$ 18.661,23');
const after = await state();
ok('6. lançamentos, pessoa, foto, documento e assinaturas mantidos', after.transactions.length === 63 && after.people.length === 13 && !!after.people.find((p) => p.id === tiagoId)?.photo && after.documents.length === 1 && !!after.documents[0].signatures.secretary);
await asProfile('secretaria');
await page.goto(docUrl);
await page.reload();
await page.waitForSelector('.letter');
ok('6. documento assinado abre após recarregar', (await page.locator('.letter-signature-area img').count()) === 2);

// ============ 7. Restaurar e conferir a base ============
await page.click('button:has-text("Restaurar demonstração")');
await page.click('dialog[open] button:has-text("Restaurar")');
await pause();
await asProfile('sede');
await page.goto(BASE);
await page.waitForSelector('.balance');
ok('7. saldos da base (total R$ 22.293,83)', (await balance('total')) === 'R$ 22.293,83' && (await balance('sicoob')) === 'R$ 18.456,73');
await page.reload();
await page.waitForSelector('.balance');
await pause();
const base = await state();
ok('7. base inicial: 60 movimentos (sede e congregações), 12 pessoas, nenhum documento', base.transactions.length === 60 && base.people.length === 12 && base.documents.length === 0);
ok('7. pessoa de teste e fotos removidas', !base.people.some((p) => p.name.startsWith('Tiago')) && base.people.every((p) => !p.photo));
ok('7. configurações de volta ao provisório', base.settings.cnpj === '00.000.000/0000-00');

// ============ Legibilidade ============
const small = await page.evaluate(() => {
  const el = document.querySelector('.recent-detail');
  const s = getComputedStyle(el);
  return { size: s.fontSize, color: s.color };
});
ok('textos secundários maiores (14px) e mais escuros', small.size === '14px' && small.color === 'rgb(70, 82, 95)', JSON.stringify(small));
ok('sem erros no console', errors.length === 0, errors.join(' | '));

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações (${CHANNEL})`);
