# Research: Tela de Exames & Precificação (Web)

Nenhum item do Technical Context ficou marcado `NEEDS CLARIFICATION` — a spec e o backend já
existente (S5) resolvem todas as dúvidas técnicas. Este arquivo registra as decisões de desenho
tomadas para preencher as lacunas que a spec deixou deliberadamente para o `plan.md` (ver
Assumptions de `spec.md`).

## Decisão 1 — Layout das duas sub-seções (Exame x Regra de Plantão)

- **Decision**: uma única tela (`TelaExames.tsx`) com duas sub-seções organizadas por abas
  (toggle simples entre "Catálogo de Exames" e "Regras de Plantão"), sem sub-rota nova.
- **Rationale**: a spec deixa a escolha de layout explicitamente aberta (Assumptions), mas
  `itensDeNavegacao.ts` só tem um item de menu ("Exames", rota única `/exames`) — criar sub-rotas
  (`/exames/catalogo`, `/exames/plantao`) exigiria mudar `rotas.tsx`/`itensDeNavegacao.ts` além do
  necessário para o problema (nenhuma User Story pede navegação direta por URL para cada
  sub-seção). Abas dentro do mesmo componente é a solução mais simples que atende as 4 User
  Stories.
- **Alternatives considered**: (a) duas rotas separadas — rejeitada por criar navegação que a spec
  não pede e por não haver dois itens de menu para ela; (b) lista única combinando as duas
  entidades — rejeitada porque `Exame` e `RegraPlantao` têm colunas e ações completamente
  diferentes, misturá-las numa tabela só prejudicaria a leitura sem ganho real.

## Decisão 2 — Como refletir a restrição de escrita a `admin` (diferente do padrão S12)

- **Decision**: `TelaExames.tsx` e os dois formulários leem `papel` do `SessaoContext` (mesmo hook
  já usado por `RotaProtegida`) e só renderizam os controles de
  cadastrar/editar/inativar/reativar quando `papel === 'admin'`. Para `RegraPlantao`, a própria
  sub-seção de listagem só é renderizada para `papel === 'admin' || papel === 'atendente'`
  (refletindo `Acao.REGRA_PLANTAO_VER`, que não inclui `tecnico`).
- **Rationale**: é a mesma técnica que `RotaProtegida` já usa para decidir acesso a rota, aplicada
  agora dentro de uma tela em vez de entre rotas — não é um mecanismo de autorização novo, e a
  decisão real continua sendo do backend via `exigir_acao()` (Princípio II da constituição): se a
  UI errar e mostrar um botão indevido, a chamada HTTP correspondente ainda falha com 403 no
  backend. A tela só evita a experiência ruim de mostrar um controle que sempre falharia.
- **Alternatives considered**: buscar as `Acao` permitidas via um endpoint de introspecção de
  permissões — rejeitada por não existir tal endpoint no backend (S1/S5) e por ser complexidade
  desproporcional ao problema (só 2 papéis a diferenciar, já conhecidos estaticamente pelo shell).

## Decisão 3 — Duplicação de hook entre `useExames`/`useRegrasPlantao` (e `useClinicas`/`useVeterinarios`)

- **Decision**: extrair um hook de suporte compartilhado (`useColecaoCrud` ou nome equivalente em
  português, em `apps/web/src/api/` ou `apps/web/src/ui/`) que encapsula o esqueleto repetido —
  `mensagemDeErro`, `substituirNoEstado`/`executarAcaoSobreItem`, `recarregar`/`criar` com
  try/catch/`ErroHttp`/`setErro` — e usá-lo em `useExames.ts` e `useRegrasPlantao.ts` desta feature.
- **Rationale**: o handoff da sessão S12 já sinalizou esse ponto de decisão explicitamente
  (`docs/specs/relatorios/S12-verificacao.md` / `handoff.md`): "se uma S13 repetir esse padrão para
  uma 3ª entidade, é o momento de extrair um hook de suporte compartilhado — não antes disso". Esta
  spec introduz a 3ª e a 4ª entidade com o mesmo esqueleto, então a extração deixa de ser
  Speculative Generality (regra de 2+ repetições reais, não hipotéticas) e passa a ser a
  simplificação correta.
- **Escopo da extração**: o hook compartilhado nasce nesta feature e é adotado por
  `useExames`/`useRegrasPlantao`. **Retrofitar `useClinicas`/`useVeterinarios` (S12) para usá-lo
  também não é tarefa desta spec** — mudar código de uma spec já `entregue` sem necessidade nova
  documentada nesta spec seria escopo fora do combinado (guardrail do `CLAUDE.md`: "nunca
  implementar fora do escopo da spec ativa"). Fica registrado como nota em "Descobertas" de
  `spec.md`/`tasks.md` para decisão explícita do usuário numa spec futura, não implementado aqui.
- **Alternatives considered**: manter a duplicação por mais uma spec (rejeitada — o próprio handoff
  já definiu o gatilho e ele foi atingido) e generalizar tanto o hook quanto retrofitar S12 na
  mesma spec (rejeitada — expandiria o escopo de uma spec de frontend de Exames para incluir
  refatoração de um módulo já entregue e verificado, sem pedido do usuário).

## Decisão 4 — Estratégia de teste

- **Decision**: mesma estratégia de S12 — `use*.test.ts` cobre a seam de hook com fetch mockado
  (casos de listar com filtro, criar, editar, inativar/reativar, e erro de validação vindo do
  backend); `Tela*.test.tsx`/`Formulario*.test.tsx` cobrem renderização condicional por papel
  (`admin` vê controles de escrita, `atendente`/`tecnico` não; `tecnico` não vê a sub-seção de
  regra de plantão) via Testing Library, sem reimplementar teste de regra de negócio (preço,
  janela de plantão) já cobertos no backend S5.
- **Rationale**: mantém a paridade de padrão com S12/S11, evitando reinventar abordagem de teste
  por feature.
