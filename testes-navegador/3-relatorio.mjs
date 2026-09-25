import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
const BASE = process.env.DEMO_URL ?? 'http://localhost:4173/';
const OUT = fileURLToPath(new URL('./capturas/', import.meta.url));
const results = [];
const ok = (n, c, e = '') => results.push(`${c ? 'OK  ' : 'FALHA'} ${n}${e ? ' — ' + e : ''}`);
const norm = (s) => s.replace(/\s/g, ' ');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE + '#/relatorios');
await page.waitForSelector('.report');
const rep = norm(await page.locator('.report').innerText());
ok('período explícito', rep.includes('Período: 01/09/2026 a 30/09/2026'));
ok('aviso de demonstração no relatório', rep.includes('Demonstração • dados fictícios • sem validade oficial'));
ok('saldo inicial total R$ 21.518,29', rep.includes('R$ 21.518,29'));
ok('saldo final total R$ 22.293,83', rep.includes('R$ 22.293,83'));
ok('saldos finais por conta', rep.includes('R$ 3.837,10') && rep.includes('R$ 18.456,73'));
ok('entradas R$ 6.002,50 e saídas R$ 5.226,96', rep.includes('R$ 6.002,50') && rep.includes('R$ 5.226,96'));
ok('dízimo por conta (R$ 300,00 espécie / R$ 1.260,00 Sicoob / R$ 1.560,00)', rep.includes('Dízimo R$ 300,00 R$ 1.260,00 R$ 1.560,00'));
ok('14 movimentos listados', (await page.locator('.report-movements tbody tr').count()) === 14 && rep.includes('Movimentos do período (14)'));
const firstDate = await page.locator('.report-movements tbody tr').first().locator('td').first().innerText();
ok('movimentos em ordem cronológica', firstDate === '01/09/2026', firstDate);
ok('botão Imprimir / salvar em PDF', await page.locator('button:has-text("Imprimir / salvar em PDF")').isVisible());
ok('sem rolagem horizontal da página', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await page.screenshot({ path: OUT + 's3-relatorio.png', fullPage: true });

// Troca de mês: agosto
await page.selectOption('#month-select', '2026-08');
const aug = norm(await page.locator('.report').innerText());
ok('agosto: período e saldo inicial R$ 20.250,00', aug.includes('Período: 01/08/2026 a 31/08/2026') && aug.includes('R$ 20.250,00'));
ok('agosto: 16 movimentos, sem misturar setembro', (await page.locator('.report-movements tbody tr').count()) === 16 && !aug.includes('/09/2026 '));
ok('saldo final de agosto = inicial de setembro (R$ 21.518,29)', aug.includes('R$ 21.518,29'));

// Fonte única: lançamento novo aparece no relatório
await page.selectOption('#month-select', '2026-09');
await page.click('a.nav-link:has-text("Visão geral")');
await page.click('button:has-text("Registrar recebimento")');
await page.fill('#f-amount', '100');
await page.click('dialog[open] button:has-text("Salvar recebimento")');
await new Promise((r) => setTimeout(r, 350));
await page.click('button:has-text("Registrar despesa")');
await page.fill('#f-description', 'Despesa de teste');
await page.selectOption('#f-category', 'manutencao');
await page.fill('#f-amount', '30');
await page.click('dialog[open] button:has-text("Salvar despesa")');
await new Promise((r) => setTimeout(r, 350));
await page.click('a.nav-link:has-text("Relatórios")');
const after = norm(await page.locator('.report').innerText());
ok('relatório reflete +R$ 100 −R$ 30 (Sicoob R$ 18.526,73; total R$ 22.363,83)', after.includes('R$ 18.526,73') && after.includes('R$ 22.363,83'));
ok('variação líquida de R$ 70 no mês (R$ 6.102,50 − R$ 5.256,96)', after.includes('R$ 6.102,50') && after.includes('R$ 5.256,96'));

// PDF pelo modo de impressão
await page.emulateMedia({ media: 'print' });
const hidden = await page.evaluate(() => ['.sidebar', '.page-header', '.print-hint'].every((s) => getComputedStyle(document.querySelector(s)).display === 'none'));
ok('impressão oculta menu, cabeçalho e botões', hidden);
await page.pdf({ path: OUT + 's3-fechamento.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });

ok('sem erros no console', errors.length === 0, errors.join(' | '));

const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(BASE + '#/relatorios');
await mp.waitForSelector('.report');
ok('celular: sem rolagem horizontal da página', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await mp.screenshot({ path: OUT + 's3-m-relatorio.png' });
await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações`);
