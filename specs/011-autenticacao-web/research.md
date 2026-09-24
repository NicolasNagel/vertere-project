# Research — S11: Autenticação e Shell Autenticado do Frontend

Todas as incertezas do Technical Context tinham decisão possível com o que já existe no projeto
(CLAUDE.md, ADRs, backend implementado) ou com prática padrão de mercado para o caso — nenhuma
ficou como `NEEDS CLARIFICATION` pendente de resposta do usuário.

## Decisão: React Router para roteamento client-side

- **Decisão**: `react-router` v6+.
- **Rationale**: é o roteador padrão de facto para SPA React, com suporte nativo a rotas aninhadas
  (shell como layout pai, seções como filhas) e a `loader`/guard por rota, que é exatamente o que
  FR-005 (bloqueio de navegação direta por papel) precisa. Não há requisito de SSR/SEO (sistema
  interno atrás de login) que justificasse um meta-framework (Next.js/Remix) — isso adicionaria
  complexidade de build e de deploy sem benefício para este caso.
- **Alternatives considered**: TanStack Router (tipagem de rota mais forte, mas ecossistema/
  comunidade menor e curva de adoção maior para um time que ainda não tem nenhum código de frontend
  para referência); roteamento manual via `useState` (rejeitado — reinventa o que um roteador maduro
  já resolve, incluindo back/forward do navegador).

## Decisão: tipos de API gerados via `openapi-typescript`, sem biblioteca de data-fetching

- **Decisão**: gerar `tipos.gerados.ts` a partir de `/openapi.json` (FastAPI já expõe isso
  automaticamente) com `openapi-typescript`; chamadas HTTP via `fetch` nativo encapsulado em
  `clienteHttp.ts`, sem React Query/SWR nesta spec.
- **Rationale**: `CLAUDE.md` já decide "tipos do frontend gerados a partir do OpenAPI do FastAPI" —
  isso não é uma escolha desta spec, é convenção herdada. Para o volume desta spec (uma chamada de
  login, leituras pontuais para montar o shell), uma biblioteca de cache/invalidação de dados seria
  complexidade especulativa (Speculative Generality) sem caso de uso real ainda — introduzi-la
  quando uma spec futura precisar de fato de cache entre navegações é mais barato do que carregar a
  dependência agora e descobrir que as opções de cache não encaixam com o que a spec real pediu.
- **Alternatives considered**: TanStack Query (bom encaixe futuro, mas prematuro agora); Apollo/
  GraphQL (fora de cogitação — a API é REST, não há camada GraphQL no projeto).

## Decisão: `sessionStorage` para o token, não `localStorage`

- **Decisão**: guardar o token de sessão em `sessionStorage`.
- **Rationale**: `sessionStorage` sobrevive a um refresh de página (satisfaz FR-002) mas é limpo ao
  fechar a aba/navegador — reduz a janela de exposição se um token vazar via XSS, comparado a
  `localStorage`, que persistiria indefinidamente até logout explícito. O backend já expira sessões
  no servidor (S1, `sessoes_store`), então não há necessidade de negócio de manter o usuário logado
  entre reaberturas do navegador — isso não foi pedido em nenhuma user story.
- **Alternatives considered**: `localStorage` (mais conveniente para o usuário, mas expande a
  superfície de um token vazado sem necessidade declarada na spec); cookie `httpOnly` (mais seguro
  ainda contra XSS, mas exigiria mudança no backend para setar cookie em vez de retornar token no
  corpo da resposta — fora do escopo desta spec, que assume a API S1 como está; anotado como
  possível reforço de segurança para uma spec futura, não implementado aqui sem decisão do PO).

## Decisão: Tailwind CSS + primitivas Radix UI copiadas ao repo (estilo shadcn)

- **Decisão**: Tailwind CSS para estilo utilitário + componentes acessíveis (menu, foco de teclado)
  construídos sobre primitivas Radix UI, copiados para `apps/web/src/` (não importados como
  dependência de design system fechada tipo MUI/Ant Design).
- **Rationale**: um sistema interno B2B (equipe do laboratório + usuários de clínica) precisa de
  clareza e confiabilidade acima de personalidade visual forte — Tailwind dá controle direto sobre
  espaçamento/tipografia sem a sobrecarga visual de um kit de componentes genérico (o "kit de card
  arredondado com sombra igual em tudo" é exatamente o padrão a evitar). Radix resolve o que é
  genuinamente difícil de acertar sozinho (acessibilidade de teclado/foco em menu e diálogo, que
  FR-004/FR-005 já exigem via navegação por teclado implícita em qualquer app real) sem prender o
  projeto a um design system opinativo. Copiar os componentes (em vez de depender de um pacote
  fechado) mantém a mesma filosofia do backend de "nenhuma dependência que o projeto não controla
  para algo central" — o componente vive no repo, pode ser lido e ajustado como qualquer outro
  código.
- **Alternatives considered**: Material UI/Ant Design (rejeitado — personalidade visual forte demais
  e genérica ao mesmo tempo, exatamente o "SaaS-card kit" que produz telas indistinguíveis de
  qualquer outro sistema); CSS puro/CSS Modules sem utilitário (rejeitado — mais lento para iterar
  sem um sistema de design tokens já estabelecido, e o projeto não tem nenhuma convenção CSS prévia
  para herdar).

## Direção visual (paleta e tipografia) para as telas desta spec

Resumo da consulta à skill `frontend-design`, aplicada com moderação por ser um sistema operacional
interno (não uma peça de marketing) — a identidade visual não deve competir com a tarefa do usuário:

- **Paleta base**: `#0F2A3D` (azul-petróleo escuro, cor de marca/cabeçalho — evoca ambiente clínico/
  laboratorial sem ser o azul genérico de SaaS `#2563EB`), `#F7F5F0` (fundo neutro quente, não o
  cinza-frio padrão de dashboard), `#1B7A6E` (verde-teal de destaque para ações primárias — remete a
  bioquímica/laboratório sem ser o verde-clínico clichê `#10B981`), `#B3492A` (terracota para erro/
  alerta — aquecido, não o vermelho puro `#EF4444` genérico), `#1A1A1A` (texto principal, nunca
  `#000` puro).
- **Tipografia**: uma única família sem-serifa de uso geral (ex: Inter ou similar já disponível via
  `fonts.googleapis.com`) para texto e títulos — não há necessidade de uma segunda família de
  destaque nas duas telas desta spec (login + shell), que são funcionais, não uma landing page.
- **Layout**: login centralizado, card único, sem imagem de fundo decorativa (o valor da tela é ser
  rápida e óbvia, não impressionante); shell com cabeçalho fixo estreito (marca + usuário/sair) e
  menu lateral persistente em desktop, colapsável em telas estreitas — alinhamento à esquerda no
  menu, conteúdo principal ocupando o restante da largura sem centralizar artificialmente.
- **Princípio**: nenhum elemento decorativo que não carregue informação (sem gradientes, sem ícones
  numerados fora de contexto) — a estrutura visual do menu já é a informação (o que está lá é o que
  o papel pode acessar).
