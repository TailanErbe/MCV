import { chromium } from 'playwright-core';

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173/';
import { fileURLToPath } from 'node:url';
const OUT = fileURLToPath(new URL('./capturas/', import.meta.url));
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'OK  ' : 'FALHA'} ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });

async function newPage(viewport) {
  const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page, errors };
}

const noHScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const norm = (s) => s.replace(/\s/g, ' ');

// ---------------- Desktop 1366 ----------------
{
  const { ctx, page, errors } = await newPage({ width: 1366, height: 900 });
  await page.goto(BASE);
  await page.waitForSelector('.balance');

  const logo = await page.evaluate(() => {
    const img = document.querySelector('.brand img');
    return { natural: img.naturalWidth, w: img.getBoundingClientRect().width, h: img.getBoundingClientRect().height };
  });
  ok('logo carregada', logo.natural === 1600, `natural ${logo.natural}px`);
  const ratio = logo.w / logo.h;
  ok('logo com proporção preservada', Math.abs(ratio - 1600 / 834) < 0.02, `exibida ${logo.w.toFixed(0)}x${logo.h.toFixed(0)}`);

  const balances = norm(await page.locator('.balances').innerText());
  ok('setembro: espécie R$ 3.837,10', balances.includes('R$ 3.837,10'));
  ok('setembro: Sicoob R$ 18.456,73', balances.includes('R$ 18.456,73'));
  ok('setembro: total R$ 22.293,83', balances.includes('R$ 22.293,83'));
  ok('rótulos das contas em texto', balances.includes('Dinheiro em espécie') && balances.includes('Banco Sicoob'));
  const colors = await page.evaluate(() => ({
    esp: getComputedStyle(document.querySelector('.balance-especie')).borderTopColor,
    bank: getComputedStyle(document.querySelector('.balance-sicoob')).borderTopColor,
  }));
  ok('cor espécie #2563A6 / banco #237A57', colors.esp === 'rgb(37, 99, 166)' && colors.bank === 'rgb(35, 122, 87)', JSON.stringify(colors));
  ok('mês inicial é setembro de 2026', (await page.locator('#month-select').inputValue()) === '2026-09');
  ok('desktop sem scroll horizontal (visão geral)', await noHScroll(page));
  await page.screenshot({ path: OUT + 'd-visao-geral.png', fullPage: true });

  await page.selectOption('#month-select', '2026-08');
  const aug = norm(await page.locator('.balances').innerText());
  ok('agosto: espécie R$ 2.959,60 e anterior R$ 1.850,00', aug.includes('R$ 2.959,60') && aug.includes('R$ 1.850,00'));
  await page.click('button[aria-label="Próximo mês"]');
  ok('seta avança para setembro', (await page.locator('#month-select').inputValue()) === '2026-09');

  await page.click('a.nav-link:has-text("Financeiro")');
  await page.waitForSelector('.ledger');
  ok('Financeiro: 14 movimentos em setembro', (await page.locator('.ledger tbody tr').count()) === 14);
  ok('mês compartilhado entre telas', (await page.locator('#month-select').inputValue()) === '2026-09');
  ok('desktop sem scroll horizontal (financeiro)', await noHScroll(page));
  await page.screenshot({ path: OUT + 'd-financeiro.png', fullPage: true });
  await page.selectOption('#month-select', '2026-08');
  ok('Financeiro: 16 movimentos em agosto', (await page.locator('.ledger tbody tr').count()) === 16);

  // Pessoas pertence ao perfil Secretaria
  await page.selectOption('#profile-select', 'secretaria');
  await new Promise((r) => setTimeout(r, 400));
  await page.click('a.nav-link:has-text("Pessoas")');
  await page.waitForSelector('.people-table');
  ok('Pessoas: 12 cadastradas', (await page.locator('.people-table tbody tr').count()) === 12);
  await page.fill('#people-search', 'claudia');
  ok('busca sem acento encontra Cláudia', (await page.locator('.people-table tbody tr').count()) === 1);
  await page.fill('#people-search', 'zzz');
  ok('busca sem resultado mostra estado vazio', await page.locator('text=Nenhuma pessoa encontrada').isVisible());
  await page.fill('#people-search', '');
  await page.screenshot({ path: OUT + 'd-pessoas.png', fullPage: true });

  await page.reload();
  await page.waitForSelector('.people-table');
  ok('recarregar mantém a rota /pessoas', page.url().endsWith('#/pessoas'));

  // Documentos financeiros pertencem à Tesouraria da sede
  await page.selectOption('#profile-select', 'sede');
  await new Promise((r) => setTimeout(r, 400));
  await page.click('a.nav-link:has-text("Documentos")');
  await page.waitForSelector('.model-list');
  ok('Documentos: cada modelo pronto tem sua ação', (await page.locator('.model-list a, .model-list button').count()) >= 2);
  await page.screenshot({ path: OUT + 'd-documentos.png', fullPage: true });

  await page.click('a.nav-link:has-text("Relatórios")');
  await page.waitForSelector('.report');
  await page.screenshot({ path: OUT + 'd-relatorios.png', fullPage: true });

  await page.click('button:has-text("Restaurar demonstração")');
  ok('diálogo de restauração abre', await page.locator('dialog[open]').isVisible());
  ok('mensagem de restauração correta', await page.locator('dialog[open] >> text=As alterações de teste deste navegador serão apagadas.').isVisible());
  await page.screenshot({ path: OUT + 'd-restaurar.png' });
  await page.click('dialog[open] button:has-text("Cancelar")');
await new Promise((r) => setTimeout(r, 350));
  ok('cancelar fecha o diálogo', (await page.locator('dialog[open]').count()) === 0);
  await page.click('button:has-text("Restaurar demonstração")');
  await page.click('dialog[open] button:has-text("Restaurar")');
await new Promise((r) => setTimeout(r, 350));
  ok('restaurar mostra confirmação', await page.locator('.toast:has-text("Demonstração restaurada.")').isVisible());

  const stored = await page.evaluate(() => localStorage.getItem('igreja-mcv-demonstracao'));
  await page.goto(BASE + '#/rota-inexistente');
  ok('rota inexistente volta à visão geral', (await page.locator('h1').innerText()) === 'Visão geral');
  await page.waitForTimeout(100);
  const stored2 = await page.evaluate(() => JSON.parse(localStorage.getItem('igreja-mcv-demonstracao') ?? 'null'));


  ok('sem erros no console (desktop)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------------- Armazenamento inválido ----------------
{
  const { ctx, page, errors } = await newPage({ width: 1366, height: 900 });
  await page.addInitScript(() => localStorage.setItem('igreja-mcv-demonstracao', '{corrompido'));
  await page.goto(BASE);
  await page.waitForSelector('.balance');
  ok('dados corrompidos voltam à base', norm(await page.locator('.balances').innerText()).includes('R$ 22.293,83'));
  ok('sem erros com dados corrompidos', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

// ---------------- Celular 390 ----------------
{
  const { ctx, page, errors } = await newPage({ width: 390, height: 844 });
  await page.goto(BASE);
  await page.waitForSelector('.balance');
  ok('celular: barra superior com nome', (await page.locator('.topbar-name strong').innerText()) === 'Celebrando a Vitória');
  ok('celular: aviso de demonstração visível', await page.locator('.topbar-name span').isVisible());
  ok('celular: menu lateral oculto', !(await page.locator('#sidebar').isVisible()));
  for (const [route, name, sel] of [['', 'visao-geral', '.balance'], ['#/financeiro', 'financeiro', '.ledger'], ['#/documentos', 'documentos', '.model-list'], ['#/relatorios', 'relatorios', '.report']]) {
    await page.goto(BASE + route);
    await page.waitForSelector(sel);
    ok(`celular sem scroll horizontal (${name})`, await noHScroll(page));
    await page.screenshot({ path: OUT + `m-${name}.png`, fullPage: true });
  }
  await page.click('button[aria-label="Abrir menu"]');
  await page.waitForTimeout(300);
  ok('celular: menu abre', await page.locator('#sidebar').isVisible());
  await page.screenshot({ path: OUT + 'm-menu.png' });
  await page.click('a.nav-link:has-text("Financeiro")');
  await page.waitForTimeout(300);
  ok('celular: navegar fecha o menu', !(await page.locator('#sidebar').isVisible()) && page.url().endsWith('#/financeiro'));
  ok('sem erros no console (celular)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações`);

// ---------------- Larguras intermediárias e botão de fechar ----------------
{
  const b2 = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
  for (const width of [800, 1024, 1366]) {
    const ctx = await b2.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    for (const route of ['', '#/financeiro', '#/pessoas']) {
      await page.goto(BASE + route);
      await page.waitForSelector('.content h1');
      const fine = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
      const cut = await page.evaluate(() => [...document.querySelectorAll('.panel-flush')].some((p) => p.scrollWidth > p.clientWidth));
      console.log(`${fine && !cut ? 'OK  ' : 'FALHA'} ${width}px ${route || '#/'} sem rolagem horizontal${cut ? ' (tabela maior que o painel)' : ''}`);
    }
    if (width >= 1024) {
      const closeVisible = await page.locator('.sidebar-close').isVisible();
      console.log(`${!closeVisible ? 'OK  ' : 'FALHA'} ${width}px botão de fechar menu oculto no desktop`);
    }
    if (width === 1024) await page.goto(BASE + '#/financeiro'), await page.screenshot({ path: OUT + 'd1024-financeiro.png', fullPage: true });
    await ctx.close();
  }
  await b2.close();
}
