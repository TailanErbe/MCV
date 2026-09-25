import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173/';
const OUT = fileURLToPath(new URL('./capturas/', import.meta.url));
const results = [];
process.on('uncaughtException', (e) => {
  console.log(results.join('\n'));
  console.log('ERRO:', e.message.split('\n')[0]);
  process.exit(1);
});
const ok = (n, c, e = '') => results.push(`${c ? 'OK  ' : 'FALHA'} ${n}${e ? ' — ' + e : ''}`);
const norm = (s) => s.replace(/\s/g, ' ');
const pause = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const pdfPages = (file) => (readFileSync(file, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('igreja-mcv-demonstracao')).data);

await page.goto(BASE + '#/documentos');
await page.waitForSelector('.model-list');
ok('recibo de terreno com ação de emitir', await page.locator('a:has-text("Emitir recibo de terreno")').isVisible());
ok('prebenda com sua própria ação', (await page.locator('.model-list li', { hasText: 'prebenda' }).locator('a').count()) === 1);
await page.click('a:has-text("Emitir recibo de terreno")');
await page.waitForSelector('.doc-form');

const opts = await page.locator('#f-transactionId option').allInnerTexts();
ok('lista só pagamentos de terreno registrados', opts.length === 3 && opts.slice(1).every((o) => o.includes('Terreno')), opts.join(' | '));

await page.click('button:has-text("Revisar e emitir")');
ok('validação: pagamento, recebedor e terreno', (await page.locator('#f-transactionId-error').isVisible()) && (await page.locator('#f-receiverName-error').isVisible()) && (await page.locator('#f-landDescription-error').isVisible()));

await page.selectOption('#f-transactionId', 't26');
const pay = norm(await page.locator('.receipt-payment').innerText());
ok('valor vem do lançamento (R$ 1.500,00)', pay.includes('R$ 1.500,00'));
ok('valor por extenso automático', pay.includes('mil e quinhentos reais'));
ok('data do recibo parte da data do pagamento', (await page.inputValue('#f-date')) === '2026-09-15');

await page.fill('#f-receiverName', 'Vendedor Fictício da Silva');
await page.fill('#f-landDescription', 'lote 12, quadra B, endereço fictício');
await page.fill('#f-installmentCurrent', '5');
await page.fill('#f-installmentTotal', '4');
await page.click('button:has-text("Revisar e emitir")');
ok('parcela maior que o total é recusada', (await page.locator('#f-installmentCurrent-error').innerText()) === 'A parcela atual deve ficar entre 1 e o total.');
await page.fill('#f-installmentCurrent', '0');
await page.fill('#f-installmentTotal', '10');
await page.click('button:has-text("Revisar e emitir")');
ok('parcela zero é recusada', await page.locator('#f-installmentCurrent-error').isVisible());
await page.fill('#f-installmentCurrent', '4');
await page.fill('#f-installmentTotal', '');
await page.click('button:has-text("Revisar e emitir")');
ok('parcela sem total é recusada', (await page.locator('#f-installmentTotal-error').innerText()).startsWith('Informe o total'));
await page.fill('#f-installmentTotal', '10');
await page.fill('#f-receiverDocument', '000.000.000-00');

const preview = norm(await page.locator('.doc-preview .receipt').innerText());
ok('prévia com valor, extenso e parcela', preview.includes('R$ 1.500,00 (mil e quinhentos reais)') && preview.includes('da parcela 4 de 10'));
ok('prévia identificada e sem número', preview.includes('Prévia — ainda não emitido') && preview.includes('DEMONSTRAÇÃO — dados fictícios — sem validade oficial'));
await page.screenshot({ path: OUT + 's5b-editor.png', fullPage: true });

await page.click('button:has-text("Revisar e emitir")');
ok('confirmação avisa que nenhuma despesa será criada', norm(await page.locator('dialog[open]').innerText()).includes('Nenhuma despesa nova será criada'));
await page.click('dialog[open] button:has-text("Emitir recibo")');
await page.waitForSelector('.sign-panel');
await pause();
let data = await state();
ok('recibo emitido DEMO-0001 v1', data.documents.length === 1 && data.documents[0].type === 'recibo_terreno' && data.documents[0].number === 'DEMO-0001');
ok('emitir não cria despesa', data.transactions.length === 60);
ok('recibo guarda o vínculo com o lançamento', data.documents[0].content.transactionId === 't26' && data.documents[0].content.amountCents === 150000);
const v1Id = data.documents[0].id;

// Assinatura do recebedor
await page.click('button:has-text("Assinar como recebedor")');
await page.waitForSelector('dialog[open] canvas');
const box = await page.locator('dialog[open] canvas').boundingBox();
await page.mouse.move(box.x + 40, box.y + 100);
await page.mouse.down();
for (let i = 0; i < 25; i++) await page.mouse.move(box.x + 40 + i * 12, box.y + 100 + Math.cos(i / 2) * 30);
await page.mouse.up();
await page.check('dialog[open] .check-row input');
await page.click('dialog[open] button:has-text("Confirmar assinatura")');
await pause();
data = await state();
ok('recebedor assinou a versão 1', data.documents[0].signatures.receiver?.version === 1 && data.documents[0].signatures.receiver?.signerName === 'Vendedor Fictício da Silva');
await page.screenshot({ path: OUT + 's5b-recibo.png', fullPage: true });

// Impressão (e reimpressão não cria lançamento)
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: OUT + 's5b-recibo.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
ok('recibo impresso em uma página A4', pdfPages(OUT + 's5b-recibo.pdf') === 1, String(pdfPages(OUT + 's5b-recibo.pdf')));
ok('reimprimir não cria lançamento', (await state()).transactions.length === 60);

// Saldos inalterados
await page.goto(BASE + '#/');
await page.waitForSelector('.balance');
ok('saldos inalterados após emitir recibo', norm(await page.locator('.balance-total .balance-value').innerText()) === 'R$ 22.293,83');

// Alterar o lançamento não muda o recibo emitido
await page.goto(BASE + '#/financeiro');
await page.click('.ledger button.link-button:has-text("parcela 4 de 10")');
await page.click('dialog[open] button:has-text("Corrigir lançamento")');
await page.fill('#f-amount', '1600');
await page.click('dialog[open] button:has-text("Salvar correção")');
await pause();
await page.goto(BASE + `#/documentos/${v1Id}`);
await page.waitForSelector('.receipt');
ok('recibo emitido mantém o valor da emissão', norm(await page.locator('.receipt').innerText()).includes('R$ 1.500,00 (mil e quinhentos reais)'));

// Nova versão: usa o valor atual do lançamento e pede nova assinatura
await page.click('a:has-text("Criar nova versão")');
await page.waitForSelector('.doc-form');
ok('nova versão parte dos dados emitidos', (await page.inputValue('#f-receiverName')) === 'Vendedor Fictício da Silva' && (await page.inputValue('#f-installmentCurrent')) === '4');
ok('nova versão mostra o valor corrigido do lançamento', norm(await page.locator('.receipt-payment').innerText()).includes('mil e seiscentos reais'));
await page.click('button:has-text("Revisar e emitir")');
await page.click('dialog[open] button:has-text("Emitir recibo")');
await page.waitForSelector('.sign-panel');
await pause();
data = await state();
const v2 = data.documents.find((d) => d.version === 2);
ok('versão 2 sem assinatura e v1 preservada', v2 && !v2.signatures.receiver && !!data.documents.find((d) => d.version === 1).signatures.receiver);
ok('ainda nenhuma despesa criada', data.transactions.length === 60);

await page.goto(BASE + '#/documentos');
ok('histórico com o tipo do documento', (await page.locator('.history-table').innerText()).includes('Recibo de pagamento de terreno'));

ok('sem erros no console', errors.length === 0, errors.join(' | '));

// Celular
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(BASE + '#/documentos/recibo-terreno/novo');
await mp.waitForSelector('.doc-form');
await mp.selectOption('#f-transactionId', 't08');
ok('celular: editor do recibo sem rolagem horizontal', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await mp.screenshot({ path: OUT + 's5b-m-editor.png', fullPage: true });
await m.close();

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações`);
