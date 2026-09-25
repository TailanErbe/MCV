import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';

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

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const ctx6 = await browser.newContext({ viewport: { width: 1366, height: 900 } });
await ctx6.addInitScript(() => localStorage.setItem('igreja-mcv-perfil', JSON.stringify({ profile: 'secretaria', unit: 'Sede' })));
const page = await ctx6.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

// Documento emitido antes da mudança
await page.goto(BASE + '#/documentos/carta/nova');
await page.selectOption('#f-personId', 'p03');
await page.fill('#f-destinationChurch', 'Igreja Exemplo');
await page.fill('#f-destinationCity', 'Cidade/UF');
await page.click('button:has-text("Revisar e emitir")');
await page.click('dialog[open] button:has-text("Emitir carta")');
await page.waitForSelector('.sign-panel');
await pause();
const firstUrl = page.url();

await page.click('a.nav-link:has-text("Configurações da igreja")');
await page.waitForSelector('.settings-form');
ok('acesso secundário às configurações', page.url().endsWith('#/configuracoes'));
ok('CNPJ provisório visível', (await page.inputValue('#f-cnpj')) === '00.000.000/0000-00');
await page.fill('#f-churchName', '');
await page.click('button:has-text("Salvar configurações")');
ok('nome da igreja obrigatório', await page.locator('#f-churchName-error').isVisible());
await page.fill('#f-churchName', 'Igreja Evangélica Assembleia de Deus — Ministério Celebrando a Vitória');
await page.fill('#f-cnpj', '11.111.111/0001-11');
await page.fill('#f-city', 'Cidade Teste/UF');
await page.fill('#f-pastor-name', 'Pr. Nome Fictício Novo');
await page.click('button:has-text("Salvar configurações")');
ok('mensagem de configurações salvas', (await page.locator('.toast').innerText()).startsWith('Configurações salvas'));
await page.screenshot({ path: OUT + 'settings.png', fullPage: true });

await page.goto(BASE + '#/documentos/carta/nova');
await page.selectOption('#f-personId', 'p03');
const preview = norm(await page.locator('.doc-preview .letter').innerText());
ok('carta nova usa CNPJ, local e pastor configurados', preview.includes('11.111.111/0001-11') && preview.includes('Cidade Teste/UF') && preview.includes('Pr. Nome Fictício Novo'));

await page.goto(firstUrl);
await page.waitForSelector('.letter');
const old = norm(await page.locator('.letter').innerText());
ok('documento já emitido mantém os dados da emissão', old.includes('00.000.000/0000-00') && old.includes('Pr. Samuel Andrade') && !old.includes('Nome Fictício Novo'));

await page.click('button:has-text("Restaurar demonstração")');
await page.click('dialog[open] button:has-text("Restaurar")');
await pause();
await page.goto(BASE + '#/configuracoes');
await page.waitForSelector('.settings-form');
ok('restaurar volta às configurações provisórias', (await page.inputValue('#f-cnpj')) === '00.000.000/0000-00');
ok('sem erros no console', errors.length === 0, errors.join(' | '));

const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
await m.addInitScript(() => localStorage.setItem('igreja-mcv-perfil', JSON.stringify({ profile: 'secretaria', unit: 'Sede' })));
const mp = await m.newPage();
await mp.goto(BASE + '#/configuracoes');
await mp.waitForSelector('.settings-form');
ok('celular: configurações sem rolagem horizontal', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await m.close();
await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações`);
