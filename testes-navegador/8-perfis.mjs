// Simulação de perfis: tesouraria da sede, tesouraria da congregação e secretaria.
import { chromium } from 'playwright-core';

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173/';
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

const browser = await chromium.launch({ channel: CHANNEL, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('igreja-mcv-demonstracao')).data);
const hashPath = () => new URL(page.url()).hash.replace(/^#/, '') || '/';
const navLabels = async () => (await page.locator('.nav .nav-link').allInnerTexts()).map((t) => t.trim());
const balance = async (cls) => norm(await page.locator(`.balance-${cls} .balance-value`).innerText());
const context = async () => norm(await page.locator('.profile-context').innerText());
// Como uma pessoa faria: só mexe no que precisa mudar.
async function asProfile(profile, unit) {
  if ((await page.inputValue('#profile-select')) !== profile) {
    await page.selectOption('#profile-select', profile);
    await pause();
  }
  if (unit && (await page.inputValue('#unit-select')) !== unit) {
    await page.selectOption('#unit-select', unit);
    await pause();
  }
}
async function goDirect(hash) {
  await page.goto(BASE + hash);
  await pause(500);
}

await page.goto(BASE);
await page.waitForSelector('.balance');
const baseCount = (await state()).transactions.length;

// ============ Tesouraria da sede ============
ok('sede: aviso discreto "Simulação de perfil"', (await page.locator('.profile-switch-title').innerText()).toLowerCase() === 'simulação de perfil');
ok('sede: perfil inicial Tesouraria da sede · Sede', (await page.inputValue('#profile-select')) === 'sede' && (await page.inputValue('#unit-select')) === 'Sede');
ok('sede: módulos Visão geral, Financeiro, Documentos financeiros, Relatórios', JSON.stringify(await navLabels()) === JSON.stringify(['Visão geral', 'Financeiro', 'Documentos financeiros', 'Relatórios']), (await navLabels()).join(', '));
ok('sede: saldos da sede (total R$ 22.293,83)', (await balance('total')) === 'R$ 22.293,83');
ok('sede: pode registrar na sede', await page.locator('button:has-text("Registrar recebimento")').isVisible());
const unitOptions = await page.locator('#unit-select option').allInnerTexts();
ok('sede: consulta a sede e as 3 congregações', unitOptions.length === 4 && unitOptions.filter((o) => o.includes('(consulta)')).length === 3, unitOptions.join(' | '));

await page.click('button:has-text("Registrar recebimento")');
const donorOptions = await page.locator('#f-personId option').allInnerTexts();
ok('sede: pessoas só com dados básicos (nome e matrícula)', donorOptions.slice(1).every((o) => /^.+ · MCV-\d{3}$/.test(o)) && !donorOptions.some((o) => o.includes('(00)')));
await page.keyboard.press('Escape');
await pause();

await goDirect('#/pessoas');
ok('sede: endereço de Pessoas volta para a Visão geral', hashPath() === '/' && (await page.locator('.toast').innerText()).includes('não faz parte do perfil'));

await asProfile('sede', 'Congregação Vila Esperança');
ok('sede → Vila Esperança: identificação clara da unidade', (await context()).includes('Unidade: Congregação Vila Esperança') && (await context()).includes('Somente consulta'));
ok('sede → Vila Esperança: saldos da congregação (espécie R$ 1.174,60; Sicoob R$ 2.225,90; total R$ 3.400,50)', (await balance('especie')) === 'R$ 1.174,60' && (await balance('sicoob')) === 'R$ 2.225,90' && (await balance('total')) === 'R$ 3.400,50', `${await balance('especie')} / ${await balance('sicoob')} / ${await balance('total')}`);
ok('sede → Vila Esperança: sem botões de registrar (consulta)', (await page.locator('button:has-text("Registrar recebimento")').count()) === 0);
const veOverview = norm(await page.locator('.content').innerText());
ok('sede → Vila Esperança: repasse à sede aparece como despesa da congregação', veOverview.includes('Repasse à sede') && !veOverview.includes('Recebido de congregação'));
ok('sede → Vila Esperança: não mostra consolidado da rede', !veOverview.includes('22.293,83') && !veOverview.toLowerCase().includes('consolidado'));

await page.click('a.nav-link:has-text("Financeiro")');
await page.waitForSelector('.ledger');
ok('sede → Vila Esperança: 7 lançamentos de setembro da congregação', (await page.locator('.ledger tbody tr').count()) === 7);
ok('sede → Vila Esperança: nenhum lançamento da sede na lista', !(await page.locator('.ledger').innerText()).includes('Prebenda pastoral de setembro'));
await page.locator('.ledger button.link-button').first().click();
await page.waitForSelector('dialog[open] .details-list');
ok('sede → Vila Esperança: detalhes sem corrigir nem excluir', (await page.locator('dialog[open] button:has-text("Corrigir lançamento")').count()) === 0 && (await page.locator('dialog[open] button:has-text("Excluir")').count()) === 0 && (await page.locator('dialog[open] .readonly-note').isVisible()));
await page.click('dialog[open] button:has-text("Fechar")');
await pause();
await goDirect('#/documentos/recibo-terreno/novo');
ok('sede → Vila Esperança: emitir recibo bloqueado em consulta', hashPath() === '/');
await page.click('a.nav-link:has-text("Documentos financeiros")');
ok('sede → Vila Esperança: documentos sem ação de emitir', (await page.locator('.model-list a').count()) === 0);
await page.click('a.nav-link:has-text("Relatórios")');
const veReport = norm(await page.locator('.report').innerText());
ok('sede → Vila Esperança: relatório da unidade', veReport.includes('Unidade: Congregação Vila Esperança') && veReport.includes('R$ 3.400,50') && veReport.includes('Repasse à sede'));
ok('sede → Vila Esperança: trocar unidade manteve a seção', hashPath() === '/relatorios');

await asProfile('sede', 'Sede');
ok('sede: voltar à sede mantém os dados intactos', (await state()).transactions.length === baseCount);
await page.click('a.nav-link:has-text("Visão geral")');
ok('sede: saldos da sede inalterados', (await balance('total')) === 'R$ 22.293,83');

// ============ Tesouraria da congregação ============
await asProfile('congregacao');
ok('congregação: abre na Visão geral da primeira congregação', hashPath() === '/' && (await page.inputValue('#unit-select')) === 'Congregação Vila Esperança');
const congOptions = await page.locator('#unit-select option').allInnerTexts();
ok('congregação: escolhe só entre congregações (sem a sede)', congOptions.length === 3 && !congOptions.includes('Sede'), congOptions.join(' | '));
ok('congregação: módulos Visão geral, Financeiro, Recibos, Relatórios', JSON.stringify(await navLabels()) === JSON.stringify(['Visão geral', 'Financeiro', 'Recibos', 'Relatórios']));
ok('congregação: sem Configurações da igreja', (await page.locator('a:has-text("Configurações da igreja")').count()) === 0);
ok('congregação: não é somente consulta na própria unidade', !(await context()).includes('Somente consulta'));
const congText = norm(await page.locator('.content').innerText());
ok('congregação: sem saldo da sede nem consolidado', !congText.includes('22.293,83') && !congText.includes('18.456,73'));

await page.click('button:has-text("Registrar recebimento")');
await page.waitForSelector('dialog[open] form');
const incCats = await page.locator('#f-category option').allInnerTexts();
ok('congregação: recebimento sem "Recebido de congregação"', !incCats.includes('Recebido de congregação'));
ok('congregação: sem campo de origem (é a própria unidade)', (await page.locator('#f-origin').count()) === 0);
const congDonors = (await page.locator('#f-personId option').allInnerTexts()).slice(1);
ok('congregação: doadores só da própria congregação', congDonors.length === 2 && congDonors.every((o) => /Cláudia|Ivone/.test(o)), congDonors.join(' | '));
await page.click('dialog[open] button:has-text("Cancelar")');
await pause();

await page.click('button:has-text("Registrar despesa")');
await page.waitForSelector('dialog[open] form');
ok('congregação: despesa com "Repasse à sede"', (await page.locator('#f-category option').allInnerTexts()).includes('Repasse à sede'));
await page.fill('#f-description', 'Troca de reator (teste)');
await page.fill('#f-amount', '50');
await page.selectOption('#f-category', 'manutencao');
await page.click('dialog[open] button:has-text("Salvar despesa")');
await pause();
ok('congregação: despesa desconta só no Sicoob da congregação (R$ 2.175,90)', (await balance('sicoob')) === 'R$ 2.175,90');
const newTx = (await state()).transactions.find((t) => t.description === 'Troca de reator (teste)');
ok('congregação: lançamento gravado na unidade Vila Esperança', newTx?.unit === 'Congregação Vila Esperança');

await page.click('a.nav-link:has-text("Financeiro")');
await page.fill('#filter-search', 'ivone');
const found = await page.locator('.ledger tbody tr').allInnerTexts();
ok('congregação: busca básica de doador nos lançamentos', found.length === 1 && found[0].includes('Ivone Pereira Duarte'), String(found.length));
await page.fill('#filter-search', '');

await asProfile('congregacao', 'Congregação Boa Vista');
ok('congregação: trocar unidade mantém a seção', hashPath() === '/financeiro');
ok('congregação → Boa Vista: não mostra lançamentos de outra unidade', !(await page.locator('.ledger').innerText()).includes('Troca de reator'));
await page.click('a.nav-link:has-text("Visão geral")');
ok('congregação → Boa Vista: saldos próprios (espécie R$ 413,20; Sicoob R$ 747,40; total R$ 1.160,60)', (await balance('especie')) === 'R$ 413,20' && (await balance('sicoob')) === 'R$ 747,40' && (await balance('total')) === 'R$ 1.160,60', `${await balance('especie')} / ${await balance('sicoob')} / ${await balance('total')}`);
for (const hash of ['#/pessoas', '#/configuracoes', '#/documentos/carta/nova']) {
  await goDirect(hash);
  ok(`congregação: ${hash} bloqueado`, hashPath() === '/');
}

// Recibo emitido na congregação
await asProfile('congregacao', 'Congregação Vila Esperança');
await page.click('a.nav-link:has-text("Recibos")');
ok('congregação: página de recibos com ações de emitir', (await page.locator('h1').innerText()) === 'Recibos' && (await page.locator('.model-list a').count()) === 2);
await page.click('a:has-text("Emitir recibo de prebenda")');
await page.waitForSelector('.doc-form');
const prebOpts = await page.locator('#f-transactionId option').allInnerTexts();
ok('congregação: recibo só com pagamentos da unidade', prebOpts.length === 2 && prebOpts[1].includes('dirigente'), prebOpts.join(' | '));
await page.selectOption('#f-transactionId', 've07');
await page.fill('#f-receiverName', 'Dirigente Fictício da Congregação');
await page.click('button:has-text("Revisar e emitir")');
await page.click('dialog[open] button:has-text("Emitir recibo")');
await page.waitForSelector('.sign-panel');
await pause();
const receiptUrlHash = new URL(page.url()).hash;
const receipt = (await state()).documents.at(-1);
ok('congregação: recibo gravado na unidade Vila Esperança', receipt?.unit === 'Congregação Vila Esperança' && receipt?.type === 'recibo_prebenda');

await asProfile('sede', 'Sede');
await page.click('a.nav-link:has-text("Documentos financeiros")');
ok('sede: recibo da congregação não aparece nos documentos da sede', !(await page.locator('.content').innerText()).includes('Dirigente Fictício'));
await asProfile('sede', 'Congregação Vila Esperança');
ok('sede → Vila Esperança: recibo da congregação em consulta', (await page.locator('.history-table').innerText()).includes('Dirigente Fictício'));
await goDirect(receiptUrlHash);
ok('sede → Vila Esperança: recibo sem assinar nem nova versão', (await page.locator('button:has-text("Assinar como")').count()) === 0 && (await page.locator('a:has-text("Criar nova versão")').count()) === 0);

// ============ Secretaria ============
await asProfile('secretaria');
ok('secretaria: abre diretamente em Pessoas', hashPath() === '/pessoas' && (await page.locator('.people-table').isVisible()));
ok('secretaria: troca pelo seletor sem aviso de bloqueio', (await page.locator('.toast').innerText()) === 'Visualizando como Secretaria.');
ok('secretaria: módulos Pessoas e carteirinhas, Cartas e declarações', JSON.stringify(await navLabels()) === JSON.stringify(['Pessoas e carteirinhas', 'Cartas e declarações']));
ok('secretaria: unidade fixa no cadastro geral', (await page.locator('.profile-static').innerText()).includes('cadastro geral'));
ok('secretaria: sem valores em reais na tela de Pessoas', !(await page.locator('.content').innerText()).includes('R$'));
for (const hash of ['#/', '#/financeiro', '#/relatorios', '#/documentos/recibo-terreno/novo']) {
  await goDirect(hash);
  ok(`secretaria: ${hash} bloqueado (volta para Pessoas)`, hashPath() === '/pessoas');
}
await goDirect(receiptUrlHash);
ok('secretaria: recibo financeiro indisponível', (await page.locator('h1').innerText()) === 'Documento indisponível neste perfil' && !(await page.locator('.content').innerText()).includes('R$'));
await page.click('a.nav-link:has-text("Cartas e declarações")');
ok('secretaria: só o modelo de carta, sem recibos', (await page.locator('.model-list li').count()) === 1 && !(await page.locator('.content').innerText()).includes('Recibo'));
ok('secretaria: histórico sem recibos financeiros', !(await page.locator('.content').innerText()).includes('Dirigente Fictício'));

// Formulário aberto fecha ao trocar de perfil
await page.click('a:has-text("Emitir carta de recomendação")');
await page.waitForSelector('.doc-form');
await page.selectOption('#f-personId', 'p01');
await asProfile('sede');
ok('troca de perfil fecha o editor e vai para tela permitida', hashPath() === '/' && (await page.locator('.doc-form').count()) === 0);
await asProfile('congregacao');
await page.click('a.nav-link:has-text("Recibos")');
await page.click('a:has-text("Emitir recibo de prebenda")');
await page.waitForSelector('.doc-form');
await asProfile('congregacao', 'Congregação Jardim Primavera');
ok('troca de unidade fecha o editor de recibo', hashPath() === '/documentos' && (await page.locator('.doc-form').count()) === 0);

// ============ Persistência ============
await asProfile('secretaria');
const beforeReload = (await state()).transactions.length;
ok('trocar de perfil não apaga nem recria dados', beforeReload === baseCount + 1);
await page.reload();
await pause(600);
ok('recarregar mantém o perfil escolhido', (await page.inputValue('#profile-select')) === 'secretaria' && hashPath() === '/pessoas');
ok('recarregar mantém o lançamento da congregação', (await state()).transactions.some((t) => t.description === 'Troca de reator (teste)'));
await asProfile('congregacao', 'Congregação Vila Esperança');
ok('lançamento continua na congregação após recarregar', (await balance('sicoob')) === 'R$ 2.175,90');

await page.click('button:has-text("Restaurar demonstração")');
await page.click('dialog[open] button:has-text("Restaurar")');
await pause();
ok('restaurar volta à base de todas as unidades', (await state().catch(() => null)) === null || (await state()).transactions.length === baseCount);
ok('sem erros no console', errors.length === 0, errors.join(' | '));

// ============ Celular ============
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await m.newPage();
await mp.goto(BASE);
await mp.waitForSelector('.balance');
await mp.click('button[aria-label="Abrir menu"]');
await pause(300);
ok('celular: seletor de perfil no menu', await mp.locator('#profile-select').isVisible());
await mp.selectOption('#profile-select', 'secretaria');
await pause(500);
ok('celular: troca de perfil fecha o menu e abre Pessoas', !(await mp.locator('#sidebar').isVisible()) && new URL(mp.url()).hash === '#/pessoas');
ok('celular: identificação do perfil visível', norm(await mp.locator('.profile-context').innerText()).includes('Secretaria'));
ok('celular: sem rolagem horizontal', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await m.close();

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações (${CHANNEL})`);
