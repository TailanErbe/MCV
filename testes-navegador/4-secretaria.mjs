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

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
await ctx.addInitScript(() => localStorage.setItem('igreja-mcv-perfil', JSON.stringify({ profile: 'secretaria', unit: 'Sede' })));
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE + '#/pessoas');
await page.waitForSelector('.people-table');

// Imagem sintética de teste (formas geométricas, sem pessoa)
const pngBase64 = await page.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 600; c.height = 800;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 600, 800);
  grad.addColorStop(0, '#9ec5e0'); grad.addColorStop(1, '#2f6f95');
  g.fillStyle = grad; g.fillRect(0, 0, 600, 800);
  g.fillStyle = '#f2d16b'; g.beginPath(); g.arc(300, 330, 150, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff'; g.font = 'bold 72px sans-serif'; g.textAlign = 'center'; g.fillText('TESTE', 300, 650);
  return c.toDataURL('image/png').split(',')[1];
});
const png = Buffer.from(pngBase64, 'base64');

// ---- Cadastro
await page.click('button:has-text("Cadastrar pessoa")');
await page.waitForSelector('dialog[open] form');
ok('formulário abre com foco no nome', await page.evaluate(() => document.activeElement?.id === 'f-name'));
await page.click('dialog[open] button:has-text("Salvar cadastro")');
ok('nome obrigatório com erro junto ao campo', (await page.locator('#f-name-error').innerText()) === 'Informe o nome completo.');
await page.fill('#f-name', 'Rute Oliveira Mendes');
await page.selectOption('#f-classification', 'obreiro');
await page.selectOption('#f-congregation', 'Congregação Vila Esperança');

await page.setInputFiles('#f-photo', { name: 'nota.txt', mimeType: 'text/plain', buffer: Buffer.from('não é imagem') });
ok('arquivo que não é imagem é recusado', (await page.locator('dialog[open] .field-error').innerText()) === 'Escolha um arquivo de imagem (JPG ou PNG).');
await page.setInputFiles('#f-photo', { name: 'grande.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(2 * 1024 * 1024 + 10, 1) });
ok('foto acima de 2 MB é recusada', (await page.locator('dialog[open] .field-error').innerText()) === 'A foto precisa ter até 2 MB.');
await page.setInputFiles('#f-photo', { name: 'foto-teste.png', mimeType: 'image/png', buffer: png });
await page.waitForSelector('dialog[open] .photo-preview img');
ok('prévia da foto aparece', await page.locator('dialog[open] .photo-preview img').isVisible());
ok('erro some após foto válida', (await page.locator('dialog[open] .field-error').count()) === 0);
ok('botão muda para "Trocar foto"', await page.locator('dialog[open] button:has-text("Trocar foto")').isVisible());
await page.screenshot({ path: OUT + 's4-cadastro.png' });
await page.dblclick('dialog[open] button:has-text("Salvar cadastro")');
await page.waitForSelector('.person-sheet');
await page.waitForTimeout(400);
ok('abre a ficha após salvar', page.url().includes('#/pessoas/p-'));
ok('mensagem com matrícula gerada', norm(await page.locator('.toast').innerText()) === 'Cadastro salvo. Matrícula MCV-013.');
const people = await page.evaluate(() => JSON.parse(localStorage.getItem('igreja-mcv-demonstracao')).data.people);
ok('clique repetido não duplica cadastro', people.length === 13);
const saved = people.find((p) => p.name === 'Rute Oliveira Mendes');
ok('foto guardada reduzida (até 480 px, JPEG)', saved?.photo?.startsWith('data:image/jpeg') && saved.photo.length < 120000, `${Math.round((saved?.photo?.length ?? 0) / 1024)} KB`);
const sheet = norm(await page.locator('.person-sheet').innerText());
ok('ficha mostra os dados', sheet.includes('MCV-013') && sheet.includes('Obreiro') && sheet.includes('Congregação Vila Esperança') && sheet.includes('Anexada'));
ok('foto na ficha', await page.locator('.person-photo img').isVisible());
await page.screenshot({ path: OUT + 's4-ficha.png', fullPage: true });

// ---- Carteirinha
await page.click('a:has-text("Gerar carteirinha")');
await page.waitForSelector('.idc');
const card = norm(await page.locator('.idc').innerText());
ok('carteirinha usa a ficha (nome, matrícula, classificação, congregação)', card.includes('Rute Oliveira Mendes') && card.includes('MCV-013') && card.includes('Obreiro') && card.includes('Congregação Vila Esperança'));
ok('carteirinha identificada como DEMONSTRAÇÃO', card.includes('DEMONSTRAÇÃO • dados fictícios • sem validade oficial'));
ok('foto na carteirinha', await page.locator('.idc-photo img').isVisible());
const logo = await page.evaluate(() => { const r = document.querySelector('.idc-logo').getBoundingClientRect(); return r.width / r.height; });
ok('logo da carteirinha com proporção preservada', Math.abs(logo - 1600 / 834) < 0.03, logo.toFixed(3));
const cardRatio = await page.evaluate(() => { const r = document.querySelector('.idc').getBoundingClientRect(); return r.width / r.height; });
ok('proporção de cartão 85,6 × 54', Math.abs(cardRatio - 85.6 / 54) < 0.02, cardRatio.toFixed(3));
const fitsCard = () => page.evaluate(() => {
  const body = document.querySelector('.idc-body').getBoundingClientRect();
  return ['.idc-fields', '.idc-photo'].every((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return r.top >= body.top - 0.5 && r.bottom <= body.bottom + 0.5;
  });
});
ok('dados cabem no cartão', await fitsCard());
ok('sem QR Code', (await page.locator('.idc canvas, .idc svg').count()) === 0);
await page.screenshot({ path: OUT + 's4-carteirinha.png', fullPage: true });

await page.emulateMedia({ media: 'print' });
const printWidth = await page.evaluate(() => document.querySelector('.idc').getBoundingClientRect().width);
ok('impressão no tamanho real (85,6 mm ≈ 323,5 px)', Math.abs(printWidth - 323.5) < 2, printWidth.toFixed(1));
ok('impressão oculta menu e botões', await page.evaluate(() => ['.sidebar', '.page-header', '.back-link'].every((s) => getComputedStyle(document.querySelector(s)).display === 'none')));
await page.pdf({ path: OUT + 's4-carteirinha.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
await page.emulateMedia({ media: 'screen' });

// ---- Edição reflete na carteirinha; remover foto
await page.click('a.back-link');
await page.click('button:has-text("Editar cadastro")');
await page.waitForSelector('dialog[open] form');
ok('edição abre preenchida', (await page.inputValue('#f-name')) === 'Rute Oliveira Mendes');
await page.fill('#f-name', 'Rute Oliveira Mendes Prado');
await page.click('dialog[open] button:has-text("Remover foto")');
await page.click('dialog[open] button:has-text("Salvar cadastro")');
ok('mensagem de atualização', norm(await page.locator('.toast').innerText()) === 'Cadastro atualizado.');
await page.waitForTimeout(400);
await page.click('a:has-text("Gerar carteirinha")');
const card2 = norm(await page.locator('.idc').innerText());
ok('carteirinha reflete a edição sem redigitar', card2.includes('Rute Oliveira Mendes Prado') && card2.includes('MCV-013'));
ok('sem foto: carteirinha mostra iniciais', (await page.locator('.idc-photo img').count()) === 0 && (await page.locator('.idc-photo').innerText()) === 'RP');

// ---- Lista, busca e recarregar
await page.goto(BASE + '#/pessoas');
await page.fill('#people-search', 'rute');
ok('busca encontra o novo cadastro', (await page.locator('.people-table tbody tr').count()) === 1);
await page.reload();
await page.waitForSelector('.people-table');
ok('recarregar mantém o cadastro', (await page.locator('.people-table').innerText()).includes('Rute Oliveira Mendes Prado'));

// ---- Pessoa existente sem foto
await page.click('a.link-button:has-text("Adriana Souza Lima")');
await page.click('a:has-text("Gerar carteirinha")');
ok('carteirinha de pessoa da base', norm(await page.locator('.idc').innerText()).includes('MCV-001'));

// ---- Nome longo cabe na carteirinha
await page.goto(BASE + '#/pessoas');
await page.click('button:has-text("Cadastrar pessoa")');
await page.fill('#f-name', 'Maria Aparecida dos Santos Albuquerque Figueiredo');
await page.selectOption('#f-congregation', 'Congregação Jardim Primavera');
await page.click('dialog[open] button:has-text("Salvar cadastro")');
await page.waitForSelector('.person-sheet');
await page.waitForTimeout(400);
await page.click('a:has-text("Gerar carteirinha")');
await page.waitForSelector('.idc');
ok('nome longo cabe no cartão', await fitsCard());
await page.screenshot({ path: OUT + 's4-carteirinha-nome-longo.png' });
await page.emulateMedia({ media: 'print' });
ok('nome longo cabe também na impressão', await fitsCard());
await page.emulateMedia({ media: 'screen' });

// ---- Restaurar remove cadastros e fotos de teste
await page.click('button:has-text("Restaurar demonstração")');
await page.click('dialog[open] button:has-text("Restaurar")');
await page.waitForTimeout(400);
const afterReset = await page.evaluate(() => {
  const raw = localStorage.getItem('igreja-mcv-demonstracao');
  return raw === null ? 'vazio' : JSON.parse(raw).data.people.length;
});
ok('restaurar apaga cadastros e fotos de teste', afterReset === 'vazio' || afterReset === 12, String(afterReset));
await page.goto(BASE + '#/pessoas');
ok('lista volta a 12 pessoas', (await page.locator('.people-table tbody tr').count()) === 12);

ok('sem erros no console', errors.length === 0, errors.join(' | '));

// ---- Celular
const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
await m.addInitScript(() => localStorage.setItem('igreja-mcv-perfil', JSON.stringify({ profile: 'secretaria', unit: 'Sede' })));
const mp = await m.newPage();
await mp.goto(BASE + '#/pessoas/p01');
await mp.waitForSelector('.person-sheet');
ok('celular: ficha sem rolagem horizontal', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await mp.screenshot({ path: OUT + 's4-m-ficha.png', fullPage: true });
await mp.goto(BASE + '#/pessoas/p01/carteirinha');
await mp.waitForSelector('.idc');
ok('celular: carteirinha sem rolagem horizontal', await mp.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
await mp.screenshot({ path: OUT + 's4-m-carteirinha.png' });
await mp.click('button:has-text("Editar cadastro")').catch(() => {});
await mp.goto(BASE + '#/pessoas');
await mp.click('button:has-text("Cadastrar pessoa")');
await mp.waitForSelector('dialog[open] form');
ok('celular: formulário de cadastro cabe', await mp.evaluate(() => { const d = document.querySelector('dialog[open]'); return d.scrollWidth <= d.clientWidth; }));
await mp.screenshot({ path: OUT + 's4-m-cadastro.png' });
await m.close();

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('FALHA')).length} falha(s) de ${results.length} verificações`);
