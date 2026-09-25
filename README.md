# Demonstração — Igreja Assembleia de Deus MCV

Demo navegável do sistema de tesouraria e secretaria da Igreja Evangélica Assembleia de Deus — Ministério Celebrando a Vitória.
Escopo, regras e sprints: guia interno da demonstração, mantido só na pasta local (fora do repositório público).

Dados 100% fictícios, salvos só no navegador. Sem backend, login ou integrações. **Não é um sistema pronto para uso real.**

## Executar

```bash
npm install
npm run dev              # desenvolvimento: http://localhost:5173
npm run build            # gera dist/ (site estático)
npm run preview          # serve o build: http://localhost:4173
npm test                 # 49 testes: saldos por unidade, repasses, valores digitados, extenso, matrícula, numeração
npm run test:navegador   # 11 roteiros no Chrome instalado (precisa do preview rodando)
BROWSER_CHANNEL=msedge npm run test:navegador      # os mesmos roteiros no Edge
DEMO_URL=https://endereco/ npm run test:navegador   # mesmos roteiros contra o link publicado
```

O build usa caminhos relativos e rotas com `#` (ex.: `/#/financeiro`), então `dist/` funciona em qualquer hospedagem estática, inclusive ao recarregar rotas internas.

## Restaurar os dados

Menu lateral → **Restaurar demonstração** → confirmar ("As alterações de teste deste navegador serão apagadas"). Volta à base fictícia e apaga lançamentos, cadastros, fotos, documentos emitidos, assinaturas e configurações de teste. Os dados não são sincronizados entre aparelhos.

## Roteiro de 5 minutos (reunião)

Antes: abrir a demo e clicar em **Restaurar demonstração**.

1. **Visão geral:** mostrar "Dinheiro em espécie" (azul) e "Banco Sicoob" (verde), com saldo inicial do mês + entradas − saídas. Total em setembro: R$ 22.293,83. Em meses passados o rótulo muda para "Saldo ao final do período".
2. **Registrar recebimento:** deixar o tesoureiro lançar um dízimo de R$ 100 no Banco Sicoob. O Sicoob passa de R$ 18.456,73 para R$ 18.556,73; o espécie não muda.
3. **Registrar despesa:** R$ 30 na mesma conta, escolhendo a categoria. O Sicoob vai para R$ 18.526,73.
4. **Relatórios:** fechamento de setembro com a variação líquida de R$ 70 no Sicoob, e "Imprimir / salvar em PDF".
5. **Pessoas:** abrir uma ficha, anexar uma foto de teste, "Gerar carteirinha".
6. **Documentos:** emitir uma carta de recomendação, marcar as declarações, revisar, emitir, assinar como pastor e como secretaria e imprimir. Os recibos de terreno e de prebenda também estão prontos, a partir de despesas já registradas.
7. **Perfis** (abaixo da logo, "Visualizar como"): mostrar a Tesouraria da sede consultando uma congregação ("Somente consulta"), a Tesouraria da congregação vendo só a própria unidade e a Secretaria sem nenhum valor financeiro.
8. Perguntar: "O que você procurou e não encontrou?" e "Qual etapa ficou confusa?".

## O que está pronto

| Área | Funciona |
|---|---|
| Visão geral | Mês selecionado, saldo por conta e total, entradas e despesas por categoria, movimentações recentes, "Registrar recebimento" e "Registrar despesa" |
| Financeiro | Lista com filtros de mês, conta e tipo; recebimento (dízimo, oferta, missões, recebido de congregação; pessoa opcional; origem) e despesa (descrição, categoria, conta, forma, responsável); validação junto ao campo; detalhes, correção e exclusão com confirmação; clique repetido não duplica |
| Relatório | Fechamento mensal com período, saldo inicial, entradas e despesas por categoria e por conta, saldo final por conta e total, movimentos em ordem cronológica, impressão em A4 |
| Pessoas | Busca por nome; cadastro e edição; matrícula automática; foto de teste com prévia, troca e remoção (até 2 MB); ficha |
| Carteirinha | Modelo único gerado da ficha, marcado "DEMONSTRAÇÃO", impresso em 85,6 × 54 mm, sem QR Code |
| Documentos | Carta de recomendação, recibo de terreno e recibo de prebenda; prévia; confirmação; histórico com número, versão, data/hora e responsável; cópia fixa do conteúdo; nova versão sem reaproveitar assinaturas; assinatura ilustrativa com dedo ou mouse (pastor e secretaria independentes na carta) |
| Configurações | Acesso secundário no menu: nome, CNPJ, endereço, local e responsáveis (valem para documentos novos) |
| Simulação de perfis | "Visualizar como" e "Unidade" abaixo da logo. **Tesouraria da sede:** Visão geral, Financeiro, Documentos financeiros e Relatórios; registra na sede e consulta as congregações sem editar; vê só nome e matrícula dos doadores. **Tesouraria da congregação:** só a própria unidade (saldos, lançamentos, recibos, relatório), com busca de doadores nos lançamentos. **Secretaria:** Pessoas, carteirinhas, cartas e declarações, sem valores financeiros; abre em Pessoas. Trocar de perfil fecha formulários e prévias, não altera dados e endereços fora do perfil voltam para uma tela permitida |

## Limitações (dizer com clareza)

- Os dados ficam só no navegador em uso. Outro aparelho ou uma janela anônima começam da base fictícia, e nada é sincronizado.
- Os perfis são uma **simulação local**: sem login, senha ou segurança real. Qualquer pessoa com o link pode trocar de perfil, e os dados de todas as unidades ficam no mesmo navegador.
- Cada unidade (sede e 3 congregações fictícias) tem contas e lançamentos próprios. Os repasses das congregações têm a mesma data e o mesmo valor dos "Recebido de congregação" da sede, mas **não há consolidado da rede** nem controle de repasses internos nesta demo.
- Cartão é apenas forma de pagamento: sem faturas, parcelas, taxas ou conciliação.
- Sem integração bancária, Pix, WhatsApp ou e-mail. Relatórios e documentos saem pela impressão do navegador ("Salvar como PDF").
- Os textos dos documentos foram **adaptados sem acesso aos DOCX originais**, seguindo os campos do guia, e precisam de aprovação da igreja. CNPJ e endereço estão como provisórios.
- As assinaturas são ilustrativas e não têm validade jurídica. Não colher assinatura real na reunião.
- A demo começa em setembro de 2026 e só aceita lançamentos já efetivados (sem datas futuras) a partir de 01/08/2026.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/data/` | Tipos, rótulos e a base fictícia (`demo.ts`): 12 pessoas, 30 movimentos (ago–set/2026), 2 contas, 3 congregações |
| `src/lib/` | Cálculos compartilhados (`finance.ts`), valores (`money.ts`), datas locais (`dates.ts`), extenso (`extenso.ts`), texto da carta (`letter.ts`) |
| `src/state/store.tsx` | Estado central, persistência versionada no navegador e restauração |
| `src/components/`, `src/pages/` | Layout, formulários, documentos e telas |
| `testes-navegador/` | Roteiros de verificação no Chrome (`npm run test:navegador`) |
| `public/assets/logo-igreja.jpeg` | Logo oficial |

Regras aplicadas: valores em centavos inteiros; datas como texto `AAAA-MM-DD` (sem conversão UTC); conta (espécie/Sicoob) separada da forma de pagamento; uma única fonte de lançamentos para painel, lista e relatório; azul `#2563A6` = dinheiro em espécie, verde `#237A57` = Banco Sicoob, sempre com o nome escrito.

## Referências

- **Logo:** `Downloads/LOGOMCV.jpeg` (1600×834), copiada sem alteração para `public/assets/logo-igreja.jpeg`. Cores extraídas: azul `#1F77A9`, vermelho `#DB3541`, fundo `#F7F7F7`.
- **Modelos DOCX recebidos** (dois recibos e uma carta): **não encontrados neste computador**. Se forem usados para revisar os textos, coloque-os em `referencias-privadas/`. Essa pasta fica fora do build e do git, pois os arquivos contêm dados pessoais.

## Publicação (GitHub Pages)

Cada envio para a branch `main` executa `.github/workflows/publicar.yml`, que roda os testes, gera o build e publica em `https://<usuario>.github.io/<repositorio>/`. O repositório e o site são públicos: só dados fictícios, nome e logo da igreja. O guia interno e os DOCX não são versionados.

## Registro de progresso (24/09/2026, horário de Brasília)

| Sprint | Situação | Conferência |
|---|---|---|
| 0 — Preparação | Concluída 17h55–18h00. Pasta vazia, plano compacto | — |
| 1 — Base visual | Concluída 18h00–18h10 | 39 + 11 verificações (390, 800, 1024 e 1366 px) |
| 2 — Financeiro | Concluída 18h17–18h23. R$ 100 − R$ 30 muda só o Sicoob (+R$ 70) | 49 verificações |
| 3 — Relatório | Concluída 18h23–18h27 | 19 verificações + PDF |
| 4 — Secretaria | Concluída 18h27–18h43 | 37 verificações |
| 5 — Documentos e assinatura | Concluída 18h43–19h01: carta, recibo de terreno e recibo de prebenda | 53 + 28 + 18 verificações + PDFs de uma página |
| Configurações | Concluída 19h01–19h04 | 9 verificações |
| Simulação de perfis | Concluída 20h00–20h23: unidades com dados próprios, três perfis, bloqueio de telas incompatíveis, migração dos dados já salvos | 71 verificações de perfis; regressão total de 385 verificações no Chrome e no Edge |
| Ajustes pós-teste | Largura total em telas grandes (prévia em "zoom para caber"); pré-preenchimento pelo cadastro único (origem no recebimento, recebedor nos recibos, carta a partir da ficha); rótulos "Saldo inicial do mês" e "Saldo ao final do período"; recentes com o mês no título; textos secundários maiores e mais escuros | 7 fluxos completos: 48 verificações; regressão total de 315 verificações no Chrome e no Edge |
| 6 — Revisão e entrega | Funções congeladas às 19h04. **Publicação pendente:** falta escolher onde hospedar | Execução local conferida |

Defeitos encontrados pelos testes e corrigidos:
- coluna "Total" cortada na impressão do relatório;
- matrícula nova repetindo MCV-001;
- segundo clique de um duplo clique acionando o item de baixo da janela;
- totais repetidos em cada página impressa;
- página em branco no PDF da carta;
- erros que não sumiam no editor da carta.

**Não testado:** toque em celular de verdade (a assinatura foi testada com eventos de toque simulados no Chrome) e o link publicado.

## Como conferir manualmente

1. `npm run build` e `npm run preview`, e abra http://localhost:4173. Se a aba já estava aberta, recarregue com Ctrl+F5 e use **Restaurar demonstração**.
2. **Entrada, despesa e edição:** lance R$ 100 (dízimo, Sicoob) e R$ 30 (despesa, Sicoob). Em Financeiro, clique em cada lançamento → "Corrigir lançamento" e troque para R$ 250 e R$ 45,50. O Sicoob deve ficar em R$ 18.661,23 e o total em R$ 22.498,33, iguais na Visão geral e no Relatório.
3. **Mês e conta:** mude para agosto. Os cartões mostram "Saldo ao final do período", as recentes só trazem datas de agosto, e o total é R$ 21.518,29. No Financeiro, filtre "Dinheiro em espécie" (5 lançamentos) e depois "Somente saídas" (1).
4. **Cadastro único:** cadastre uma pessoa em Pessoas. Em "Registrar recebimento", escolha essa pessoa (aparece com a matrícula) e veja a origem preenchida com a congregação dela. Depois, altere o nome no cadastro e confira que o Financeiro mostra o nome novo.
5. **Foto e carteirinha:** na ficha, "Editar cadastro" → "Anexar foto" (JPG ou PNG de teste) → "Gerar carteirinha".
6. **Documento e assinatura:** na ficha, "Emitir carta de recomendação" (a pessoa já vem escolhida), preencha o destino, "Revisar e emitir", assine como pastor e como secretaria (desenhe com o mouse ou o dedo) e use "Imprimir / salvar em PDF" → "Salvar como PDF".
7. **Persistência:** recarregue a página (F5). Tudo continua lá.
8. **Restaurar:** "Restaurar demonstração" → confirme. Total R$ 22.293,83, 12 pessoas e histórico de documentos vazio.
