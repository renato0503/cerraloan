# CerraLoan — Sprints

Registro do que foi feito no projeto e o que ainda falta para considerá-lo 100% completo.
Atualizado em 2026-09-16.

## Contexto do projeto

PWA de gestão de microcrédito (HTML/CSS/JS puro, sem build). Papéis: **admin/gestor**,
**cliente** e **vendedor**. Rodando hoje 100% offline (backend local em
[js/offline-firebase.js](js/offline-firebase.js), sem depender de um projeto Firebase
real) e publicado em GitHub Pages para demonstração:
https://renato0503.github.io/cerraloan/

Plano futuro (confirmado com o usuário, ainda não executado): migrar o backend real para
um projeto Firebase na conta `gestor.renatorosa@gmail.com`.

---

## Sprint 1 — Diagnóstico inicial e descoberta de riscos

**Feito:**
- Mapeada a arquitetura do projeto (Firebase Auth + Firestore + Hosting, modelo de
  dados `users`/`loans`/`payments`/`settings`, lógica de juros simples diários).
- Confirmado que o projeto Firebase `cerraloan` referenciado em `firebase-config.js` e
  `service-account-key.json` **não existe** na conta Firebase logada
  (`comercial@cerradofinancas.com.br`) — hosting retorna 404, projeto não aparece em
  `firebase projects:list`.
- Identificado risco de segurança: `service-account-key.json` (chave admin do Firebase)
  e `auth-export.json` (hashes/salts de senha de usuários reais) estavam soltos na raiz
  do projeto, sem controle de versão.

## Sprint 2 — App 100% offline + publicação no GitHub Pages

**Feito:**
- Criado [js/offline-firebase.js](js/offline-firebase.js): mock local do Firebase Auth +
  Firestore (compat API) usando `localStorage`, cobrindo `collection/doc/where/get/set
  /update/delete`, subcoleções, `orderBy/limit`, `FieldValue.serverTimestamp()`, app
  secundário para criar usuários (`initializeApp(..., "Secondary")`), reautenticação e
  troca de senha.
- `index.html` passou a carregar esse mock em vez dos SDKs reais do Firebase.
- Seed automático de dados de demonstração no primeiro acesso (admin, cliente, 1
  empréstimo com 1 pagamento).
- Corrigidos caminhos absolutos (`/`) em `manifest.json` e `sw.js` que quebrariam em
  GitHub Pages (project page, ex. `usuario.github.io/repo/`).
- Corrigido bug real: gráfico do dashboard (`Chart.js`) quebrava ao navegar de volta
  (`Canvas is already in use`) — faltava `Chart.getChart(ctx)?.destroy()` antes de criar
  uma nova instância.
- Repositório git inicializado, `.gitignore` criado excluindo `service-account-key.json`,
  `auth-export.json`, `node_modules/`, `.firebase/`.
- Conectado e enviado (`push`) para `https://github.com/renato0503/cerraloan`.
- GitHub Pages ativado pelo usuário; validado com automação de navegador (Playwright)
  direto na URL pública: login admin/cliente, dashboard, logout — 0 erros de console.

## Sprint 3 — Contraste no modo escuro

**Feito:**
- `.stat-value` e `.login-title` usavam `color: var(--primary)`, que no tema escuro é um
  azul-marinho quase invisível sobre o fundo escuro. Corrigido para `var(--text)` no
  modo escuro.
- `.btn-outline` usava `color/border: var(--secondary)`, também quase invisível no tema
  escuro (afetava botões como "Editar", "Exportar Relatório (PDF)", "Exportar Tudo
  (Excel)", "Salvar Extrato", "Rejeitar"). Corrigido para `var(--text)` / `var(--text-light)`
  no modo escuro.
- Bug de layout encontrado de raiz: o HTML usa a classe `stats-grid` (com "s"), mas o CSS
  só definia `.stat-grid` (sem "s") — os cartões de estatística nunca ficaram em grade,
  sempre em coluna única. Corrigido adicionando `.stats-grid` ao seletor.

## Sprint 4 — Versão desktop do PWA

**Feito:**
- Adicionada media query `@media (min-width: 900px)` em `css/style.css`:
  - Navegação inferior (`.bottom-nav`) passa a ser uma barra lateral fixa à esquerda
    (220px), com itens em linha (ícone + label) em vez de coluna.
  - `#app` ganha `margin-left` para não ficar sob a barra lateral, com largura máxima de
    1100px.
  - Grades de estatísticas (`.stat-grid`/`.stats-grid`) e `.dashboard-grid` passam de 2
    para 4 colunas.
- Mobile (<900px) permanece exatamente como estava — nenhuma regra existente foi
  removida, só adicionada uma camada nova acima.
- Validado visualmente via screenshot em viewport 1440×900: dashboard e tela de
  propostas com sidebar, grid de 4 colunas e gráfico Chart.js funcionando.

## Sprint 5 — Mais dados de teste + novo papel "vendedor"

**Feito:**
- Seed de demonstração expandido em `js/offline-firebase.js`:
  - **2º cliente** (Maria Souza) com **2 empréstimos**: um já quitado (com pagamento
    total calculado) e um ativo em atraso (35 dias, sem pagamentos) — cobre os badges
    "Quitado" e "Atrasado" que antes não apareciam na demo.
  - **Papel novo "vendedor"** (`vendedor@vendedor.com` / `vendedor123`), que pode vender
    crédito para o gestor.
  - 3 propostas de demonstração do vendedor (1 pendente, 1 aprovada, 1 rejeitada).
- Novo modelo de dados: coleção `proposals` (`clientName`, `principalAmount`,
  `dailyInterestRate`, `status: pending|approved|rejected`, `vendedorId`, etc.).
- Novas funções em `js/db.js`: `addProposal`, `getProposals`, `approveProposal`
  (cria cliente + empréstimo real e marca a proposta como aprovada),
  `rejectProposal` (com motivo).
- Novo papel roteado em `js/app.js`: `VENDEDOR_ROUTES`, `showVendedorNav()`,
  `homeRouteForRole()`, guarda de rota generalizada para bloquear qualquer papel fora de
  suas próprias rotas.
- Nova navegação `#vendedor-nav` em `index.html` (Início / Nova Proposta / Propostas).
- Novas telas em `js/views.js`: `loadVendedorDashboard`, `loadNewProposal`,
  `loadMyProposals` (visão do vendedor) e `loadProposals` (fila de aprovação do
  admin/gestor, com botões Aprovar/Rejeitar).
- Atalho no dashboard do admin: botão "🧾 Propostas de Vendedores" com contador de
  pendentes.
- Testado ponta a ponta com Playwright (mobile 390×844 e desktop 1440×900): login dos 3
  papéis, aprovação de proposta (cliente novo aparece automaticamente em `#clients` e nas
  estatísticas), envio de nova proposta pelo vendedor, bloqueio de rota cruzada
  (vendedor tentando `#dashboard` é redirecionado). **0 erros de console** em todos os
  fluxos, em claro e escuro.

## Sprint 6 — Diagnóstico ponta a ponta documentado

**Feito:**
- Criado [docs/diagrams/user-journeys.md](docs/diagrams/user-journeys.md) com:
  - Tabela de papéis/rotas/home/nav (fonte: `js/app.js`).
  - 3 diagramas Mermaid (`flowchart TD`) mapeando a jornada real de admin, cliente e
    vendedor, com nomes reais de rotas e funções (`loadDashboard`, `approveProposal`,
    `calcularSaldo`, etc.).
  - Registro da verificação executada (o que foi testado, em quais viewports, resultado).
  - Lista de achados/gaps (ver backlog abaixo).

---

## Sprint 7 — Ícones SVG no lugar de emojis

**Feito:**
- Criado [js/icons.js](js/icons.js): sistema próprio de ícones SVG inline (estilo
  outline, grade 24×24, `stroke="currentColor"`), sem depender de nenhuma fonte de ícone
  ou CDN externo — mantém o app 100% offline. Função global `icon(nome, opções)` retorna
  o `<svg>` já formatado, herdando cor e tamanho do texto ao redor (`1em` por padrão).
- Substituídos os ~190 emojis usados na interface (nav mobile/desktop, cabeçalhos,
  botões, badges de status, cartões de estatística, estados vazios, tela de perfil,
  configurações) por chamadas a `icon('nome')` em `js/views.js`, `js/ui.js`, `js/app.js`
  e diretamente em `index.html` (nav estática).
- Emoji removido (sem substituto visual) nos lugares onde SVG não pode renderizar:
  - Mensagens de `showToast()`/`alert()` (usam `textContent`, não `innerHTML`).
  - Texto da mensagem de cobrança via WhatsApp (`encodeURIComponent(...)`, texto puro
    enviado a um app externo).
  - Células de tabela do relatório em PDF/Excel (`js/reports.js`, texto puro via
    `jsPDF`/`SheetJS`).
  - `console.log`/`console.error` (diagnóstico de desenvolvedor, não é UI).
- Indicadores coloridos (🟢/🔴/🟡/🟠 de status) trocados por um `<span class="status-dot">`
  (círculo preenchido via `currentColor`) com a cor semântica certa
  (`var(--success)`/`var(--danger)`), em vez de emoji.
- Ajustes finos de CSS: `.icon` com `margin-right` automático quando seguido de texto,
  zerado em ícones isolados (`.nav-icon`, `.empty-emoji`, `.icon-lg`/`.icon-xl`); função
  `emptyState()` (`js/ui.js`) passou a receber um nome de ícone em vez de um emoji.
- Corrigido de brinde: botão "← Voltar" quebrando linha em telas estreitas na tela de
  propostas (fonte grande + texto "Voltar" competindo por espaço com o cabeçalho).
- Validado com Playwright (mobile e desktop, claro e escuro): os 3 papéis completos,
  aprovação/rejeição de proposta, troca de tema — **0 erros de console**, nenhum emoji
  restante em nenhum arquivo de UI (`js/*.js`, `index.html`) fora dos contextos citados
  acima (console/relatórios/WhatsApp), confirmado por varredura automatizada do
  repositório inteiro.

---

## Sprint 8 — Seed dinâmico com migração automática (mais clientes)

**Problema encontrado:** quem já tinha aberto o app antes (Sprint 5) ficou com os dados
antigos (1 cliente só) travados no `localStorage` do navegador — o seed antigo só rodava
em navegador "zerado" (`if (Object.keys(authUsers).length > 0) return;`), então a versão
mais rica nunca chegava a essas sessões já existentes.

**Feito:**
- Reescrito o seed de [js/offline-firebase.js](js/offline-firebase.js) para um modelo
  **idempotente por ID fixo** (`ensureAuthUser`/`ensureDoc`): em toda carga da página, o
  app verifica cliente a cliente, empréstimo a empréstimo, proposta a proposta — se já
  existe, não toca; se falta, cria. Isso corrige automaticamente qualquer navegador que
  já tinha dados de uma versão anterior, sem apagar nada que o usuário tenha criado.
- Guarda especial para não duplicar o empréstimo do "Cliente Teste" original (que usava
  ID aleatório antes desta mudança): só cria o empréstimo-base se esse cliente ainda não
  tiver nenhum empréstimo.
- Base de demonstração ampliada de 2 para **5 clientes**, com estados variados:
  - Cliente Teste — ativo, "Atenção" (25 dias, 1 pagamento parcial).
  - Maria Souza — 1 quitado + 1 "Atrasado" (35 dias, sem pagamentos).
  - Pedro Almeida (novo) — ativo saudável com 3 pagamentos parciais ao longo do tempo.
  - Ana Costa (novo) — "Crítico" (90 dias sem nenhum pagamento).
  - Lucas Ferreira (novo) — 1 quitado rápido + 1 novo em dia (criado há 4 dias).
- Propostas de vendedor ampliadas de 3 para 5 (2 pendentes, 2 aprovadas, 1 rejeitada).
- Validado com Playwright simulando explicitamente um navegador "antigo" (dados no
  formato anterior, com IDs aleatórios) recarregando a página: os dados antigos são
  preservados e os novos são adicionados sem duplicar nada; comparado lado a lado com um
  navegador 100% novo — mesmo resultado final (5 clientes, 7 empréstimos, 5 propostas).

---

## Backlog — o que falta para 100%

### Prioridade alta
- [ ] **Cliente aprovado por proposta não tem login.** `approveProposal()` cria o
  documento em `users` (role `client`) mas nenhuma conta de autenticação — o cliente
  aparece nas listagens do admin mas não consegue entrar no portal. Precisa de um fluxo
  para o admin "ativar acesso" (definir email/senha) depois da aprovação.
- [ ] **Migrar para o Firebase real** na conta `gestor.renatorosa@gmail.com` (projeto
  ainda não criado). Quando isso acontecer: trocar `js/offline-firebase.js` pelos SDKs
  oficiais do Firebase de volta no `index.html`; recriar as regras (`firestore.rules`)
  no projeto real; rodar `seed.js` (ou similar) para os usuários reais; **gerar uma nova
  service account key** (a atual em `service-account-key.json` é de um projeto que não
  existe mais e nunca deve ser reaproveitada).
- [ ] **Girar/descartar as credenciais antigas.** `service-account-key.json` e
  `auth-export.json` continuam no disco local (fora do git, protegidos por
  `.gitignore`). Como pertencem a um projeto Firebase inexistente, são inofensivas hoje,
  mas devem ser apagadas quando não forem mais necessárias para referência.

### Prioridade média
- [ ] **Duplicação de cadastro de cliente**: `js/db.js:addClient()` não é usado;
  `window.loadNewClientForm` em `js/views.js` reimplementa a mesma lógica inline.
  Unificar em uma função só.
- [ ] **Perfil do vendedor**: hoje só existe nav com 3 itens (Início / Nova Proposta /
  Propostas), sem tela de perfil/troca de senha como o cliente tem (`#profile`).
- [ ] **Editar/cancelar proposta pendente** pelo próprio vendedor (hoje só é possível
  criar; não há edição ou cancelamento antes da análise do gestor).
- [ ] Limpar código morto em `js/ui.js` (`renderLogin`, `renderDashboard`,
  `renderClients`, `renderLoans`, `renderLoanDetail`, `renderSimulator`, `initSimulator`,
  `initLogin`) — funções de um prototype antigo que não são mais chamadas por
  `js/app.js`.

### Prioridade baixa / polimento
- [ ] Revisar o layout desktop em telas intermediárias (480–899px, o modo "PC
  centralizado" antigo) para garantir que a transição para a barra lateral em 900px não
  deixe um intervalo estranho.
- [ ] Adicionar mais variedade de dados de demonstração (ex. empréstimo `overdue`
  crítico >60 dias, mais de um vendedor) se for útil para apresentações futuras.
- [ ] Avaliar se vale a pena dar ao vendedor visibilidade do próprio histórico de
  clientes convertidos (hoje ele só vê o status da proposta, não o empréstimo real
  gerado).

---

## Como validar este projeto rapidamente

```bash
npx http-server -p 8080 -c-1
# abrir http://127.0.0.1:8080/
```

Logins de demonstração (dados ficam no `localStorage` do navegador):
- Admin/gestor: `admin@admin.com` / `admin123`
- Cliente 1: `cliente@cliente.com` / `cliente123`
- Cliente 2: `cliente2@cliente.com` / `cliente123`
- Vendedor: `vendedor@vendedor.com` / `vendedor123`
