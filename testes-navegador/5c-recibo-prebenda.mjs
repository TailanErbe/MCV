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
ok('tesouraria vê os dois recibos com ação de emitir', (await page.locator('.model-list a').count()) === 2);
await page.click('a:has-text("Emitir recibo de prebenda")');
await page.waitForSelector('.doc-form');
const opts = await page.locator('#f-transactionId option').allInnerTexts();
ok('lista só pagamentos de prebenda', opts.length === 3 && opts.slice(1).every((o) => o.includes('Prebenda')), opts.join(' | '));
ok('beneficiário sugerido pelo cadastro institucional', (await page.inputValue('#f-receiverName')) === 'Pr. Samuel Andrade');
ok('condições revisáveis com referência legal pendente', (await page.inputValue('#f-conditions')).includes('Referência legal: pendente de aprovação da igreja'));

await page.click('button:has-text("Revisar e emitir")');
ok('validação: pagamento obrigatório', await page.locator('#f-transactionId-error').isVisible());
await page.selectOption('#f-transactionId', 't19');
ok('extenso de R$ 2.800,00', norm(await page.locator('.receipt-payment').innerText()).includes('dois mil e oitocentos reais'));
ok('competência sugerida pelo mês do pagamento', (await page.inputValue('#f-competence')) === '2026-09');
await page.selectOption('#f-stage', 'Primeira parte');
await page.fill('#f-receiverName', '');
await page.click('button:has-text("Revisar e emitir")');
ok('beneficiário obrigatório', await page.locator('#f-receiverName-error').isVisible());
await page.fill('#f-receiverName', 'Pr. Samuel Andrade');
const preview = norm(await page.locator('.doc-preview .receipt').innerText());
ok('prévia com competência e etapa', preview.includes('competência de setembro de 2026 (primeira parte)'));
ok('prévia com condições editáveis', preview.includes('Condições: Primeira parte até o quinto dia útil'));
await page.screenshot({ path: OUT + 's5c-editor.png', fullPage: true });

await page.click('button:has-text("Revisar e emitir")');
await page.click('dialog[open] button:has-text("Emitir recibo")');
await page.waitForSelector('.sign-panel');
await pause();
let data = await state();
ok('recibo de prebenda emitido', data.documents.length === 1 && data.documents[0].type === 'recibo_prebenda');
ok('emitir não cria despesa', data.transactions.length === 60);

await page.click('button:has-text("Assinar como recebedor")');
await page.waitForSelector('dialog[open] canvas');
const box = await page.locator('dialog[open] canvas').boundingBox();
await page.mouse.move(box.x + 40, box.y + 90);
await page.mouse.down();
for (let i = 0; i < 25; i++) await page.mouse.move(box.x + 40 + i * 12, box.y + 90 + Math.sin(i / 2) * 30);
await page.mouse.up();
await page.check('dialog[open] .check-row input');
await page.click('dialog[open] button:has-text("Confirmar assinatura")');
await pause();
data = await state();
ok('beneficiário assinou', !!data.documents[0].signatures.receiver);
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: OUT + 's5c-prebenda.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });
ok('recibo de prebenda em uma página A4', pdfPages(OUT + 's5c-prebenda.pdf') === 1);
ok('reimprimir não cria lançamento', (await state()).transactions.length === 60);
await page.goto(BASE + '#/documentos');
ok('histórico com recibo de prebenda', (await page.locator('.history-table').innerText()).includes('Recibo de prebenda pastoral'));
ok('sem erros no console', errors.length === 0, errors.join(' | '));

const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(BASE + '#/documentos/recibo-prebenda/novo');
await mp.waitForSelector('.doc-form');
await mp.selectOption('#f-transactionId', 't04');
ok('celular: editor da prebenda sem rolagem horizontal', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await m.close();

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações`);
