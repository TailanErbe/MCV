import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';

const BASE = process.env.DEMO_URL ?? 'http://localhost:4173/';
const OUT = fileURLToPath(new URL('./capturas/', import.meta.url));
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'OK  ' : 'FALHA'} ${name}${extra ? ' — ' + extra : ''}`);
const norm = (s) => s.replace(/\s/g, ' ');

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

const balance = async (cls) => norm(await page.locator(`.balance-${cls} .balance-value`).innerText());
const txCount = () => page.evaluate(() => JSON.parse(localStorage.getItem('igreja-mcv-demonstracao')).data.transactions.length);

await page.goto(BASE);
await page.waitForSelector('.balance');
ok('saldos iniciais', (await balance('especie')) === 'R$ 3.837,10' && (await balance('sicoob')) === 'R$ 18.456,73');
ok('botões de ação na visão geral', await page.locator('button:has-text("Registrar recebimento")').isVisible() && await page.locator('button:has-text("Registrar despesa")').isVisible());

// ---- Recebimento R$ 100 no banco
await page.click('button:has-text("Registrar recebimento")');
await page.waitForSelector('dialog[open] form');
ok('formulário de recebimento abre com foco no valor', await page.evaluate(() => document.activeElement?.id === 'f-amount'));
await page.screenshot({ path: OUT + 's2-recebimento.png' });

// validações: vazio, zero, negativo
await page.click('dialog[open] button:has-text("Salvar recebimento")');
await new Promise((r) => setTimeout(r, 350));
ok('valor vazio mostra erro junto ao campo', (await page.locator('#f-amount-error').innerText()) === 'Informe o valor.');
await page.fill('#f-amount', '0');
await page.click('dialog[open] button:has-text("Salvar recebimento")');
await new Promise((r) => setTimeout(r, 350));
ok('valor zero é recusado', (await page.locator('#f-amount-error').innerText()) === 'Informe um valor maior que zero.');
await page.fill('#f-amount', '-5');
await page.click('dialog[open] button:has-text("Salvar recebimento")');
await new Promise((r) => setTimeout(r, 350));
ok('valor negativo é recusado', (await page.locator('#f-amount-error').innerText()).startsWith('Valor inválido'));
ok('campo inválido marcado para leitores de tela', (await page.getAttribute('#f-amount', 'aria-invalid')) === 'true');
ok('nenhum lançamento criado por valores inválidos', (await txCount()) === 60);
await page.screenshot({ path: OUT + 's2-validacao.png' });

// categoria congregação exige origem
await page.selectOption('#f-category', 'congregacao');
await page.fill('#f-amount', '100');
await page.click('dialog[open] button:has-text("Salvar recebimento")');
await new Promise((r) => setTimeout(r, 350));
ok('recebido de congregação exige origem', (await page.locator('#f-origin-error').innerText()) === 'Escolha a congregação de origem.');
await page.selectOption('#f-category', 'dizimo');

// data futura recusada
await page.fill('#f-date', '2026-12-31');
await page.click('dialog[open] button:has-text("Salvar recebimento")');
await new Promise((r) => setTimeout(r, 350));
ok('data futura recusada', (await page.locator('#f-date-error').innerText()).includes('não pode ser futura'));
await page.fill('#f-date', '2026-09-24');

// espécie força "Dinheiro"
await page.check('input[name="accountId"][value="especie"]');
ok('espécie aceita só dinheiro', (await page.locator('#f-method').innerText()) === 'Dinheiro');
await page.check('input[name="accountId"][value="sicoob"]');
ok('Sicoob volta a oferecer formas bancárias', (await page.locator('select#f-method option').count()) === 5);

await page.selectOption('#f-personId', 'p06');
await page.fill('#f-amount', '100');
// clique duplo no salvar
await page.dblclick('dialog[open] button:has-text("Salvar recebimento")');
await new Promise((r) => setTimeout(r, 350));
await page.waitForTimeout(200);
ok('clique repetido salva uma única vez', (await txCount()) === 61, `lançamentos: ${await txCount()}`);
ok('mensagem de sucesso', norm(await page.locator('.toast').innerText()) === 'Recebimento de R$ 100,00 salvo em Banco Sicoob.');
ok('formulário fecha após salvar', (await page.locator('dialog[open]').count()) === 0);
ok('Sicoob +R$ 100 (R$ 18.556,73)', (await balance('sicoob')) === 'R$ 18.556,73');
ok('espécie inalterada', (await balance('especie')) === 'R$ 3.837,10');

// ---- Despesa R$ 30 na mesma conta
await page.click('button:has-text("Registrar despesa")');
await page.waitForSelector('dialog[open] form');
await page.fill('#f-amount', '30');
await page.click('dialog[open] button:has-text("Salvar despesa")');
await new Promise((r) => setTimeout(r, 350));
ok('despesa sem categoria mostra erro', (await page.locator('#f-category-error').innerText()) === 'Escolha a categoria.');
ok('despesa sem descrição mostra erro', (await page.locator('#f-description-error').innerText()) === 'Descreva a despesa.');
ok('foco vai para o campo com erro', await page.evaluate(() => document.activeElement?.id === 'f-description'));
await page.fill('#f-description', 'Compra de lâmpadas (teste)');
await page.selectOption('#f-category', 'manutencao');
await page.selectOption('#f-method', 'pix');
await page.screenshot({ path: OUT + 's2-despesa.png' });
await page.click('dialog[open] button:has-text("Salvar despesa")');
await new Promise((r) => setTimeout(r, 350));
await page.waitForTimeout(100);
ok('despesa salva uma vez', (await txCount()) === 62);
ok('mensagem da despesa', norm(await page.locator('.toast').innerText()) === 'Despesa de R$ 30,00 salva em Banco Sicoob.');
ok('Sicoob líquido +R$ 70 (R$ 18.526,73)', (await balance('sicoob')) === 'R$ 18.526,73');
ok('espécie ainda inalterada', (await balance('especie')) === 'R$ 3.837,10');
ok('total R$ 22.363,83', (await balance('total')) === 'R$ 22.363,83');
ok('lançamentos aparecem nas recentes', (await page.locator('.recent-list').innerText()).includes('Compra de lâmpadas (teste)'));
await page.screenshot({ path: OUT + 's2-visao-apos.png', fullPage: true });

// ---- Financeiro: lista e correção
await page.click('a.nav-link:has-text("Financeiro")');
await page.waitForSelector('.ledger');
ok('Financeiro com 16 movimentos em setembro', (await page.locator('.ledger tbody tr').count()) === 16);
await page.click('.ledger button.link-button:has-text("Fábio Nascimento Alves")');
await page.waitForSelector('dialog[open] .details-list');
const details = norm(await page.locator('dialog[open] .details-list').innerText());
ok('detalhes mostram os dados salvos', details.includes('R$ 100,00') && details.includes('24/09/2026') && details.includes('Fábio Nascimento Alves') && details.includes('Pix'));
await page.screenshot({ path: OUT + 's2-detalhes.png' });
await page.click('dialog[open] button:has-text("Corrigir lançamento")');
await page.waitForSelector('dialog[open] form');
ok('correção abre preenchida', (await page.inputValue('#f-amount')) === '100,00');
await page.fill('#f-amount', '150');
await page.check('input[name="accountId"][value="especie"]');
await page.click('dialog[open] button:has-text("Salvar correção")');
await new Promise((r) => setTimeout(r, 350));
await page.waitForTimeout(100);
ok('correção não duplica', (await txCount()) === 62);
ok('mensagem de correção', (await page.locator('.toast').innerText()).startsWith('Lançamento corrigido'));
const rowText = norm(await page.locator('.ledger tbody tr', { hasText: 'Fábio Nascimento Alves' }).innerText());
ok('lista mostra valor e conta corrigidos', rowText.includes('R$ 150,00') && rowText.includes('Dinheiro em espécie') && rowText.includes('Dinheiro'), rowText);

// ---- Filtros
await page.selectOption('#filter-account', 'especie');
const especieRows = await page.locator('.ledger tbody tr').allInnerTexts();
ok('filtro por conta', especieRows.length === 5 && especieRows.every((r) => r.includes('Dinheiro em espécie')), `${especieRows.length} linhas`);
await page.selectOption('#filter-kind', 'saida');
ok('filtro conta + tipo', (await page.locator('.ledger tbody tr').count()) === 1);
const strip = norm(await page.locator('.totals-strip').innerText());
ok('totais acompanham os filtros', strip.includes('R$ 250,00') && strip.includes('R$ 0,00'), strip);
await page.selectOption('#month-select', '2026-08');
await page.selectOption('#filter-kind', 'saida');
await page.selectOption('#filter-account', 'especie');
await page.selectOption('#month-select', '2026-09');
await page.selectOption('#filter-kind', 'entrada');
await page.selectOption('#filter-account', 'sicoob');
await page.selectOption('#filter-kind', 'saida');
await page.selectOption('#month-select', '2026-08');
const aug = await page.locator('.ledger tbody tr').count();
ok('agosto com filtros Sicoob + saídas', aug === 5, `${aug}`);
await page.selectOption('#month-select', '2026-09');
await page.selectOption('#filter-account', 'especie');
await page.selectOption('#filter-kind', 'saida');
// cria cenário vazio: espécie + saídas em outubro não existe; usa tipo entrada numa conta sem entradas em agosto? usar mês sem dados não disponível — força pela busca de saídas no espécie após excluir
await page.screenshot({ path: OUT + 's2-filtros.png', fullPage: true });

// ---- Exclusão com confirmação
await page.selectOption('#filter-account', 'todas');
await page.selectOption('#filter-kind', 'todos');
await page.click('.ledger button.link-button:has-text("Compra de lâmpadas (teste)")');
await page.click('dialog[open] button:has-text("Excluir")');
await new Promise((r) => setTimeout(r, 350));
ok('exclusão pede confirmação', await page.locator('dialog[open] >> text=Excluir lançamento?').isVisible());
await page.screenshot({ path: OUT + 's2-excluir.png' });
await page.click('dialog[open]:has-text("Excluir lançamento?") button:has-text("Cancelar")');
await new Promise((r) => setTimeout(r, 350));
ok('cancelar mantém o lançamento', (await txCount()) === 62);
await page.keyboard.press('Escape');
await page.click('.ledger button.link-button:has-text("Compra de lâmpadas (teste)")');
await page.click('dialog[open] button:has-text("Excluir")');
await new Promise((r) => setTimeout(r, 350));
await page.click('dialog[open]:has-text("Excluir lançamento?") button:has-text("Excluir")');
await new Promise((r) => setTimeout(r, 350));
await page.waitForTimeout(100);
ok('exclusão remove um lançamento', (await txCount()) === 61);
ok('nenhuma janela aberta após excluir', (await page.locator('dialog[open]').count()) === 0);

// Estado vazio com filtros: espécie + saídas depois de excluir a única saída em espécie? A saída em espécie de setembro é o reparo do som.
await page.click('.ledger button.link-button:has-text("Reparo no sistema de som")');
await page.click('dialog[open] button:has-text("Excluir")');
await new Promise((r) => setTimeout(r, 350));
await page.click('dialog[open]:has-text("Excluir lançamento?") button:has-text("Excluir")');
await new Promise((r) => setTimeout(r, 350));
await page.selectOption('#filter-account', 'especie');
await page.selectOption('#filter-kind', 'saida');
ok('estado vazio com filtros', await page.locator('text=Nenhuma movimentação encontrada com estes filtros').isVisible());
await page.click('button:has-text("Limpar filtros")');
ok('limpar filtros volta à lista', (await page.locator('.ledger tbody tr').count()) === 14);

// ---- Recarregar preserva
await page.reload();
await page.waitForSelector('.ledger');
ok('recarregar preserva as alterações', (await page.locator('.ledger tbody tr').count()) === 14 && (await page.locator('.ledger').innerText()).includes('Fábio Nascimento Alves'));

// ---- Visão geral após correção: espécie 3.837,10 + 150 + 250 (reparo excluído) = 4.237,10; Sicoob 18.456,73
await page.click('a.nav-link:has-text("Visão geral")');
ok('saldos coerentes após corrigir e excluir', (await balance('especie')) === 'R$ 4.237,10' && (await balance('sicoob')) === 'R$ 18.456,73', `${await balance('especie')} / ${await balance('sicoob')}`);
await page.selectOption('#month-select', '2026-08');
ok('agosto não foi afetado', (await balance('especie')) === 'R$ 2.959,60' && (await balance('sicoob')) === 'R$ 18.558,69');

// ---- Restaurar volta à base
await page.click('button:has-text("Restaurar demonstração")');
await page.click('dialog[open] button:has-text("Restaurar")');
await new Promise((r) => setTimeout(r, 350));
ok('restaurar desfaz os testes', (await balance('total')) === 'R$ 22.293,83');

ok('sem erros no console', errors.length === 0, errors.join(' | '));

// ---- Celular
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'pt-BR' });
const mp = await m.newPage();
await mp.goto(BASE + '#/financeiro');
await mp.waitForSelector('.ledger');
await mp.screenshot({ path: OUT + 's2-m-financeiro.png' });
await mp.click('button:has-text("Registrar despesa")');
await mp.waitForSelector('dialog[open] form');
const fits = await mp.evaluate(() => {
  const d = document.querySelector('dialog[open]');
  return d.scrollWidth <= d.clientWidth && d.getBoundingClientRect().right <= window.innerWidth;
});
ok('celular: formulário cabe na tela', fits);
await mp.screenshot({ path: OUT + 's2-m-form.png' });
await mp.fill('#f-description', 'Teste celular');
await mp.fill('#f-amount', '12,34');
await mp.selectOption('#f-category', 'limpeza');
await mp.locator('dialog[open] button:has-text("Salvar despesa")').scrollIntoViewIfNeeded();
await mp.click('dialog[open] button:has-text("Salvar despesa")');
await new Promise((r) => setTimeout(r, 350));
ok('celular: despesa salva', (await mp.locator('.toast').innerText()).replace(/\s/g, ' ').includes('R$ 12,34'));
await m.close();

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações`);
