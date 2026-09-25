import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const pdfPages = (file) => (readFileSync(file, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

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
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
await ctx.addInitScript(() => localStorage.setItem('igreja-mcv-perfil', JSON.stringify({ profile: 'secretaria', unit: 'Sede' })));
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
const docs = () => page.evaluate(() => JSON.parse(localStorage.getItem('igreja-mcv-demonstracao')).data.documents);

// Mouse real do navegador
async function drawMouse(p) {
  const box = await p.locator('dialog[open] canvas.signature-canvas').boundingBox();
  await p.mouse.move(box.x + 30, box.y + 120);
  await p.mouse.down();
  for (let i = 0; i <= 30; i++) await p.mouse.move(box.x + 30 + i * 10, box.y + 110 - Math.sin(i / 3) * 40);
  await p.mouse.up();
}

// Toque: eventos de ponteiro do tipo touch
async function draw(p, pointerType, seed) {
  await p.evaluate(({ pointerType, seed }) => {
    const c = document.querySelector('dialog[open] canvas.signature-canvas');
    const r = c.getBoundingClientRect();
    const ev = (type, x, y) =>
      c.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType, clientX: r.left + x, clientY: r.top + y, isPrimary: true }));
    ev('pointerdown', 30, 120);
    for (let i = 0; i <= 40; i++) ev('pointermove', 30 + i * 8, 120 - Math.sin((i + seed) / 3) * 40);
    ev('pointerup', 350, 110);
  }, { pointerType, seed });
}

await page.goto(BASE + '#/documentos');
await page.waitForSelector('.model-list');
ok('secretaria vê só o modelo de carta', (await page.locator('.model-list li').count()) === 1);
ok('carta tem ação de emitir', await page.locator('a:has-text("Emitir carta de recomendação")').isVisible());
ok('histórico vazio', await page.locator('text=Nenhuma carta emitida ainda').isVisible());

// ---- Editor
await page.click('a:has-text("Emitir carta de recomendação")');
await page.waitForSelector('.doc-form');
await page.click('button:has-text("Revisar e emitir")');
ok('validação: pessoa', (await page.locator('#f-personId-error').innerText()) === 'Escolha a pessoa cadastrada.');
ok('validação: igreja e cidade de destino', (await page.locator('#f-destinationChurch-error').isVisible()) && (await page.locator('#f-destinationCity-error').isVisible()));
ok('nada emitido com erros', (await page.locator('dialog[open]').count()) === 0);

await page.selectOption('#f-personId', 'p01');
await page.fill('#f-destinationChurch', 'Igreja de Destino Exemplo');
await page.fill('#f-destinationCity', 'Cidade Exemplo/UF');
ok('erros somem ao corrigir os campos', (await page.locator('.doc-form .field-error').count()) === 0);
let preview = norm(await page.locator('.doc-preview .letter').innerText());
ok('prévia usa o cadastro (nome e matrícula)', preview.includes('Adriana Souza Lima') && preview.includes('MCV-001'));
ok('prévia identificada e sem número', preview.includes('Prévia — ainda não emitida') && preview.includes('DEMONSTRAÇÃO — dados fictícios — sem validade oficial'));
ok('sem declarações marcadas, nada é declarado', !preview.includes('Declaramos') && !preview.includes('dízimos'));
ok('prévia sem assinatura mostrada como pendente', (await page.locator('.doc-preview .letter-signature-area img').count()) === 0 && (await page.locator('.doc-preview >> text=Assinatura pendente').count()) === 2);

await page.check('label:has-text("Vínculo") input');
await page.check('label:has-text("Testemunho") input');
preview = norm(await page.locator('.doc-preview .letter').innerText());
ok('declarações marcadas entram no texto', preview.includes('está em plena comunhão com esta igreja e tem bom testemunho entre os irmãos'));
ok('dízimos não marcado não aparece', !preview.includes('fiel nos dízimos'));

const body = await page.inputValue('#f-body');
await page.fill('#f-body', body + '\n\nTexto revisado pela secretaria.');
ok('texto editável com opção de voltar ao sugerido', await page.locator('button:has-text("Voltar ao texto sugerido")').isVisible());
ok('prévia mostra o texto editado', norm(await page.locator('.doc-preview .letter').innerText()).includes('Texto revisado pela secretaria.'));
await page.screenshot({ path: OUT + 's5-editor.png', fullPage: true });

await page.click('button:has-text("Revisar e emitir")');
ok('confirmação mostra número e versão', norm(await page.locator('dialog[open]').innerText()).includes('DEMO-0001 (versão 1)'));
await page.screenshot({ path: OUT + 's5-confirmar.png' });
await page.click('dialog[open] button:has-text("Emitir carta")');
await page.waitForSelector('.sign-panel');
await pause();
ok('mensagem de emissão', norm(await page.locator('.toast').innerText()) === 'Carta emitida: DEMO-0001, versão 1.');
let list = await docs();
ok('um documento no histórico', list.length === 1 && list[0].number === 'DEMO-0001' && list[0].version === 1);
ok('cópia do conteúdo guardada', list[0].content.body.includes('Texto revisado pela secretaria.') && list[0].content.personName === 'Adriana Souza Lima');
ok('carta emitida mostra número e versão', norm(await page.locator('.letter').innerText()).includes('Nº DEMO-0001 · versão 1'));

// ---- Assinatura do pastor
await page.click('button:has-text("Assinar como pastor")');
await page.waitForSelector('dialog[open] canvas');
ok('diálogo mostra documento e signatário', norm(await page.locator('dialog[open]').innerText()).includes('Pr. Samuel Andrade · Pastor presidente') && norm(await page.locator('dialog[open]').innerText()).includes('DEMO-0001, versão 1'));
await page.click('dialog[open] button:has-text("Confirmar assinatura")');
ok('não confirma desenho vazio', (await page.locator('dialog[open] .field-error').innerText()) === 'Desenhe a assinatura antes de confirmar.');
await drawMouse(page);
await page.click('dialog[open] button:has-text("Confirmar assinatura")');
ok('exige conferir texto e signatário', (await page.locator('dialog[open] .field-error').innerText()) === 'Confirme que conferiu o texto e o signatário.');
await page.click('dialog[open] button:has-text("Limpar")');
await page.check('dialog[open] .check-row input');
await page.click('dialog[open] button:has-text("Confirmar assinatura")');
ok('limpar volta a exigir desenho', (await page.locator('dialog[open] .field-error').innerText()) === 'Desenhe a assinatura antes de confirmar.');
await drawMouse(page);
await page.screenshot({ path: OUT + 's5-assinar.png' });
await page.click('dialog[open] button:has-text("Confirmar assinatura")');
await pause();
list = await docs();
ok('assinatura do pastor ligada à versão', list[0].signatures.pastor?.version === 1 && list[0].signatures.pastor?.documentNumber === 'DEMO-0001' && list[0].signatures.pastor?.signerName === 'Pr. Samuel Andrade');
ok('secretaria continua pendente', !list[0].signatures.secretary);
ok('carta mostra só a assinatura do pastor', (await page.locator('.letter-signature-area img').count()) === 1);

// ---- Assinatura da secretaria com toque (eventos de ponteiro do tipo touch)
await page.click('button:has-text("Assinar como secretaria")');
await page.waitForSelector('dialog[open] canvas');
await draw(page, 'touch', 9);
await page.check('dialog[open] .check-row input');
await page.click('dialog[open] button:has-text("Confirmar assinatura")');
await pause();
list = await docs();
ok('secretaria assinada com toque', !!list[0].signatures.secretary?.image);
ok('desenhos independentes (não copiados)', list[0].signatures.pastor.image !== list[0].signatures.secretary.image);
ok('carta com duas assinaturas', (await page.locator('.letter-signature-area img').count()) === 2);
ok('sem botões de assinar após as duas assinaturas', (await page.locator('button:has-text("Assinar como")').count()) === 0);
await page.screenshot({ path: OUT + 's5-assinada.png', fullPage: true });
const v1Id = list[0].id;

// ---- Mudar o cadastro não altera o documento emitido
await page.goto(BASE + '#/pessoas/p01');
await page.click('button:has-text("Editar cadastro")');
await page.fill('#f-name', 'Adriana Souza Lima Alterada');
await page.click('dialog[open] button:has-text("Salvar cadastro")');
await pause();
await page.goto(BASE + `#/documentos/${v1Id}`);
await page.waitForSelector('.letter');
const letterAfter = norm(await page.locator('.letter').innerText());
ok('documento emitido mantém a cópia após mudança no cadastro', letterAfter.includes('Adriana Souza Lima,') && !letterAfter.includes('Alterada'));

// ---- Nova versão
await page.click('a:has-text("Criar nova versão")');
await page.waitForSelector('.doc-form');
ok('nova versão avisa que assinaturas não passam', norm(await page.locator('.notice').innerText()).includes('as assinaturas dela não passam para a nova versão'));
ok('nova versão parte do texto emitido', (await page.inputValue('#f-body')).includes('Texto revisado pela secretaria.'));
await page.fill('#f-destinationCity', 'Outra Cidade/UF');
await page.click('button:has-text("Revisar e emitir")');
ok('confirmação da versão 2', norm(await page.locator('dialog[open]').innerText()).includes('DEMO-0001 (versão 2)'));
await page.click('dialog[open] button:has-text("Emitir carta")');
await page.waitForSelector('.sign-panel');
await pause();
list = await docs();
const v2 = list.find((d) => d.version === 2);
ok('versão 2 criada sem assinaturas', list.length === 2 && v2 && Object.keys(v2.signatures).length === 0);
ok('versão 1 preservada com assinaturas', !!list.find((d) => d.version === 1)?.signatures.secretary);
ok('versão 2 pede novas assinaturas', (await page.locator('button:has-text("Assinar como")').count()) === 2);

await page.goto(BASE + `#/documentos/${v1Id}`);
await page.waitForSelector('.letter');
ok('versão antiga avisa substituição e não pode ser assinada', (await page.locator('.notice-warning').isVisible()) && (await page.locator('a:has-text("Criar nova versão")').count()) === 0);

await page.goto(BASE + '#/documentos');
ok('histórico mostra as duas versões', (await page.locator('.history-table tbody tr').count()) === 2 && (await page.locator('.history-table').innerText()).includes('Substituída'));
await page.screenshot({ path: OUT + 's5-historico.png', fullPage: true });

// ---- Recarregar preserva documentos e assinaturas
await page.reload();
await page.waitForSelector('.history-table');
list = await docs();
ok('recarregar mantém histórico e assinaturas', list.length === 2 && !!list.find((d) => d.version === 1)?.signatures.pastor?.image);

// ---- Impressão
await page.goto(BASE + `#/documentos/${v2.id}`);
await page.waitForSelector('.letter');
await page.emulateMedia({ media: 'print' });
const printState = await page.evaluate(() => ({
  hidden: ['.sidebar', '.page-header', '.sign-panel', '.back-link'].every((s) => getComputedStyle(document.querySelector(s)).display === 'none'),
  pending: [...document.querySelectorAll('.letter small.no-print')].every((el) => getComputedStyle(el).display === 'none'),
}));
ok('impressão só com a carta', printState.hidden);
ok('impressão sem "Assinatura pendente" (não indica assinatura)', printState.pending);
await page.pdf({ path: OUT + 's5-carta-v2.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
await page.goto(BASE + `#/documentos/${v1Id}`);
await page.waitForSelector('.letter');
await page.pdf({ path: OUT + 's5-carta-v1-assinada.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
ok('carta impressa em uma única página A4', pdfPages(OUT + 's5-carta-v1-assinada.pdf') === 1, String(pdfPages(OUT + 's5-carta-v1-assinada.pdf')));
await page.emulateMedia({ media: 'screen' });

// ---- Restaurar limpa documentos e assinaturas
await page.click('button:has-text("Restaurar demonstração")');
await page.click('dialog[open] button:has-text("Restaurar")');
await pause();
await page.goto(BASE + '#/documentos');
ok('restaurar limpa histórico e assinaturas', await page.locator('text=Nenhuma carta emitida ainda').isVisible());
ok('restaurar também desfaz a mudança no cadastro', (await page.evaluate(() => document.body.innerText)).length > 0);
await page.goto(BASE + '#/pessoas/p01');
ok('cadastro original de volta', (await page.locator('h1').innerText()) === 'Adriana Souza Lima');

ok('sem erros no console', errors.length === 0, errors.join(' | '));

// ---- Celular
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await m.addInitScript(() => localStorage.setItem('igreja-mcv-perfil', JSON.stringify({ profile: 'secretaria', unit: 'Sede' })));
const mp = await m.newPage();
await mp.goto(BASE + '#/documentos/carta/nova');
await mp.waitForSelector('.doc-form');
ok('celular: editor sem rolagem horizontal', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await mp.selectOption('#f-personId', 'p02');
await mp.fill('#f-destinationChurch', 'Igreja de Destino Exemplo');
await mp.fill('#f-destinationCity', 'Cidade/UF');
await mp.screenshot({ path: OUT + 's5-m-editor.png', fullPage: true });
await mp.click('button:has-text("Revisar e emitir")');
await mp.click('dialog[open] button:has-text("Emitir carta")');
await mp.waitForSelector('.sign-panel');
await pause();
ok('celular: documento sem rolagem horizontal', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await mp.click('button:has-text("Assinar como pastor")');
await mp.waitForSelector('dialog[open] canvas');
const canvasFits = await mp.evaluate(() => {
  const c = document.querySelector('dialog[open] canvas').getBoundingClientRect();
  return c.width > 250 && c.right <= window.innerWidth;
});
ok('celular: área de assinatura ocupa a largura', canvasFits);
ok('celular: área de assinatura bloqueia rolagem ao desenhar', (await mp.evaluate(() => getComputedStyle(document.querySelector('dialog[open] canvas')).touchAction)) === 'none');
await draw(mp, 'touch', 3);
await mp.check('dialog[open] .check-row input');
await mp.screenshot({ path: OUT + 's5-m-assinar.png' });
await mp.click('dialog[open] button:has-text("Confirmar assinatura")');
await pause();
ok('celular: assinatura registrada', (await mp.locator('.letter-signature-area img').count()) === 1);
await mp.screenshot({ path: OUT + 's5-m-documento.png', fullPage: true });
await m.close();

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações`);
