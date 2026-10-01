# Feature Specification: Polimento das Telas Web de Cadastro (S12/S13) e Validação de Valores de Exames

**Feature Branch**: `spec/s14-polimento-telas-web`

**Created**: 2026-10-01

**Status**: rascunho

**Input**: User description: "Spec S14: polimento das telas web de cadastro já entregues em S12
(Clínicas, Veterinários) e S13 (Exames, Regras de Plantão), mais a validação de valores positivos
no backend de Exames (S5). Itens: (1) formulários de criar/editar só fecham depois que a API
confirma; em erro, o formulário continua aberto com o que foi digitado e a mensagem; (2) botão
'Cancelar' em todos os formulários de criar/editar dessas telas; (3) depois de criar, editar ou
inativar/reativar, a lista respeita os filtros ativos; (4) valores monetários exibidos em formato
BRL; (5) erros de validação 422 e erros 500 da API viram mensagem compreensível, sem expor JSON ou
texto técnico; (6) a decisão de quais controles de escrita cada papel vê fica centralizada num
único ponto do frontend (só ocultação de UI — quem impõe permissão continua sendo authorize() no
backend); (7) Clínicas e Veterinários passam a mostrar mensagem de erro em falha de rede, em vez de
lista vazia silenciosa; (8) backend: POST/PATCH de exames e regras de plantão rejeitam
preco_base/valor_adicional zero ou negativo e categoria/nome vazios ou só com espaços; (9) a suíte
padrão do frontend deve passar de forma estável."

## Contexto

S12 e S13 entregaram as primeiras telas de cadastro do frontend. A verificação independente e o
`/code-review` da S13 registraram problemas não bloqueantes, vários deles presentes também na S12:
- o formulário fecha antes da resposta da API, e num erro o que foi digitado se perde;
- não há como desistir de um formulário aberto;
- a lista não reaplica o filtro depois de uma ação;
- os valores aparecem sem formato de moeda;
- erros de validação e de servidor aparecem como texto técnico cru;
- falha de rede em Clínicas/Veterinários aparece como lista vazia.

Além disso, o backend de Exames (S5) aceita preço-base e valor adicional zero ou negativos, e
categoria/nome vazios. A única barreira hoje está nos formulários web (ver "Descobertas" de
`specs/013-exames-precificacao-web/spec.md`). No banco de dev existe um exame com preço-base
-10,00 criado diretamente pela API.

Esta spec corrige esses pontos sem adicionar funcionalidade nova de negócio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Formulário não perde o que foi digitado (Priority: P1)

Uma pessoa da equipe preenche um formulário de cadastro ou edição de clínica, veterinário, exame ou
regra de plantão e confirma. O formulário só fecha quando o sistema confirma que salvou. Se o
salvamento falhar, o formulário continua aberto com tudo o que foi digitado, junto com a mensagem
de erro, e a pessoa corrige e tenta de novo. A pessoa também pode desistir a qualquer momento por
um botão "Cancelar", sem salvar nada.

**Why this priority**: perder um cadastro digitado por causa de um erro de validação é a falha de
uso mais frustrante destas telas, e acontece em todas as quatro entidades.

**Independent Test**: abrir o formulário de novo exame, provocar uma rejeição do servidor (ex.: nome
duplicado ou servidor fora do ar), confirmar que o formulário segue aberto com os mesmos valores e a
mensagem; depois clicar "Cancelar" e confirmar que o formulário fecha sem criar nada.

**Acceptance Scenarios**:

1. **Given** um formulário de criação ou edição aberto com dados válidos, **When** a pessoa confirma
   e o sistema salva com sucesso, **Then** o formulário fecha e o item novo ou atualizado aparece
   na lista.
2. **Given** um formulário aberto, **When** a pessoa confirma e o sistema rejeita o salvamento,
   **Then** o formulário continua aberto, com todos os valores digitados preservados, e mostra uma
   mensagem de erro compreensível.
3. **Given** um formulário aberto, enquanto o salvamento está em andamento, **When** a pessoa tenta
   confirmar de novo, **Then** o sistema não envia um segundo salvamento.
4. **Given** um formulário de criação ou edição aberto, com ou sem alterações, **When** a pessoa
   clica "Cancelar", **Then** o formulário fecha, nada é salvo, e a lista continua como estava.
5. **Given** um formulário de edição foi cancelado, **When** a pessoa abre a edição do mesmo item de
   novo, **Then** o formulário mostra os dados atuais do item, não as alterações descartadas.

---

### User Story 2 - Erros sempre visíveis e compreensíveis (Priority: P1)

Quando algo dá errado (servidor fora do ar, rede caída, dado rejeitado pela validação, erro interno
do servidor), a pessoa vê uma mensagem em português que diz o que aconteceu e o que fazer. Ela nunca
vê JSON, nomes de campos técnicos, "Internal Server Error", nem uma lista vazia como se não houvesse
cadastros.

**Why this priority**: hoje, nas telas de Clínicas e Veterinários, uma queda de rede aparece como
"não há cadastros". A pessoa pode concluir que perdeu dados. E um erro de validação do servidor
aparece como texto técnico ilegível.

**Independent Test**: com o servidor desligado, abrir Clínicas e Veterinários e confirmar a mensagem
de falha de conexão no lugar da lista vazia; com o servidor ligado, provocar uma rejeição de
validação e um erro interno e confirmar que as duas mensagens são legíveis.

**Acceptance Scenarios**:

1. **Given** o servidor está inacessível, **When** a pessoa abre a tela de Clínicas ou de
   Veterinários, **Then** vê uma mensagem de falha de conexão, distinta da mensagem de lista vazia.
2. **Given** o servidor está inacessível, **When** a pessoa tenta criar, editar, inativar ou
   reativar um item em qualquer das quatro telas, **Then** vê uma mensagem de falha de conexão.
3. **Given** o servidor rejeita os dados enviados por validação, **When** a mensagem aparece,
   **Then** ela está em português, indica o campo ou o motivo quando o servidor informa, e não
   contém estrutura técnica (JSON, nomes internos de campo, códigos).
4. **Given** o servidor responde com erro interno, **When** a mensagem aparece, **Then** ela diz
   que houve um problema no servidor e sugere tentar de novo, sem detalhe técnico.
5. **Given** o servidor responde com uma mensagem de negócio já escrita para o usuário (ex.: "Exame
   não encontrado"), **When** a mensagem aparece, **Then** ela continua sendo exibida como hoje.

---

### User Story 3 - Servidor rejeita preço e dados inválidos de exames (Priority: P1)

O cadastro e a edição de exames e regras de plantão passam a ser validados também pelo servidor:
preço-base e valor adicional precisam ser maiores que zero, e categoria e nome não podem estar
vazios nem conter só espaços. Assim, nenhum cliente (tela web, integração futura, chamada direta)
grava um preço inválido.

**Why this priority**: preço é dinheiro, e pela Regra de Ouro valor e preço são sempre garantidos
pelo código/banco. Hoje a única barreira é o formulário web, e já existe no banco de dev um exame
com preço negativo gravado sem passar pela tela.

**Independent Test**: enviar diretamente ao servidor um cadastro de exame com preço-base negativo,
uma regra com valor adicional zero, e um exame com nome só de espaços. Os três são rejeitados com
mensagem clara e nada é gravado.

**Acceptance Scenarios**:

1. **Given** um pedido de cadastro ou edição de exame com preço-base zero ou negativo, **When** o
   servidor o recebe, **Then** rejeita sem gravar, indicando que o preço-base deve ser maior que
   zero.
2. **Given** um pedido de cadastro ou edição de regra de plantão com valor adicional zero ou
   negativo, **When** o servidor o recebe, **Then** rejeita sem gravar, indicando que o valor
   adicional deve ser maior que zero.
3. **Given** um pedido de cadastro ou edição de exame com categoria ou nome vazio, ou só com
   espaços, **When** o servidor o recebe, **Then** rejeita sem gravar, indicando o campo.
4. **Given** um pedido válido com espaços sobrando no início ou no fim de categoria ou nome,
   **When** o servidor o recebe, **Then** grava o valor sem esses espaços.
5. **Given** a tela web envia um dado que o servidor rejeita, **When** a rejeição volta, **Then** a
   pessoa vê a mensagem compreensível da User Story 2, com o formulário aberto (User Story 1).

---

### User Story 4 - Lista coerente com os filtros depois de cada ação (Priority: P2)

Com um filtro ativo ("apenas ativos/ativas", categoria, busca por nome ou clínica), a lista mostra
só o que o filtro permite, inclusive logo depois de criar, editar, inativar ou reativar um item.

**Why this priority**: hoje, com "apenas ativos" marcado, inativar um item o deixa visível como
"Inativo" até a próxima recarga. Isso confunde a leitura da lista, mas não perde dado.

**Independent Test**: marcar "apenas ativos" na tela de Exames, inativar um exame e confirmar que
ele sai da lista; com o filtro de categoria "Hematologia", cadastrar um exame de outra categoria e
confirmar que ele não aparece.

**Acceptance Scenarios**:

1. **Given** o filtro "apenas ativos/ativas" está marcado, **When** a pessoa inativa um item,
   **Then** o item sai da lista.
2. **Given** um filtro está ativo, **When** a pessoa cria um item que não satisfaz o filtro,
   **Then** o item não aparece na lista, e a pessoa recebe confirmação de que o cadastro foi salvo.
3. **Given** um filtro está ativo, **When** a pessoa edita um item de modo que ele deixa de
   satisfazer o filtro (ex.: troca a categoria), **Then** o item sai da lista.
4. **Given** nenhum filtro está ativo, **When** a pessoa cria, edita, inativa ou reativa um item,
   **Then** a lista mostra o item atualizado, como hoje.

---

### User Story 5 - Valores em reais (Priority: P2)

Todo valor monetário mostrado nas telas de cadastro aparece no formato brasileiro de moeda (ex.:
"R$ 1.234,56"), sempre com duas casas decimais.

**Why this priority**: a equipe do laboratório lê preços o dia todo. "40" e "55.00" na mesma coluna
são confusos, e o ponto como separador decimal não é o padrão brasileiro.

**Independent Test**: abrir o catálogo de exames e as regras de plantão e confirmar que todo valor
aparece como "R$ x,yy", inclusive logo depois de editar um preço.

**Acceptance Scenarios**:

1. **Given** um exame com preço-base 1234.5, **When** a lista é exibida, **Then** o valor aparece
   como "R$ 1.234,50".
2. **Given** uma regra com valor adicional 50, **When** a lista é exibida, **Then** o valor aparece
   como "R$ 50,00".
3. **Given** a pessoa acabou de editar um preço para 40, **When** a lista é atualizada, **Then** o
   valor aparece como "R$ 40,00", sem esperar uma nova recarga.

---

### User Story 6 - Cada papel vê só o que pode fazer, com a regra num só lugar (Priority: P3)

A decisão de quais controles de escrita (cadastrar, editar, inativar, reativar, definir prazo de
pagamento) e quais seções cada papel vê nas telas de cadastro fica definida num único ponto do
frontend, espelhando as permissões do servidor, e todas as telas a consultam. Para quem usa, muda
uma coisa: atendente e técnico deixam de ver, nas telas de Clínicas e Veterinários, botões de
escrita que o servidor sempre recusa (lá, gerenciar é só de admin). Nas telas de Exames e Regras de
Plantão nada muda, porque elas já mostravam só o permitido.

**Why this priority**: o ganho principal é de manutenção e consistência, mas corrige também um
defeito visível da S12: atendente e técnico clicam em "Nova clínica" ou "Editar" e recebem "Não
autorizado".

**Independent Test**: para cada papel (admin, atendente, técnico), abrir as quatro telas e confirmar
que cada controle de escrita visível corresponde a uma ação que o servidor permite àquele papel, e
que nenhum controle permitido sumiu.

**Acceptance Scenarios**:

1. **Given** o papel atendente ou técnico, **When** abre Clínicas ou Veterinários, **Then** vê a
   lista, a busca e os filtros, mas nenhum controle de cadastrar, editar, inativar, reativar ou
   definir prazo de pagamento.
2. **Given** o papel admin, **When** abre qualquer das quatro telas, **Then** vê todos os controles
   de escrita que já via antes desta spec.
3. **Given** qualquer papel, **When** abre Exames ou Regras de Plantão, **Then** os controles e
   seções visíveis são os mesmos de antes desta spec.
4. **Given** a regra de visibilidade de um controle precisa mudar, **When** a equipe a altera,
   **Then** a alteração acontece num único ponto, e todas as telas afetadas a refletem.

---

### User Story 7 - Suíte de testes do frontend estável (Priority: P3)

A equipe de desenvolvimento roda a suíte padrão de testes do frontend e ela passa sempre que o
código está correto, mesmo com a máquina ocupada. Hoje, alguns testes de formulário às vezes
estouram o tempo limite quando todos os arquivos rodam em paralelo, e passam quando rodados
isolados.

**Why this priority**: não afeta o usuário final, mas um teste que falha por acaso esconde falhas
reais e atrasa toda spec seguinte.

**Independent Test**: rodar a suíte padrão do frontend 10 vezes seguidas na máquina de
desenvolvimento e confirmar zero falhas.

**Acceptance Scenarios**:

1. **Given** o código está correto, **When** a suíte padrão roda 10 vezes seguidas, **Then** passa
   nas 10.
2. **Given** um teste falha de verdade, **When** a suíte roda, **Then** a falha continua sendo
   reportada (a estabilidade não pode vir de esconder ou pular testes).

### Edge Cases

- A pessoa clica "Cancelar" enquanto um salvamento já foi enviado: o formulário só some quando a
  resposta chegar, e o resultado (sucesso ou erro) segue as regras da User Story 1. "Cancelar" fica
  indisponível durante o salvamento.
- O servidor rejeita por validação um campo que o formulário web já valida: vale a mensagem do
  servidor, legível conforme a User Story 2.
- Um item inativo é reativado com o filtro "apenas ativos" marcado: o item só aparece se a lista
  atual o incluiria (ex.: está na tela por não haver filtro de status).
- Um item já gravado com valor inválido antes desta spec (ex.: o exame com preço -10,00 do banco de
  dev) é editado: o servidor exige um valor válido para salvar a edição. Inativar e reativar esse
  item continuam permitidos.
- A sessão expira durante um salvamento: vale o tratamento global de sessão expirada já existente
  (S11), não a mensagem de erro do formulário.
- O valor monetário vem do servidor com mais de duas casas decimais: a exibição arredonda para duas.

## Requirements *(mandatory)*

### Functional Requirements

**Formulários (User Story 1)**

- **FR-001**: Os formulários de criar e de editar de Clínicas, Veterinários, Exames e Regras de
  Plantão DEVEM fechar só depois que o servidor confirmar o salvamento.
- **FR-002**: Quando o salvamento falhar, o formulário DEVE continuar aberto, com todos os valores
  digitados, e mostrar a mensagem de erro.
- **FR-003**: Enquanto um salvamento estiver em andamento, o formulário DEVE impedir um novo envio e
  indicar que está salvando.
- **FR-004**: Todo formulário de criar e de editar dessas quatro telas DEVE ter um controle
  "Cancelar", que fecha o formulário sem salvar e descarta as alterações.

**Mensagens de erro (User Story 2)**

- **FR-005**: As telas de Clínicas e Veterinários DEVEM mostrar mensagem de falha de conexão quando
  o servidor estiver inacessível, ao carregar a lista e em qualquer ação, nunca uma lista vazia
  silenciosa. Exames e Regras de Plantão já se comportam assim desde a S13.
- **FR-006**: Rejeições de validação do servidor DEVEM virar mensagem em português, sem estrutura
  técnica. Quando o servidor indicar o campo, a mensagem DEVE citá-lo pelo nome mostrado na tela.
- **FR-007**: Erros internos do servidor DEVEM virar uma mensagem genérica de "problema no servidor,
  tente novamente", sem detalhe técnico.
- **FR-008**: Mensagens de negócio já escritas para o usuário, como os 404 específicos de
  S12/S13, DEVEM continuar sendo exibidas como hoje.

**Validação no servidor (User Story 3)**

- **FR-009**: O servidor DEVE rejeitar o cadastro e a edição de exame com preço-base menor ou igual a
  zero.
- **FR-010**: O servidor DEVE rejeitar o cadastro e a edição de regra de plantão com valor adicional
  menor ou igual a zero.
- **FR-011**: O servidor DEVE rejeitar o cadastro e a edição de exame com categoria ou nome vazio ou
  só com espaços, e DEVE gravar categoria e nome sem espaços nas pontas.
- **FR-012**: Toda rejeição dos FR-009 a FR-011 DEVE acontecer sem gravar nada e DEVE devolver uma
  indicação do campo e do motivo, para o FR-006 transformar em mensagem.

**Lista e filtros (User Story 4)**

- **FR-013**: Depois de criar, editar, inativar ou reativar um item, a lista das quatro telas DEVE
  mostrar só os itens que satisfazem os filtros ativos no momento.
- **FR-014**: Quando um item recém-criado não aparecer na lista por causa de um filtro, a tela DEVE
  confirmar que o cadastro foi salvo.

**Moeda (User Story 5)**

- **FR-015**: Todo valor monetário exibido nas telas de Exames e Regras de Plantão (preço-base,
  valor adicional) DEVE aparecer no formato brasileiro de moeda, com "R$", separador de milhar "."
  e duas casas decimais com ",".

**Visibilidade por papel (User Story 6)**

- **FR-016**: As regras de quais controles de escrita e quais seções cada papel vê nas telas de
  cadastro DEVEM estar definidas num único ponto do frontend, consultado por todas as telas, e
  DEVEM espelhar as permissões do servidor para cada papel.
- **FR-017**: Cada controle de escrita visível DEVE corresponder a uma ação que o servidor permite
  ao papel logado. Em Clínicas e Veterinários, cadastrar, editar, inativar, reativar e definir prazo
  de pagamento passam a aparecer só para admin. Isso continua sendo só ocultação de interface: a
  permissão continua imposta pelo servidor (`authorize()`), sem nenhuma checagem nova ou alterada no
  backend.

**Linha em edição (User Story 1)**

- **FR-019**: Nas telas de Clínicas e Veterinários, a linha em edição DEVE ocupar todas as colunas da
  tabela, como já acontece em Exames e Regras de Plantão desde a S13.

**Estabilidade (User Story 7)**

- **FR-018**: A suíte padrão de testes do frontend DEVE passar de forma estável na máquina de
  desenvolvimento, sem desligar, pular ou afrouxar asserções de nenhum teste existente.

### Key Entities

- **Exame**: item do catálogo (categoria, nome, preço-base, ativo). Muda só a validação: preço-base
  > 0, categoria e nome não vazios, gravados sem espaços nas pontas.
- **Regra de Plantão**: adicional por dia da semana e faixa de horário (valor adicional, ativo). Muda
  só a validação: valor adicional > 0.
- **Clínica** e **Veterinário**: sem mudança de dado; mudam só o comportamento dos formulários, das
  mensagens de erro e da lista.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das falhas de salvamento nas quatro telas, o que foi digitado continua no
  formulário (verificável provocando uma rejeição em cada formulário).
- **SC-002**: Nenhuma mensagem exibida ao usuário nas quatro telas contém JSON, nome interno de
  campo ou texto de erro técnico em inglês, nos cenários de servidor fora do ar, rejeição de
  validação e erro interno.
- **SC-003**: Zero cadastros ou edições de exame e regra de plantão com valor zero ou negativo, ou
  com categoria ou nome vazio, são aceitos pelo servidor, por qualquer cliente.
- **SC-004**: Com qualquer filtro ativo, 100% dos itens visíveis logo depois de cada ação satisfazem
  o filtro.
- **SC-005**: 100% dos valores monetários das telas de Exames e Regras de Plantão aparecem no
  formato "R$ x.xxx,yy".
- **SC-006**: A suíte padrão de testes do frontend passa em 10 execuções seguidas, sem nenhum teste
  removido, pulado ou com asserção afrouxada.
- **SC-007**: Para cada um dos papéis admin, atendente e técnico, zero controles de escrita visíveis
  nas quatro telas levam a uma recusa "Não autorizado" do servidor, e nenhum controle que o servidor
  permite fica oculto.

## Assumptions

- Escopo: só as telas de cadastro já existentes (Clínicas, Veterinários, Exames, Regras de Plantão)
  e a validação do servidor de Exames/Regras de Plantão (S5). Nenhuma tela ou regra de negócio
  nova.
- As telas de Clínicas e Veterinários não exibem valores monetários (o prazo de pagamento da
  clínica é em dias). Por isso o FR-015 vale só para Exames e Regras de Plantão.
- A edição inline de prazo de pagamento por linha na tela de Clínicas não é um formulário de
  criar/editar com abrir/fechar. Os FR-001 a FR-004 não se aplicam a ela, mas o FR-005 a FR-008
  (mensagens) sim.
- A validação de servidor do FR-011 (texto vazio ou só espaços) vale para categoria e nome de
  exame, os campos citados no achado da S13. Validações equivalentes em clínica e veterinário ficam
  fora desta spec, salvo se o plano encontrar o mesmo problema lá; nesse caso, registrar em
  "Descobertas".
- Dados já gravados com valor inválido não são corrigidos automaticamente, porque migração de dados
  está fora desta spec. Ao editar um desses registros, o servidor exige valor válido. O exame com
  preço -10,00 do banco de dev é dado de teste, não de produção.
- Um item recém-criado que não satisfaz o filtro ativo não aparece na lista; a confirmação do
  FR-014 basta. A tela não troca o filtro sozinha.
- A centralização do FR-016 é só no frontend e não cria nova regra de permissão: ela espelha as
  permissões que o servidor já tem. A fonte de verdade continua sendo `authorize()` no backend
  (Princípio II da constituição).
- A estabilidade do FR-018 pode ser obtida ajustando a forma como a suíte é executada (ex.: grau de
  paralelismo) ou tornando os testes mais rápidos, nunca removendo cobertura.
- Depende do merge da S13 (PR #30): o código de Exames e Regras de Plantão polido aqui só existe
  em `main` depois desse merge.

## Descobertas

<!-- Necessidades novas descobertas durante o desenvolvimento entram aqui, para decisão do usuário. -->

Durante o `/speckit-plan` (2026-10-01):

- **Telas da S12 mostram escrita a quem o servidor recusa.** No backend, `CLINICA_GERENCIAR` e
  `VETERINARIO_GERENCIAR` são só de admin (`auth/service.py`, `_PERMISSOES`), mas `TelaClinicas`
  e `TelaVeterinarios` mostram os controles de escrita a todo papel com acesso à rota. Atendente e
  técnico clicam e recebem 403 "Não autorizado". A primeira versão desta spec dizia que a US6 não
  mudaria o que cada papel vê, o que congelaria esse defeito. **Decisão do usuário: corrigir na
  S14.** US6, FR-016, FR-017 e SC-007 foram reescritos para "cada papel vê o que o servidor
  permite".
- **`colSpan` da linha em edição na S12.** `TelaClinicas` e `TelaVeterinarios` têm 6 colunas e a
  linha em edição usa `colSpan={5}`, o mesmo defeito corrigido na S13 (T052). **Decisão do usuário:
  incluir na S14** (FR-019).
- **Mensagens de 422 da S12 genéricas demais** (vira parte do FR-006, sem decisão nova): em
  `useClinicas`, todo 422 vira "CNPJ inválido", e em `useVeterinarios` todo 422 que não cita CRMV
  vira "A clínica selecionada não existe mais". Um 422 de validação de outro campo mostraria a
  mensagem errada.
- **`dia_semana` sem validação de faixa no backend** (fora de escopo, só registro): o backend aceita
  regra de plantão com `dia_semana` fora de 0-6. A tela web só oferece 0-6, então não há impacto
  hoje. Fica para decisão do usuário se vira item de uma spec futura.
