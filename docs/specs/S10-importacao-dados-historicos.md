---
codigo: S10
modulo: Importação de Dados Históricos
issue: https://github.com/NicolasNagel/vertere-project/issues/22
status: pronta
---

## Problem Statement

O MVP já cobre a operação futura do laboratório, mas o histórico de 2026 continua preso na
planilha `PLANILHA DE CONTROLE 2026 - VERTERE LAB (4).xlsx`. Sem migrar as abas `Cadastro
Clínicas`, `Cadastro Veterinários` e `Dados`, o lançamento perderia o cadastro acumulado e 3.288
linhas de atendimentos. A fonte também contém inconsistências reais — campos obrigatórios vazios,
identificadores inválidos e nomes escritos com variações — que não podem ser silenciosamente
inventadas, ignoradas ou persistidas parcialmente.

## Solution

Um módulo de importação executado por CLI em duas fases: primeiro lê o arquivo XLSX e produz um
`PlanoImportacao` determinístico, contendo as entidades normalizadas e um relatório detalhado de
inconsistências; depois, somente mediante `--aplicar` e quando não existir erro bloqueante, persiste
o plano inteiro em uma única transação. A execução padrão é dry-run e nunca altera o banco.

A função pura `planejar_importacao(dados_planilha) -> PlanoImportacao` é a seam central. Leitura de
XLSX e persistência SQLAlchemy são adapters separados. Nenhuma ausência é preenchida por
suposição: erro bloqueante impede toda a aplicação, mas continua sendo coletado no relatório para
que a planilha possa ser corrigida em uma única rodada.

## User Stories

1. Como administrador, quero importar clínicas, veterinários e atendimentos de 2026 da planilha,
   para não perder o histórico já registrado (PRD #37).
2. Como administrador, quero que pacientes repetidos sejam normalizados e deduplicados por
   clínica, nome e proprietário, para criar um cadastro formal reutilizável sem multiplicar o
   mesmo animal por variações de escrita.
3. Como administrador, quero preservar os valores históricos de exame, desconto, adicional e
   total exatamente como registrados, para que reajustes e regras atuais não alterem o passado.
4. Como administrador, quero validar toda a planilha antes de gravar qualquer dado, para corrigir
   inconsistências sem deixar uma importação parcial no banco.
5. Como administrador, quero um relatório pós-validação com totais planejados e erros por
   aba/linha/coluna, para confirmar o resultado antes de descontinuar a planilha (PRD #38).
6. Como operador da migração, quero poder executar novamente o mesmo arquivo sem duplicar dados,
   para recuperar com segurança de interrupções ou revisar o dry-run.

## Implementation Decisions

- **Interface profunda e pura**: `planejar_importacao(dados_planilha) -> PlanoImportacao` concentra
  normalização, resolução de referências, deduplicação, validação financeira e geração de IDs. O
  argumento é uma representação tipada das três abas, sem dependência de XLSX, filesystem,
  SQLAlchemy ou relógio; o retorno contém entidades planejadas, contadores e uma lista completa de
  `InconsistenciaImportacao`.
- **Adapters separados**: um adapter lê exclusivamente as abas e cabeçalhos esperados do XLSX; um
  adapter SQLAlchemy aplica o plano. `openpyxl` será dependência de execução do backend para a
  leitura do arquivo. Ausência de aba/cabeçalho esperado é erro bloqueante de estrutura.
- **CLI explícita**: um comando executável pelo ambiente `uv` recebe caminho do XLSX e URL de banco.
  Sem `--aplicar`, apenas imprime e grava o relatório JSON. Com `--aplicar`, exige plano sem erros,
  persiste tudo em uma transação e emite o relatório final. O caminho da planilha não fica fixado no
  código.
- **Nada de endpoint HTTP**: a migração é uma operação administrativa única anterior ao lançamento,
  não uma capacidade permanente da aplicação nem uma rota exposta.
- **Normalização sem destruir apresentação**: chaves de correspondência removem espaços nas pontas,
  colapsam espaços internos, aplicam Unicode NFKD, removem acentos e usam `casefold`; pontuação de
  CNPJ/telefone é normalizada conforme o campo. O texto de apresentação persistido preserva a
  grafia canônica escolhida da fonte.
- **Clínicas**: a aba `Cadastro Clínicas` é a fonte canônica. CNPJ é normalizado para dígitos e deve
  ter 14 dígitos; nome, endereço, telefone, e-mail e status são preservados. Nome ausente, CNPJ
  ausente/inválido/duplicado ou duas clínicas que colidam após normalização bloqueiam a aplicação.
  Campos textuais opcionais ausentes viram string vazia, pois o modelo atual os aceita; status
  desconhecido é erro.
- **Veterinários**: a aba `Cadastro Veterinários` é a fonte canônica. A clínica é resolvida por nome
  normalizado. CRMV não pode ser vazio e continua único globalmente, conforme S3. Nome/CRMV/clínica
  ausentes, referência ambígua/inexistente ou CRMV duplicado bloqueiam; telefone/e-mail ausentes
  viram string vazia; status desconhecido é erro.
- **Pacientes**: são derivados de `Dados` e deduplicados pela chave normalizada `(clínica, nome do
  paciente, proprietário)`, exatamente os campos de busca definidos no PRD. Para chaves repetidas,
  a linha cronologicamente mais recente fornece espécie, raça, sexo e idade; divergências anteriores
  são registradas como avisos, não como erro. Qualquer campo obrigatório ausente na linha canônica,
  idade não inteira/não negativa ou referência de clínica inválida bloqueia.
- **Atendimentos**: cada linha útil de `Dados` representa um atendimento distinto com exatamente um
  `ItemExame`; a planilha atual tem `Nº` e `Protocolo` únicos por linha, não múltiplas linhas por
  atendimento. Clínica e veterinário são resolvidos por nomes normalizados, e paciente pela chave
  acima. Data e hora formam `data_hora`; status importado é `ativo`.
- **Proveniência preservada**: `Atendimento`/`AtendimentoModel` ganham os campos opcionais
  `numero_origem` e `protocolo_origem`, com migration Alembic e unicidade para protocolo não nulo.
  Registros criados normalmente continuam com ambos `None`; registros importados preservam os dois
  identificadores da planilha.
- **Exames necessários à FK**: o plano deriva um catálogo mínimo pela chave normalizada
  `(tipo/categoria de exame, nome do exame)`. A ocorrência cronologicamente mais recente define o
  `preco_base` do catálogo; divergências históricas de preço geram aviso. Cada item do atendimento
  preserva o `Valor` da própria linha como `preco_unitario`, portanto o passado não é recalculado
  pelo catálogo atual.
- **Financeiro histórico**: `Desconto` e `Adicional` vazios equivalem a zero. O plano valida, com
  `Decimal`, que `Valor + Adicional - Desconto == Valor Total`; divergência, valor inválido ou valor
  negativo bloqueia. `regra_plantao_id` fica `None`, pois o adicional histórico é explícito e não
  deve ser associado retroativamente às regras atuais.
- **IDs determinísticos e reexecução**: IDs são UUIDv5 em namespaces constantes do módulo, derivados
  das chaves canônicas; atendimentos usam o protocolo de origem. O adapter faz upsert apenas quando
  o ID e a chave natural correspondem; colisão com conteúdo incompatível bloqueia e faz rollback.
- **Atomicidade**: o adapter de importação trabalha numa única `Session`, usa `flush` durante a
  aplicação e executa um único `commit` ao final. Qualquer falha provoca rollback integral. Ele não
  chama os repositórios atuais que fazem commit por entidade.
- **Relatório sem dados sensíveis desnecessários**: JSON contém contadores por entidade, quantidade
  de avisos/erros e inconsistências com aba, linha, coluna, código e mensagem curta. Não replica
  linhas completas nem inclui nomes de pacientes/proprietários no relatório.

## Testing Decisions

A seam confirmada é `planejar_importacao(dados_planilha) -> PlanoImportacao`, testada com estruturas
em memória, seguindo o prior art de `authenticate`/`authorize` da S1. Os testes cobrem:

- normalização e resolução de clínica/veterinário com diferenças de caixa, acento e espaços;
- deduplicação de paciente e escolha determinística da ocorrência mais recente;
- preservação de preço, desconto, adicional, total, Nº e Protocolo;
- derivação do catálogo e aviso quando o mesmo exame tem preços históricos diferentes;
- coleta de múltiplas inconsistências numa passagem, sem produzir plano aplicável;
- IDs estáveis para o mesmo conteúdo e diferentes para chaves diferentes;
- leitura de um fixture XLSX mínimo pelas três abas e rejeição de estrutura inválida;
- adapter SQLAlchemy aplicando plano válido, reexecutando sem duplicar e fazendo rollback integral
  diante de colisão/falha.

O teste de CLI valida dry-run sem escrita e `--aplicar` com relatório final; não usa a planilha real
nem expõe seus dados em fixtures ou snapshots.

## Tasks

- [ ] T1 — modelos de entrada, inconsistência, contadores e `PlanoImportacao`, incluindo namespaces UUIDv5 e códigos de erro (User Stories: 4, 5, 6)
- [ ] T2 — testes da seam para normalização, referências e coleta acumulada de inconsistências (User Stories: 1, 2, 4, 5)
- [ ] T3 — implementar normalização e planejamento de clínicas/veterinários (User Stories: 1, 4, 5, 6)
- [ ] T4 — testes da seam para deduplicação/canonicalização de pacientes (User Stories: 2, 4, 6)
- [ ] T5 — implementar planejamento de pacientes derivados de `Dados` (User Stories: 2, 4, 6)
- [ ] T6 — testes da seam para exames, atendimentos, preços históricos, totais e proveniência (User Stories: 1, 3, 4, 6)
- [ ] T7 — implementar planejamento do catálogo mínimo e dos atendimentos históricos (User Stories: 1, 3, 4, 6)
- [ ] T8 — adicionar `numero_origem`/`protocolo_origem` ao domínio, modelo e migration de atendimentos, mantendo compatibilidade com fluxos existentes (User Stories: 1, 3, 6)
- [ ] T9 — testes do adapter XLSX com fixture mínimo e estruturas inválidas (User Stories: 1, 4, 5)
- [ ] T10 — implementar leitura XLSX tipada e adicionar `openpyxl` às dependências (User Stories: 1, 4, 5)
- [ ] T11 — testes do adapter SQLAlchemy para aplicação, reexecução idempotente e rollback (User Stories: 1, 3, 4, 6)
- [ ] T12 — implementar aplicação transacional do plano no banco (User Stories: 1, 3, 4, 6)
- [ ] T13 — testes da CLI para dry-run, bloqueio por inconsistência, `--aplicar` e relatório JSON (User Stories: 4, 5)
- [ ] T14 — implementar CLI e documentar comandos operacionais de validação/aplicação (User Stories: 1, 4, 5)

## Out of Scope

- Corrigir automaticamente a planilha, inventar CNPJ/CRMV ou escolher silenciosamente entre
  referências ambíguas.
- Importar laudos, usuários, fechamentos financeiros ou regras de plantão; essas informações não
  fazem parte das três abas definidas pelo PRD para esta migração.
- Recalcular atendimentos históricos com preços ou regras de plantão atuais.
- Criar endpoint ou tela permanente de upload/importação.
- Executar a importação em produção dentro desta spec; a entrega é o script validado e o runbook.
- Armazenar o arquivo XLSX no banco ou copiar dados pessoais para logs/fixtures/relatórios.

## Further Notes

A inspeção estrutural da planilha encontrou 42 linhas de clínicas, 157 de veterinários e 3.288 de
`Dados`. Existem lacunas reais, inclusive CNPJ e CRMV ausentes, portanto o primeiro dry-run da
planilha atual deve produzir erros bloqueantes. Isso é comportamento esperado: o relatório orienta
a correção da fonte antes da execução definitiva. A planilha real permanece somente como entrada
local e não deve ser usada como fixture de teste.

## Descobertas

<!-- Necessidades novas encontradas durante o desenvolvimento, fora do escopo acima. Não implementar sem decisão do PO. -->

## Verificação

<!-- Preenchido por /fechar-spec -->
