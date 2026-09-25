// Executa todos os roteiros no Chrome instalado (sem baixar navegador).
// Local:    npm run build && npm run preview   (em outro terminal) e depois npm run test:navegador
// Publicado: DEMO_URL=https://endereco-da-demo/ npm run test:navegador
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(dir, 'capturas'), { recursive: true });
const scripts = readdirSync(dir).filter((f) => /^\d.*\.mjs$/.test(f)).sort();
let failed = 0;

console.log(`Demo: ${process.env.DEMO_URL ?? 'http://localhost:4173/'}\n`);
for (const script of scripts) {
  const run = spawnSync(process.execPath, [join(dir, script)], { encoding: 'utf8', env: process.env });
  const output = `${run.stdout}${run.stderr}`;
  const failures = output.split('\n').filter((line) => line.startsWith('FALHA') || line.startsWith('ERRO'));
  const passed = output.split('\n').filter((line) => line.startsWith('OK')).length;
  const status = run.status === 0 && failures.length === 0 ? 'ok   ' : 'FALHA';
  if (status !== 'ok   ') failed++;
  console.log(`${status} ${script.padEnd(26)} ${passed} verificações`);
  for (const line of failures) console.log(`      ${line}`);
}
console.log(failed ? `\n${failed} roteiro(s) com falha.` : '\nTodos os roteiros passaram.');
process.exit(failed ? 1 : 0);
