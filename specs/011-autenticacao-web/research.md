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

## Decisão: CSS custom properties (design tokens) + CSS por componente, sem Tailwind/Radix

- **Decisão** (revista após o usuário indicar `github.com/NicolasNagel/vertere-lab` como referência
  de marca): tokens de cor/tipografia como `:root { --color-*; --font-* }`, um arquivo CSS por
  componente (nome em kebab-case espelhando o componente, ex: `login-form.css`), sem Tailwind nem
  Radix.
- **Rationale**: `vertere-lab` é uma versão anterior deste mesmo produto (mesma marca, mesmo domínio
  — ver `issues/prd.md` → Further Notes, que já menciona uma versão anterior removida do disco) com
  um frontend React/Vite/TS já construído (`frontend/src/`) usando exatamente essa técnica —
  variáveis CSS globais em `index.css` + um arquivo `.css` por componente, sem framework de
  utilitário. Adotar a mesma técnica, não só a mesma paleta, é o que realmente conta como "usar como
  design system": a paleta sozinha sem a estrutura que a sustenta (nomes de token, convenção de
  arquivo) se perderia na primeira tela nova. Também substitui a decisão anterior desta spec
  (Tailwind + Radix) — revisão registrada aqui em vez de silenciosamente sobrescrita: Tailwind fazia
  sentido sem nenhuma referência visual; com uma referência real e coerente já existindo, adicionar
  uma camada de utilitário por cima só duplicaria decisão de espaçamento/cor que os tokens já
  resolvem.
- **Alternatives considered**: manter Tailwind e mapear os tokens do `vertere-lab` para
  `tailwind.config` (rejeitado — dá duas fontes de verdade para a mesma paleta, tokens CSS *e*
  config Tailwind, sem ganho real já que os componentes desta spec são poucos e não precisam de
  utilitário de layout complexo); CSS Modules (rejeitado — mesma convenção de nomes globais BEM-ish
  já funciona no `vertere-lab` referência, não há necessidade de escopo automático por módulo para o
  volume desta spec).

## Direção visual: paleta, tipografia e layout herdados de `vertere-lab`, com melhorias de UI/UX

Tokens extraídos de `vertere-lab/frontend/src/index.css` (arquivo real, não recriado de memória):

```css
--color-brand-ink: #2c4768;        /* ações primárias, texto de marca */
--color-brand-ink-deep: #1f3450;   /* sidebar, títulos de maior peso */
--color-text-primary: #1a2d45;
--color-text-secondary: #596979;
--color-surface-cream: #eeeae0;    /* fundo da página */
--color-surface-form: #fbfaf6;     /* painel de formulário */
--color-border: #e5e2db;
--color-accent-mist: #9cbfc2;      /* destaque/hover, badges */

--font-display: 'Big Shoulders Display', system-ui, sans-serif;  /* títulos, uppercase, peso 800 */
--font-script: 'Cormorant Garamond', Georgia, serif;              /* itálico de ênfase dentro de título */
--font-body: 'Manrope', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;           /* eyebrows, labels técnicos */
```

Layout de referência (`vertere-lab/assets/features/screens/1-login.html` +
`frontend/src/features/auth/components/*.css`): login em painel duplo — esquerda `--color-brand-ink`
com o logo, um slogan em `--font-display` com ênfase em `--font-script` ("Cada amostra, *uma
história*. Cada resultado, *um cuidado*.") e dois círculos decorativos translúcidos; direita
`--color-surface-form` com o formulário. Shell: sidebar fixa 220px em `--color-brand-ink-deep`,
item ativo com borda esquerda em `--color-accent-mist`, rótulos de seção em `--font-mono` maiúsculo,
avatar circular no rodapé da sidebar. Botão primário: cantos quase retos (2px), maiúsculo,
letter-spacing largo — deliberadamente não o botão arredondado genérico de SaaS.

**O que é reutilizado como está**: paleta completa, as duas famílias de destaque
(`--font-display`/`--font-script`), o slogan de marca, o layout de painel duplo do login, a sidebar
fixa com rótulos de seção em mono, o raio de borda pequeno (2-4px) em vez de cantos arredondados.

**Melhorias de UI/UX aplicadas sobre a referência** (ela é um mock estático em HTML/inline-style;
esta spec entrega um app real, então corrige o que um mock não precisa resolver):
- Formulário com `<label for>` + `<input>` semânticos de verdade (o mock usa `<div>`/`<span>`
  estilizados para parecer campo de formulário) — necessário para leitor de tela e para o navegador
  oferecer autopreenchimento/gerenciador de senha nativamente.
- Alternância de mostrar/ocultar senha como `<button type="button" aria-pressed>`, não um `<span>`
  com texto "mostrar" sem função nenhuma no mock.
- Mensagem de erro de login anunciada via `role="alert"`/`aria-live="polite"`, para leitor de tela
  perceber a falha sem precisar navegar até o texto.
- Estados de foco de teclado visíveis (`:focus-visible`) em todo elemento interativo — o mock não
  define nenhum, porque não precisa (é uma imagem estática de referência visual).
- Contraste checado: `--color-text-secondary` (#596979) sobre `--color-surface-cream` (#eeeae0) dá
  ~4.6:1 — passa WCAG AA para texto normal; mantido como está. `--color-accent-mist` (#9cbfc2) só é
  usado como fundo de destaque/borda, nunca como texto sobre claro, porque sozinho não passaria AA.
- Motion: transição de abrir/fechar a sidebar no mobile já existe no CSS de referência
  (`transform` + `transition`) — mantida, mas com `prefers-reduced-motion` respeitado (transição
  removida para quem pediu menos movimento no SO).

**Descoberta registrada, não implementada nesta spec**: o mock de login tem um checkbox "Manter
conectada" (implica sessão persistente opcional, ou seja, `localStorage` quando marcado). A decisão
já tomada nesta spec (ver seção `sessionStorage` acima) é sessão não-persistente sempre, e nenhuma
user story de `spec.md` pede a opção de manter conectado. Em vez de expandir escopo por conta
própria a partir de uma referência visual, o checkbox é **omitido** do formulário desta
implementação — vira uma nota para o PO decidir se quer essa opção como spec futura (ou ajuste nesta
mesma, se preferir agora).
