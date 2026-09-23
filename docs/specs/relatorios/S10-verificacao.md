# Verificação — S10

**Veredito**: ✅ APROVADA
**Data**: 2026-09-23
**Testes**: `uv run pytest` (em `apps/api`, execução isolada, sem outro processo concorrente no mesmo banco) — 462 passed, 0 failed, 2 warnings

Nota: as duas primeiras tentativas desta sessão de rodar a suíte completa produziram falhas
(`7 failed`/`13 failed`, variando a cada execução) em módulos que S10 não toca
(`test_veterinarios_router.py`, `test_atendimentos_router.py`, `test_usuarios_router.py`,
`test_portal_router.py`), todas por `IntegrityError` de chave duplicada (`admin@vertere.com`)
contra o Postgres real de teste. Isso ocorreu porque duas execuções de `pytest` (e uma execução
adicional de CLI) foram disparadas em paralelo pelo próprio verificador contra o mesmo banco
compartilhado, sem isolamento entre processos — não é um defeito do código de S10. Uma terceira
execução, isolada e sequencial, confirmou 462 passed / 0 failed. Reportando isso explicitamente
por transparência do processo de verificação, não como pendência da spec.

## Tasks

A spec lista 14 tasks, todas marcadas `[x]`. Todas são confirmáveis no código, com evidência de
commit e arquivo:

- T1 — `apps/api/src/vertere_api/importacao/domain.py`: contratos Pydantic das três abas,
  `InconsistenciaImportacao`, `ContadoresImportacao`, `PlanoImportacao` com propriedade
  `aplicavel`, e namespaces UUIDv5 (`NAMESPACE_CLINICAS` etc.) — commit `7db18e7`.
- T2/T3 — `tests/test_importacao_planejar_cadastros.py` e `importacao/service.py`: normalização
  de clínicas/veterinários, resolução por nome normalizado, coleta acumulada de duplicidade de
  CNPJ/CRMV mesmo quando a primeira ocorrência tem outro erro (`test_detecta_cnpj_repetido_quando_primeira_linha_tem_outro_erro`,
  `test_detecta_crmv_repetido_quando_primeira_linha_tem_outro_erro`) — commits `d5e983e`,
  `57aa5c7`, `96997f1`, `523ac0a`.
- T4/T5 — `tests/test_importacao_planejar_pacientes.py` e `service.py`: deduplicação por
  `(clínica, nome, proprietário)`, escolha da ocorrência mais recente, aviso para divergência
  histórica sem bloquear — commits `1d0e9ad`, `6beaf3f`.
- T6/T7 — `tests/test_importacao_planejar_atendimentos.py` e `service.py`: catálogo mínimo de
  exames, preservação de `Valor`/`Desconto`/`Adicional`/`Valor Total`, validação com `Decimal`,
  `Nº`/`Protocolo` preservados, bloqueio por total divergente e protocolo duplicado — commits
  `39322fc`, `b1ec8dc`.
- T8 — `atendimentos/domain.py`, `models.py`, `repository.py`, `schemas.py` e migration
  `d4a8f137c9b2_add_origem_to_atendimentos.py`: `numero_origem`/`protocolo_origem` opcionais,
  com índice único em `protocolo_origem` — commit `2f48197`.
- T9/T10 — `tests/test_importacao_xlsx.py` e `importacao/xlsx.py`: leitura tipada das três abas,
  rejeição de estrutura inválida, e normalização de `datetime.timedelta` (hora Excel como
  duração) via `_normalizar_hora_excel` — commits `f856b6b`, `5a1ce1b`, `3101937`, `c92ad00`.
- T11/T12 — `tests/test_importacao_repository.py` e `importacao/repository.py`: aplicação
  transacional, upsert idempotente por chave natural, rollback integral em colisão, incluindo os
  casos adicionados depois (`test_chave_natural_de_paciente_com_id_legado_bloqueia`,
  `test_chave_natural_de_exame_com_id_legado_bloqueia`) — commits `3d16c6e`, `258e525`, `fa68262`,
  `d748510`.
- T13/T14 — `tests/test_importacao_cli.py`, `importacao/cli.py` e
  `docs/operacao/importacao-historica.md`: dry-run sem escrita, bloqueio por inconsistência,
  `--aplicar` com relatório final, rollback em colisão relatado — commits `d44d3f8`, `3b036ee`.

Nenhuma task marcada sem evidência. Diferente da verificação anterior (bloqueada por
`datetime.timedelta` não tratado na coluna `Hora` e por chaves naturais não validadas contra o
destino), o código atual resolve as duas pendências, com testes dedicados e confirmação end-to-end
contra a planilha real (ver "Funcional de ponta a ponta").

## User Stories

| # | Story (resumo) | Status | Evidência |
|---|---|---|---|
| 1 | Importar clínicas, veterinários e atendimentos de 2026 | Atendida | `ler_planilha` (`importacao/xlsx.py`), `planejar_importacao` (`importacao/service.py`), `aplicar_plano` (`importacao/repository.py`); dry-run real executado nesta verificação processou as 42+157+3.288 linhas sem abortar. |
| 2 | Deduplicar pacientes por clínica/nome/proprietário | Atendida | Agrupamento por chave normalizada e escolha da ocorrência cronologicamente mais recente em `service.py:433-481`; cenários em `test_importacao_planejar_pacientes.py`. |
| 3 | Preservar valores históricos (exame, desconto, adicional, total) | Atendida | `AtendimentoPlanejado` preserva `preco_unitario`/`desconto`/`valor_adicional_plantao`/`valor_total` da própria linha; `regra_plantao_id=None` fixo no adapter; validação `Decimal` da igualdade `Valor+Adicional-Desconto=Total` em `service.py:560-593`; testes em `test_importacao_planejar_atendimentos.py` e `test_importacao_repository.py`. |
| 4 | Validar tudo antes de gravar, sem parcialidade | Atendida | `PlanoImportacao.aplicavel` é `False` diante de qualquer erro; `aplicar_plano` recusa plano não aplicável (`PlanoNaoAplicavel`) e faz rollback integral em qualquer exceção; confirmado no dry-run real (nenhuma escrita, `--banco` nem foi informado). |
| 5 | Relatório pós-validação com totais e erros localizados | Atendida | `_salvar_relatorio` em `cli.py` grava JSON com `contadores`, `totais_inconsistencias` e lista de inconsistências por aba/linha/coluna/código, sem nomes de paciente/proprietário; confirmado no relatório gerado nesta verificação contra a planilha real. |
| 6 | Reexecutar sem duplicar | Atendida | IDs UUIDv5 determinísticos por chave canônica; `_indexar_destino`/`_adicionar_ou_validar` fazem upsert só quando ID e chave natural batem, e bloqueiam com `ColisaoDestino` caso contrário; cobertura em `test_aplica_plano_e_reexecuta_sem_duplicar`, `test_colisao_faz_rollback_de_toda_a_aplicacao`, `test_chave_natural_de_paciente_com_id_legado_bloqueia`, `test_chave_natural_de_exame_com_id_legado_bloqueia`. |

## Seam de teste

A seam central `planejar_importacao(dados_planilha) -> PlanoImportacao` está isolada de XLSX,
filesystem, SQLAlchemy e relógio, testada com estruturas em memória (`tests/test_importacao_planejar_*.py`).
Cobre todos os cenários listados em Testing Decisions: normalização com diferenças de
caixa/acento/espaço, deduplicação de paciente, preservação de valores financeiros e proveniência,
derivação do catálogo com aviso de preço divergente, coleta acumulada de múltiplas inconsistências
sem tornar o plano aplicável, e IDs estáveis/diferentes conforme o conteúdo. O adapter XLSX
(`test_importacao_xlsx.py`) cobre leitura de fixture mínimo, rejeição de estrutura inválida e,
após a correção mais recente, a hora Excel representada como `timedelta`. O adapter SQLAlchemy
(`test_importacao_repository.py`) cobre aplicação, reexecução idempotente, rollback por colisão de
conteúdo e colisão por chave natural pré-existente. A CLI (`test_importacao_cli.py`) cobre
dry-run, bloqueio, `--aplicar` e rollback com relatório. Nenhum teste é apenas "não quebrou": cada
um afirma o comportamento específico decidido na spec.

## Out of Scope

Nenhum item da lista foi violado: não há correção automática de dados, não há endpoint ou tela de
importação (`main.py` não registra rota do módulo), não há importação de laudos/usuários/fechamentos/
regras de plantão, não há recálculo de atendimentos históricos com preços/regras atuais
(`regra_plantao_id` fica `None` e `preco_unitario` vem da própria linha), e o relatório/testes não
contêm a planilha real nem dados pessoais (fixtures usam dados sintéticos; relatório JSON só tem
contadores e localização).

## ADRs

Aderente aos ADRs 0001/0002: backend Python 3.13, dependências geridas por `uv`
(`openpyxl>=3.1.5` declarado em `pyproject.toml` e presente no `uv.lock`), SQLAlchemy 2.x, Alembic
(migration `d4a8f137c9b2`) e `pytest`. Nenhum desvio de stack não documentado.

## Funcional de ponta a ponta

Executado nesta verificação, em `apps/api`:

```
uv run python -m vertere_api.importacao.cli "../../PLANILHA DE CONTROLE 2026 - VERTERE LAB (4).xlsx" --relatorio <tmp>.json
```

Resultado: código de saída `1` (esperado — fonte real com erros bloqueantes), sem exceção não
tratada (o `datetime.timedelta` da linha 545 da aba `Dados` foi normalizado corretamente para
`time`), relatório JSON gerado com sucesso: 27 clínicas, 87 veterinários, 0 pacientes, 284 exames,
0 atendimentos planejados; 4.133 erros e 78 avisos. Nenhuma escrita no banco ocorreu (`--banco` não
foi informado). O caminho `--aplicar` não foi exercitado contra banco real nesta verificação (a
fonte real não produz plano aplicável, e aplicar em produção está corretamente fora de escopo);
esse caminho está confirmado pela suíte automatizada com SQLite/Postgres de teste real
(`test_aplicar_persiste_plano_valido`, `test_aplica_plano_e_reexecuta_sem_duplicar`). Isso é uma
limitação desta verificação: a aplicação real fim-a-fim contra um banco de destino com a planilha
real não foi (e não deveria ser, por escopo) exercitada agora.

## Descobertas

A seção "Descobertas" do arquivo da spec está vazia. Nada foi implementado fora do escopo sem
decisão do PO.

## Observação sobre o arquivo da spec

A seção "## Verificação" do arquivo `docs/specs/S10-importacao-dados-historicos.md` ainda contém o
texto do bloqueio anterior ("bloqueada até normalizar células de hora..."), desatualizado em
relação a este veredito, embora o frontmatter já esteja como `status: entregue`. Isso é uma
inconsistência de documentação a corrigir por quem decide o próximo passo — não um motivo de
bloqueio, pois o bloqueio relatado nesse texto já está resolvido no código (ver Tasks/T9-T10 e
Funcional de ponta a ponta acima).

## Pendências (se bloqueada)

Nenhuma.
