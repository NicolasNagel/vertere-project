# Research: Polimento das Telas Web de Cadastro (S12/S13) e Validação de Valores de Exames

Phase 0 do `/speckit-plan`. A spec não tinha `[NEEDS CLARIFICATION]`. Este documento registra as
decisões de *como* atender cada FR, com base no código atual (`main` em `74f7504`, depois do merge
da S13). Também registra duas questões de escopo achadas durante a pesquisa e decididas pelo usuário
(ver "Descobertas" da spec).

## Decisão 1: onde validar preço e texto no backend

- **Decision**: validar nas funções de service de `exames/service.py` (`cadastrar_exame`,
  `editar_exame`, `cadastrar_regra_plantao`, `editar_regra_plantao`). Elas levantam
  `ExameInvalido(mensagem)` / `RegraPlantaoInvalida(mensagem)`, que o router converte em
  `HTTPException(422, mensagem)`. Categoria e nome são gravados com `strip()`. Em `editar_*`, a
  validação dos dados vem antes da busca do item.
- **Rationale**:
  - É a seam de service do Princípio IV, testável com o repositório fake já usado em
    `test_exames_exame_service.py`, sem HTTP.
  - É exatamente o padrão já existente de `CrmvVazio` (S3, `veterinarios/service.py` + router).
  - O `detail` sai como string em português, que o frontend mostra sem tradução (FR-012 → FR-006).
  - A importação da S10 grava em `ExameModel` direto e não passa por esse service, então nada muda
    lá.
- **Alternatives considered**:
  - `Field(gt=0)` e `StringConstraints(strip_whitespace=True, min_length=1)` nos schemas Pydantic:
    - recusa na fronteira, mas o `detail` sai como lista em inglês (`"Input should be greater than
      0"`) e precisaria de tradução no cliente;
    - fica fora da seam de service, então uma chamada interna futura ao service passaria sem
      validação;
    - muda o OpenAPI, exigindo regenerar `tipos.gerados.ts`.

    Rejeitado como mecanismo principal.
  - As duas camadas (schema e service): duplica a regra em dois lugares, que podem divergir.
    Rejeitado.
  - Constraint `CHECK` no banco com migração: protege contra qualquer escrita, mas exige limpar
    antes os dados legados inválidos (há ao menos o "Exame Negativo" no dev), o que é migração de
    dados fora de escopo (Assumptions da spec). Fica como possível spec futura.

## Decisão 2: formulário só fecha com sucesso, e "Cancelar"

- **Decision**:
  - Ações de formulário devolvem `ResultadoAcao = {ok:true} | {ok:false, mensagem}`.
  - Um hook compartilhado, `ui/useEnvioFormulario(aoSalvar, aoFechar)`, guarda `salvando` e
    `erroEnvio`, ignora envios enquanto `salvando` e chama `aoFechar` só quando `ok`.
  - Os quatro formulários recebem `aoSalvar` (agora assíncrono) e `aoFechar` (novo), mostram
    `erroEnvio` em `role="alert"` e têm "Salvar" e "Cancelar", ambos desabilitados enquanto
    `salvando`.
  - As telas passam `aoFechar = () => setFormularioAberto(false)` (ou `setEditando(false)`).
- **Rationale**:
  - A causa do problema é que a tela fecha o formulário logo depois de disparar a ação, sem esperar
    (`criar(dados); setFormularioAberto(false)` em `TelaClinicas`, `TelaVeterinarios` e
    `TelaExames`).
  - Devolver o resultado à fonte do envio é o mínimo para o formulário decidir.
  - Colocar `salvando`/`erroEnvio` num hook evita repetir a mesma máquina de estado nos quatro
    formulários (o smell de duplicação que o `/code-review` da S13 apontou).
  - Os valores digitados já são estado local do formulário. Como ele só desmonta em sucesso ou
    "Cancelar", nada se perde num erro, sem precisar subir o estado.
- **Alternatives considered**:
  - Manter o erro só no topo da tela (o `erro` do hook) e só não fechar o formulário: a mensagem
    fica longe do formulário, que pode estar numa linha de tabela abaixo, e mistura erro de lista
    com erro de envio. Rejeitado.
  - Lançar exceção na ação e o formulário fazer `try/catch`: espalha `try/catch` por quatro
    componentes e acopla a UI ao tipo `ErroHttp`. Rejeitado; o `ResultadoAcao` já chega com a
    mensagem traduzida.
  - Um componente `<FormularioPadrao>` genérico que embrulhe tudo: os quatro formulários diferem
    bastante (select de clínica, horários, CNPJ somente leitura). Seria abstração especulativa para
    ganhar só os dois botões. Rejeitado.

## Decisão 3: retrofit de S12 para `useColecaoCrud`, e recarga depois de cada ação

- **Decision**:
  - `useClinicas` e `useVeterinarios` passam a ser construídos sobre `useColecaoCrud`, como
    `useExames`/`useRegrasPlantao`. O `carregarLista` de cada um decide entre busca por nome e
    listagem, como já faz hoje.
  - `useColecaoCrud` muda assim:
    - `criar` e o novo `salvarItem` (edição) devolvem `ResultadoAcao` e não preenchem `erro`;
    - `executarAcaoSobreItem` (inativar, reativar, prazo de pagamento) continua preenchendo `erro`;
    - depois de **toda** ação bem-sucedida, recarrega a lista chamando `carregarLista`, sem voltar
      ao estado "Carregando…";
    - depois de `criar`, se o id criado não estiver na lista recarregada, preenche `aviso`.
- **Rationale**:
  - FR-005: os dois hooks da S12 ainda têm o `if (erro instanceof ErroHttp)` que engole falha de
    rede, já corrigido em `useColecaoCrud` na S13 (T050). Migrar fecha o FR-005 e põe FR-001,
    FR-002, FR-013 e FR-014 num lugar só para as quatro telas.
  - O handoff da S13 deixou a migração condicionada a "uma spec futura tocar esses arquivos por
    outro motivo". Esta spec toca os dois por quatro motivos.
  - Recarregar do servidor (FR-013) reaproveita a filtragem que o backend já faz (busca por nome,
    categoria, status) em vez de reimplementá-la no cliente. De quebra, mostra o valor como o
    servidor gravou (ex.: `40` vira `40.00`), sem divergência de formato.
- **Alternatives considered**:
  - Corrigir o `catch` nos dois hooks da S12 sem migrar: resolve o FR-005, mas deixa FR-001, FR-002
    e FR-013 para serem feitos em dobro (dois esqueletos diferentes). Rejeitado.
  - Filtro no cliente, com um predicado `satisfazFiltro(item)` por hook: duplica a semântica da
    busca do backend (correspondência parcial por nome, acentos) e pode divergir. Rejeitado.
  - Recarga mostrando "Carregando…": pisca a tabela inteira a cada clique. Rejeitado; recarga
    silenciosa.

## Decisão 4: traduzir erros da API

- **Decision**: `mensagemDeErroPadrao(erro, rotulosDeCampo?)` em `api/erroApi.ts`, com estas
  regras, nesta ordem:
  1. Status ≥ 500, ou corpo que não é JSON: "Problema no servidor. Tente novamente em instantes."
  2. `detail` string: devolve o `detail` (mensagens de negócio do backend já em PT).
  3. 422 com `detail` lista (Pydantic): para cada item, `Verifique o campo <Rótulo>: <motivo>.`
     - `<Rótulo>` vem de `rotulosDeCampo[último elemento de loc]`, ou "informado" se não houver
       rótulo.
     - `<motivo>` vem do `type` do Pydantic:
       - `missing` → "preenchimento obrigatório";
       - `greater_than` → "deve ser maior que {ctx.gt}";
       - `string_too_short` → "não pode ficar vazio";
       - `decimal_parsing`/`float_parsing`/`int_parsing` → "precisa ser um número";
       - `time_parsing` → "horário inválido";
       - `value_error` e qualquer outro → "valor inválido".
  4. Senão: "Não foi possível concluir a operação. Tente novamente."

  Os hooks de domínio trocam 404 e 409 por mensagens próprias pelo status, mas o 422 só pelo
  **conteúdo** do `detail` (`includes('CNPJ')`, `includes('CRMV')`, `includes('Clínica')`). Todo o
  resto vai para `mensagemDeErroPadrao`.
- **Rationale**:
  - Hoje `extrairDetalheErro` devolve o corpo cru quando `detail` não é string (422 do Pydantic) ou
    quando o corpo não é JSON (500 "Internal Server Error").
  - A S12 mapeia **todo** 422 de clínica para "CNPJ inválido" e todo 422 de veterinário sem "CRMV"
    para "A clínica selecionada não existe mais". Um e-mail como `teste@exemplo`, aceito pelo
    navegador e recusado pelo `EmailStr` do backend, mostra hoje a mensagem errada.
  - A tabela de `type` cobre os campos que existem nos quatro formulários.
- **Alternatives considered**:
  - Mostrar o `msg` do Pydantic (em inglês): fere o Princípio III e o SC-002. Rejeitado.
  - Customizar o handler de `RequestValidationError` no FastAPI para devolver PT: mudaria o formato
    de 422 de **toda** a API, com impacto em todos os módulos. É maior que esta spec. Rejeitado.

## Decisão 5: formatação de moeda

- **Decision**: `formatarMoeda(valor: string | number)` em `ui/formatacao.ts`, com
  `new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`, criado uma vez no
  módulo.
- **Rationale**:
  - O `Intl` é nativo: sem dependência nova, já arredonda para 2 casas e usa milhar `.` e decimal
    `,` (FR-015, Edge Case de mais de 2 casas).
  - A API manda `Decimal` serializado como string (`"50.00"`). `Number()` é seguro para **exibir**
    valores desta ordem de grandeza.
  - Nada é calculado com o resultado (Princípio I).
- **Nota para os testes**: o `Intl` coloca espaço não separável (U+00A0) entre "R$" e o número.
  Teste unitário de `formatarMoeda` compara com `'R$ 50,00'`. Já o `getByText` do Testing
  Library normaliza o texto do elemento (U+00A0 vira espaço comum) e compara com a busca crua,
  então busca na tela usa espaço comum: `'R$ 50,00'`.
- **Alternatives considered**: biblioteca de moeda (dinero.js, currency.js) seria dependência nova
  para algo que o `Intl` faz. Formatar à mão com `toFixed` + `replace` erra o separador de milhar.
  Ambas rejeitadas.

## Decisão 6: visibilidade por papel num só lugar

- **Decision**:
  - `autenticacao/permissoesDeTela.ts` exporta `AcaoDeTela` (as cinco ações usadas pelas telas, com
    os nomes do enum `Acao`) e `podeExecutar(papel, acao)`, sobre um mapa `Acao → Papel[]` que
    espelha `_PERMISSOES` (tabela em data-model.md).
  - `TelaExames` troca `papel === 'admin'` e `papel === 'admin' || papel === 'atendente'` por
    `podeExecutar`.
  - `TelaClinicas` e `TelaVeterinarios` passam a esconder a escrita (e a coluna "Ações", que só tem
    escrita) para quem não pode `CLINICA_GERENCIAR`/`VETERINARIO_GERENCIAR`.
- **Rationale**:
  - FR-016/FR-017 e a decisão do usuário (Descobertas): no backend, gerenciar clínica e veterinário
    é só de admin, mas a S12 mostra a escrita a todos.
  - Um mapa espelhado, com nota de sincronização, é o mesmo mecanismo que `itensDeNavegacao.ts`
    (S11) já usa para rotas, com o mesmo risco aceito.
  - Usar os nomes do enum `Acao` permite achar os dois lados por busca textual.
- **Alternatives considered**:
  - Endpoint novo `GET /auth/permissoes` devolvendo as ações do papel logado: eliminaria o espelho,
    mas é API nova, fora do escopo de "polimento", e o problema de sincronização já existe e é
    aceito em `itensDeNavegacao`. Fica como candidato a spec futura se o espelho divergir na
    prática.
  - Booleans por tela (`podeGerenciarExames`, …) num hook `usePermissoes()`: multiplica nomes sem
    ganho sobre `podeExecutar(papel, 'X')`. Rejeitado.

## Decisão 7: estabilidade da suíte do frontend

**Experimento** (2026-10-01, máquina de dev com 4 núcleos, suíte de 169 testes em `main` +
S13):

| Modo | Execuções | Execuções com falha | Duração |
|---|---|---|---|
| `vitest run` padrão | 5 | 2 (3 e 2 testes falhando) | 49–77 s |
| `vitest run --maxWorkers=50%` | 5 | 1 (2 testes, numa execução de 213 s com a máquina carregada) | 46–59 s nas demais |

Todas as falhas observadas (aqui e durante a S13) são **timeout de 5 s** em testes de formulário
com muito `userEvent.type`, por exemplo:
- "chama aoSalvar com os valores digitados ao submeter";
- "bloqueia submissão com preço-base 0…";
- "admin cadastra um exame novo abrindo o formulário".

Isolados, esses testes passam em poucas centenas de ms. A causa é contenção de CPU (vários
ambientes jsdom em paralelo) somada ao custo por tecla do `userEvent`. Cada tecla espera um
`setTimeout` e dispara um render do React, então o tempo do teste cresce com a carga da máquina.

- **Decision**: atacar as duas parcelas.
  1. Fixar `test.maxWorkers: '50%'` em `apps/web/vite.config.ts` (2 workers nesta máquina). Isso
     reduz a contenção para todos, inclusive para `pnpm test` puro, sem depender de flag na linha
     de comando. O script `test:cobertura` passa a herdar da config em vez de repetir
     `--maxWorkers=2`.
  2. Criar um helper de teste `apps/web/tests/usuario.ts` que devolve
     `userEvent.setup({ delay: null })`, e trocar as chamadas diretas `userEvent.type/click/…`
     pelos testes que digitam. `delay: null` elimina a espera entre teclas sem mudar o que é
     simulado (os mesmos eventos, na mesma ordem).
  3. Aceite pelo SC-006: 10 execuções seguidas de `pnpm test`, sem falha. Se ainda falhar, medir o
     tempo por teste (`--reporter=verbose`) e tratar o teste mais lento antes de considerar
     qualquer outra mudança.
- **Rationale**: o experimento mostra que só o paralelismo não basta (a falha voltou com 50% sob
  carga). O custo por tecla é a outra metade, e `delay: null` é a configuração recomendada pela
  própria Testing Library quando não se testa temporização de digitação, que nenhum teste deste
  projeto testa.
- **Alternatives considered**:
  - Aumentar `testTimeout` (ex.: 15 s): faz a falha sumir sem tirar a causa, e um teste realmente
    travado passa a demorar 3× mais para ser reportado. A spec proíbe "afrouxar" para esconder
    (FR-018). Rejeitado como solução; só seria aceitável como último recurso, registrado em
    "Descobertas".
  - `isolate: false` (sugestão do próprio Vitest para reduzir a criação de jsdom): compartilha
    estado entre arquivos, com risco real de vazamento entre os `vi.mock` de módulo que estes
    testes usam muito. Rejeitado para não trocar uma instabilidade por outra.
  - `fireEvent.change` em vez de `userEvent.type`: mais rápido, mas simula menos (sem
    keydown/keyup/input por tecla) e muda a natureza dos testes existentes. Rejeitado.
  - Retry automático (`retry: 2`): esconde a instabilidade. Rejeitado (FR-018).

**Revisão da decisão — cobertura** (2026-10-19): a reverificação final revelou que o pool padrão
ainda era instável sob instrumentação V8: `test:cobertura` teve timeout de teste e de worker, embora
a suíte padrão passasse. A execução mostrava que recriar 27 ambientes jsdom consumia cerca de 49%
do tempo total. O `pool: 'vmThreads'`, que preserva isolamento por arquivo, foi então reavaliado
separadamente e reduziu a duração de aproximadamente 38 s para 15 s. Após fixá-lo em
`vite.config.ts`, `test:cobertura` passou 10/10 vezes com 285/285 testes e sem crescimento anormal
de memória observado. A evidência nova supera o risco teórico que motivou a rejeição inicial;
`isolate: false` continua rejeitado. Nenhum timeout, retry ou skip foi adicionado.
