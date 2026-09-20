---
codigo: S7
modulo: Laudos
issue: https://github.com/NicolasNagel/vertere-project/issues/15
status: entregue
---

## Problem Statement

Hoje, depois que um atendimento é feito, o resultado de cada exame é redigido manualmente pelo
técnico e enviado ao veterinário fora de qualquer sistema (planilha não registra laudo algum) —
sem template padronizado por tipo de exame, sem rastro de quando foi enviado, e sem forma fácil de
reemitir uma segunda via. Isso é a lacuna que os módulos anteriores (Clínicas, Veterinários,
Pacientes, Exames & Precificação, Atendimentos) foram construídos para preencher: um `Atendimento`
já existe (S6) com um ou mais exames realizados, mas nenhum resultado pode ser formalizado,
armazenado nem enviado. Sem Laudos, o atendimento registrado no sistema não fecha o ciclo que o
PRD descreve (US25-31) — coletar, calcular o valor, **e entregar o resultado**.

## Solution

Um módulo `laudos` com duas entidades administradas: `TemplateLaudo` (campos e faixas de
referência por categoria de exame, mantido por `admin` — US26) e `Laudo` (o resultado preenchido
de **um exame específico dentro de um atendimento**, usando o template da categoria daquele
exame). O módulo reaproveita `atendimentos/repository` (S6), `exames/repository` (S5) e
`veterinarios/repository` (S3) para validar referências e montar o conteúdo do laudo, sem
reimplementar nenhuma dessas decisões. Ao finalizar um laudo, o service monta os dados (função
pura `montar_dados_laudo`), gera um PDF e dispara o envio por e-mail para o e-mail de laudos do
veterinário, através de duas interfaces (`Protocol`) injetadas — `GeradorPdfLaudo` e
`EnvioLaudoGateway` — seguindo o mesmo padrão de seam já usado nas specs anteriores para manter o
service testável sem infraestrutura real.

## User Stories

1. Como técnico, quero criar um laudo vinculado a um atendimento, usando o template
   correspondente ao tipo de exame (ex: hemograma, bioquímico, urinálise, perfil iônico), para
   preencher apenas os campos relevantes daquele exame.
2. Como administrador, quero cadastrar/editar os templates de laudo por tipo de exame (quais
   campos e faixas de referência aparecem), para manter os laudos atualizados sem depender de
   alteração de código.
3. Como técnico, quero salvar um laudo como rascunho antes de finalizar, para revisar antes do
   envio.
4. Como técnico, quero finalizar um laudo e disparar o envio, para que o veterinário/clínica
   responsável receba o resultado.
5. Como sistema, quero enviar o laudo finalizado por e-mail automaticamente para o e-mail de
   laudos cadastrado do veterinário, para agilizar a entrega.
6. Como usuário do tipo clínica, quero acessar os laudos dos meus próprios atendimentos pelo
   sistema, para ter uma segunda via sempre disponível (download via portal dedicado fica para a
   spec futura de Portal da Clínica — ver "Out of Scope"; aqui a clínica já enxerga o laudo e seus
   dados através do endpoint de listagem/consulta, com escopo automático pela própria clínica).
7. Como técnico ou administrador, quero reemitir/reenviar um laudo já finalizado, para casos de
   e-mail não recebido ou solicitação de segunda via.

## Implementation Decisions

- **Módulo novo**: `laudos`, seguindo a mesma estrutura de pastas dos módulos anteriores
  (`domain`, `repository` via `Protocol`, `service`, `router`, `schemas`, `models.py`). Duas
  entidades no mesmo módulo (`TemplateLaudo` e `Laudo`) pela mesma razão de S5
  (`Exame`/`RegraPlantao`): coesas em torno do mesmo problema, e `Laudo` sempre consome um
  `TemplateLaudo`.
- **Granularidade do `Laudo` — por exame, não por atendimento**: um `Laudo` referencia
  `atendimento_id` + `exame_id` (não o atendimento inteiro). Um atendimento com hemograma +
  urinálise gera dois laudos, cada um com o template da sua própria categoria — cumpre US25
  literalmente ("template correspondente ao tipo de exame") sem precisar combinar campos de
  templates diferentes num único documento. Não há suporte a mais de um laudo para o mesmo par
  `(atendimento_id, exame_id)` nesta spec (ver "Out of Scope" sobre `quantidade > 1` do mesmo
  exame no mesmo atendimento).
- **Campos de `TemplateLaudo`**: `id`, `categoria` (str, mesmo valor de `Exame.categoria` de S5 —
  não há chave estrangeira formal entre os dois, só convenção de valor, igual à ausência de
  catálogo fechado de categoria já decidida em S5), `campos` (lista de `CampoTemplate`), `ativo`
  (bool).
- **Campos de `CampoTemplate`** (value object, só existe dentro de um `TemplateLaudo`): `nome`
  (str, ex: "Hemácias"), `unidade` (`str | None`, ex: "milhões/µL"), `faixa_referencia`
  (`str | None`, texto livre — ex: "5.5 – 8.5" ou "Negativo" — formatos de faixa variam demais
  entre categorias de exame para modelar como min/max numérico único nesta spec).
- **Campos de `Laudo`**: `id`, `atendimento_id`, `exame_id`, `template_id` (snapshot do template
  usado em `criar_laudo` — editar o template depois não deve mudar retroativamente um laudo já
  criado, mesma garantia de snapshot já usada para preço em S6/US16), `valores` (lista de
  `ValorCampo`: `nome_campo` + `valor` preenchido, alinhado aos `campos` do template no momento da
  criação), `status` (`StatusLaudo`: `rascunho` | `finalizado`), `criado_por` (`usuario_id`),
  `criado_em` (`datetime`), `finalizado_por` (`str | None`), `finalizado_em` (`datetime | None`),
  `enviado_em` (`datetime | None` — preenchido só quando o envio de e-mail tiver sucesso),
  `erro_envio` (`str | None` — mensagem do último envio malsucedido, para orientar o reenvio de
  US31; `None` quando o último envio (se houve) teve sucesso).
- **`montar_dados_laudo(laudo, template, atendimento, exame, paciente, veterinario, clinica) ->
  DadosLaudo`**: função pura, sem repositório — monta a estrutura de dados final do laudo
  (identificação do paciente/clínica/veterinário, exame, data do atendimento, lista de
  campo+valor+unidade+faixa_referencia) a partir das entidades já carregadas pelo chamador. É a
  seam de teste real deste módulo: cobre a montagem de conteúdo sem precisar gerar PDF nem enviar
  e-mail. `gerar_pdf_laudo` (ver abaixo) apenas renderiza o `DadosLaudo` já montado.
- **Geração de PDF — `GeradorPdfLaudo` (`Protocol`)**: `gerar(dados: DadosLaudo) -> bytes`.
  Implementação real usa `fpdf2` (biblioteca pura Python, sem dependência de sistema como
  Cairo/Pango — mantém a instalação simples em qualquer ambiente, alinhado ao requisito de baixo
  custo/operação simples do PRD). Decisão de implementação desta spec, não coberta pelos ADRs
  0001/0002 (que não tratam geração de documento); registrada aqui como a primeira decisão dessa
  natureza no projeto. O PDF não é persistido — é gerado sob demanda em `finalizar_laudo` e
  `reenviar_laudo`, a partir de `montar_dados_laudo`, que é determinístico dado o estado do
  `Laudo`.
- **Envio de e-mail — `EnvioLaudoGateway` (`Protocol`)**: `enviar(destinatario: str, assunto: str,
  corpo: str, anexo_pdf: bytes, nome_anexo: str) -> None`, levanta uma exceção em caso de falha.
  Implementação real via SMTP (`smtplib`, biblioteca padrão — sem novo serviço externo a
  contratar, mesma lógica de baixo custo). Configuração (host, porta, usuário, senha, remetente)
  entra em `Settings` (`settings.py`) como campos novos com default vazio/local (ex: Mailhog/
  Mailpit em dev), mesmo padrão de `database_url`/`jwt_secret` já existentes.
- **`criar_laudo(atendimento_id, exame_id, usuario_id, repos...)`**: valida que o `Atendimento`
  existe e está `status=ativo` (atendimento cancelado não gera laudo — erro de domínio), que
  `exame_id` está entre os `itens_exame` do atendimento (senão erro de domínio), que existe um
  `TemplateLaudo` ativo para a `categoria` do exame (senão erro de domínio,
  `TemplateLaudoNaoEncontrado` — sem template não há como preencher o laudo), e que não existe já
  um `Laudo` para o mesmo par `(atendimento_id, exame_id)` (senão erro de domínio,
  `LaudoJaExiste`). Cria o `Laudo` com `status=rascunho`, `template_id` snapshot do template
  encontrado, e `valores` vazios (a lista de campos do template define o que pode ser preenchido;
  o valor inicial de cada campo é string vazia).
- **`salvar_rascunho(laudo_id, valores, usuario_id, repo)`**: atualiza `valores` de um `Laudo` com
  `status=rascunho`. Rejeitado com erro de domínio se `status=finalizado` (laudo finalizado não é
  editável — reemissão é reenvio do mesmo conteúdo, não edição, ver US31).
- **`finalizar_laudo(laudo_id, usuario_id, repos..., gerador_pdf, envio_gateway)`**: exige
  `status=rascunho` (rejeita finalizar um já finalizado). Monta `DadosLaudo` via
  `montar_dados_laudo`, gera o PDF via `gerador_pdf.gerar(...)`, tenta enviar via
  `envio_gateway.enviar(...)` para o `email` do `Veterinario` do atendimento. Independentemente do
  resultado do envio, grava `status=finalizado`, `finalizado_por`, `finalizado_em` — finalizar não
  fica bloqueado por falha de e-mail (o PDF já existe, o conteúdo já está correto; falha de envio é
  um problema de entrega, não de conteúdo). Se o envio tiver sucesso, grava `enviado_em` e
  `erro_envio=None`; se falhar, `enviado_em` permanece o valor anterior (`None` na primeira
  finalização) e `erro_envio` grava a mensagem da exceção — sinalizando a US31 que existe um envio
  pendente de retry.
- **`reenviar_laudo(laudo_id, repos..., gerador_pdf, envio_gateway)`**: exige `status=finalizado`
  (não é possível reenviar um rascunho — precisa finalizar primeiro). Regenera `DadosLaudo`/PDF a
  partir do estado atual do `Laudo` (mesmo conteúdo já finalizado, snapshot de `template_id`
  garante isso) e repete a tentativa de envio, atualizando `enviado_em`/`erro_envio` da mesma forma
  que `finalizar_laudo`.
- **`listar_laudos(filtros, usuario, repos...)`**: filtra por `atendimento_id`, `status` e período
  (`data_inicio`/`data_fim` sobre `criado_em`). Quando o papel do usuário autenticado é `clinica`,
  filtra automaticamente pelos laudos cujos atendimentos pertencem à clínica do usuário — mesmo
  padrão de filtro de escopo já usado em `atendimentos/service.listar_atendimentos` (S6), pelo
  mesmo motivo: `authorize()` decide acesso a um recurso único, não filtro de lista (ver
  "Descobertas" de S6, issue [#13](https://github.com/NicolasNagel/vertere-project/issues/13) —
  esta spec reproduz o padrão já adotado, não resolve a lacuna).
- **`ver_laudo(laudo_id, usuario, repos...)`**: busca um laudo único; quando o papel é `clinica`,
  este é um recurso único (ao contrário da listagem), então usa `authorize(papel,
  Acao.LAUDO_VER, clinica_usuario=usuario.clinica_id, clinica_recurso=<clínica do atendimento do
  laudo>)` de verdade — `Acao.LAUDO_VER` já está em `_ACOES_COM_ESCOPO_DE_CLINICA` desde S1, esta
  spec é a primeira a efetivamente exercitar esse caminho com `clinica_recurso` preenchido pelo
  router.
- **Autorização**: reaproveita `authorize()` de S1.
  - `cadastrar_template_laudo`, `editar_template_laudo`, `inativar_template_laudo`,
    `reativar_template_laudo`: exigem `authorize(papel, Acao.TEMPLATE_LAUDO_GERENCIAR)`, só
    `admin` (US26 atribui isso ao administrador).
  - `listar_templates_laudo`: exige `authorize(papel, Acao.TEMPLATE_LAUDO_VER)`, concedida a
    `admin` e `tecnico` (quem monta o formulário de laudo precisa ver os campos do template;
    `atendente`/`clinica` não têm necessidade identificada no PRD).
  - `criar_laudo`, `salvar_rascunho`, `finalizar_laudo`, `reenviar_laudo`: exigem
    `authorize(papel, Acao.LAUDO_GERENCIAR)`, concedida a `admin` e `tecnico` (US25/27/28 atribuem
    a criação/rascunho/finalização ao técnico; US31 atribui reemissão a "técnico ou
    administrador").
  - `listar_laudos`, `ver_laudo`: exigem `authorize(papel, Acao.LAUDO_VER)` — ação já existente
    desde S1, concedida a `admin`, `tecnico` e `clinica` (permissão já cadastrada em
    `_PERMISSOES`; nenhuma mudança de grant necessária, só o uso real que faltava desde S1/S4/S6).
  - Novas ações desta spec: `Acao.TEMPLATE_LAUDO_GERENCIAR`, `Acao.TEMPLATE_LAUDO_VER`,
    `Acao.LAUDO_GERENCIAR`, adicionadas em `auth/service.py` seguindo o padrão de
    `Acao.EXAME_GERENCIAR`/`Acao.EXAME_VER`.
- **Tipo dos campos monetários**: não se aplica a este módulo — `Laudo`/`TemplateLaudo` não têm
  valor monetário.

## Testing Decisions

- Segue o padrão de `exames/service.py` (S5) e `atendimentos/service.py` (S6):
  `laudos/service.py` são funções puras que recebem `TemplateLaudoRepository`/`LaudoRepository`
  (Protocol) como parâmetro, testadas com implementações fake em memória — sem HTTP/DB.
  `criar_laudo`/`finalizar_laudo`/`reenviar_laudo` recebem também os repositórios de S3/S5/S6
  (fakes) para validar referências, sem reimplementar a lógica desses módulos.
- `montar_dados_laudo` é testada isoladamente, sem nenhum repositório (função pura sobre as
  entidades já carregadas) — cobre: montagem correta de identificação (paciente/clínica/
  veterinário/exame), lista de campos com valor/unidade/faixa_referência alinhada ao template
  snapshot, e um `valores` vazio ainda produz `DadosLaudo` válido (rascunho sem preenchimento).
- `gerar_pdf_laudo` (implementação real com `fpdf2`) recebe apenas um teste de fumaça: gerar a
  partir de um `DadosLaudo` de exemplo produz `bytes` não vazios com o cabeçalho `%PDF` — não
  testa o conteúdo renderizado byte a byte (seria um teste frágil); a correção do **conteúdo** é
  responsabilidade de `montar_dados_laudo`, testada exaustivamente acima.
- `finalizar_laudo`/`reenviar_laudo` são testadas com um `GeradorPdfLaudo` fake (retorna bytes
  fixos) e um `EnvioLaudoGateway` fake (registra chamadas em memória, podendo ser configurado para
  levantar exceção) — cobrindo: finalização com envio bem-sucedido (`enviado_em` preenchido,
  `erro_envio=None`), finalização com envio malsucedido (`status=finalizado` mesmo assim,
  `erro_envio` preenchido), reenvio após falha (novo `enviado_em`), rejeição de finalizar um
  `status=finalizado` e de reenviar um `status=rascunho`.
- Módulo testado: `laudos` (funções `cadastrar_template_laudo`, `editar_template_laudo`,
  `inativar_template_laudo`, `reativar_template_laudo`, `listar_templates_laudo`, `criar_laudo`,
  `salvar_rascunho`, `finalizar_laudo`, `reenviar_laudo`, `listar_laudos`, `ver_laudo`,
  `montar_dados_laudo`), cobrindo: criação de template, edição, inativação/reativação e listagem;
  criação de laudo válida, rejeitada por atendimento inexistente/cancelado, por exame fora do
  atendimento, por template inexistente/inativo para a categoria, e por laudo duplicado; rascunho
  editável e rejeição de edição após finalizado; finalização com sucesso/falha de envio e reenvio;
  listagem com filtro por atendimento/status/período e filtro automático por clínica.
- Autorização é testada reutilizando `authorize()` de S1 diretamente: um teste de integração leve
  na camada de router confirma que `Acao.TEMPLATE_LAUDO_GERENCIAR`, `Acao.TEMPLATE_LAUDO_VER`,
  `Acao.LAUDO_GERENCIAR` e `Acao.LAUDO_VER` são os pontos de decisão usados, incluindo o caso de
  `tecnico` autorizado em `LAUDO_GERENCIAR` mas bloqueado em `TEMPLATE_LAUDO_GERENCIAR`, e o caso
  de `clinica` autorizado em `ver_laudo` só para a própria clínica (`clinica_recurso` divergente →
  403).

## Tasks

- [x] T1 — Domínio (`TemplateLaudo`, `CampoTemplate`, `Laudo`, `ValorCampo`, `StatusLaudo`,
      `DadosLaudo`) e repositórios (`TemplateLaudoRepository`, `LaudoRepository`, Protocol) com
      implementações fake em memória para os testes (User Stories: base para todas)
- [x] T2 — Testes de `cadastrar_template_laudo`, `editar_template_laudo`,
      `inativar_template_laudo`, `reativar_template_laudo`, `listar_templates_laudo` (User
      Stories: 2)
- [x] T3 — Implementação dessas funções em `laudos/service.py`, fazendo os testes de T2 passarem
      (User Stories: 2)
- [x] T4 — Testes de `montar_dados_laudo` (função pura, sem repositório): montagem completa,
      `valores` vazio (rascunho), campos sem unidade/faixa_referência (User Stories: 1, 3, 4)
- [x] T5 — Implementação de `montar_dados_laudo` em `laudos/service.py`, fazendo os testes de T4
      passarem (User Stories: 1, 3, 4)
- [x] T6 — Testes de `criar_laudo`: criação válida, rejeição por atendimento inexistente/
      cancelado, exame fora do atendimento, template inexistente/inativo, laudo duplicado (User
      Stories: 1)
- [x] T7 — Implementação de `criar_laudo` em `laudos/service.py`, fazendo os testes de T6 passarem
      (User Stories: 1)
- [x] T8 — Testes de `salvar_rascunho`: edição permitida em rascunho, rejeitada em finalizado
      (User Stories: 3)
- [x] T9 — Implementação de `salvar_rascunho` em `laudos/service.py`, fazendo os testes de T8
      passarem (User Stories: 3)
- [x] T10 — Testes de `finalizar_laudo` e `reenviar_laudo` com `GeradorPdfLaudo`/
      `EnvioLaudoGateway` fakes: finalização com envio bem-sucedido, finalização com envio
      malsucedido (finaliza mesmo assim, grava erro), reenvio após falha, rejeição de finalizar
      já finalizado e de reenviar um rascunho (User Stories: 4, 5, 7)
- [x] T11 — Implementação de `finalizar_laudo` e `reenviar_laudo` em `laudos/service.py`, fazendo
      os testes de T10 passarem (User Stories: 4, 5, 7)
- [x] T12 — Testes de `listar_laudos` e `ver_laudo` com filtro por atendimento/status/período,
      incluindo o filtro automático por clínica quando o papel do usuário é `clinica` (User
      Stories: 6)
- [x] T13 — Implementação de `listar_laudos` e `ver_laudo` em `laudos/service.py`, fazendo os
      testes de T12 passarem (User Stories: 6)
- [x] T14 — Implementação real de `GeradorPdfLaudo` (`fpdf2`) e `EnvioLaudoGateway` (SMTP via
      `smtplib`), com teste de fumaça do gerador de PDF e novos campos de configuração SMTP em
      `Settings` (User Stories: 4, 5, 7)
- [x] T15 — Persistência real: modelos SQLAlchemy (`TemplateLaudo` com `campos` como tabela
      relacionada ou campo JSON, `Laudo` com `valores` como campo JSON — decisão de implementação)
      + migração Alembic, implementando `TemplateLaudoRepository`/`LaudoRepository` contra
      PostgreSQL (User Stories: 1, 2, 3, 4, 5, 6, 7)
- [x] T16 — Novas ações `Acao.TEMPLATE_LAUDO_GERENCIAR`, `Acao.TEMPLATE_LAUDO_VER`,
      `Acao.LAUDO_GERENCIAR` em `auth/service.py` (`_PERMISSOES`: `TEMPLATE_LAUDO_GERENCIAR` só
      admin; `TEMPLATE_LAUDO_VER` admin + tecnico; `LAUDO_GERENCIAR` admin + tecnico) (User
      Stories: todas, via checagem de acesso)
- [x] T17 — Endpoints HTTP (`laudos/router.py` + `schemas.py`): CRUD de template de laudo, criar/
      salvar rascunho/finalizar/reenviar/listar/ver laudo (via `Depends(exigir_acao(...))` nas
      ações correspondentes, incluindo `clinica_recurso` real em `ver_laudo` e o filtro automático
      por clínica em `listar_laudos`), com mapeamento de erros de domínio (recurso inexistente →
      404, referência inválida/duplicidade → 400/422) (User Stories: 1, 2, 3, 4, 5, 6, 7)

## Out of Scope

- Download de laudo pelo portal da clínica — spec futura de Portal da Clínica; esta spec só expõe
  `listar_laudos`/`ver_laudo` com escopo por clínica, sem UI/portal dedicado.
- Envio de laudo por WhatsApp — fora do MVP conforme PRD.
- Mais de um laudo para o mesmo par `(atendimento_id, exame_id)` — inclui o caso de
  `quantidade > 1` do mesmo exame no mesmo atendimento (S6/`ItemExame`): esta spec não distingue
  unidades de um exame repetido no mesmo atendimento, gera no máximo um laudo por `exame_id`.
- Persistência do PDF gerado (armazenamento de arquivo/objeto) — o PDF é gerado sob demanda a
  partir do `Laudo` a cada finalização/reenvio; sem bucket ou tabela de arquivo nesta spec.
- Edição de um laudo já finalizado — finalizado é terminal para o conteúdo nesta spec; reemissão
  (US31) é reenvio do mesmo conteúdo, não uma nova edição.
- Fila/retry automático de envio de e-mail — falha de envio fica registrada em `erro_envio` e o
  reenvio é sempre uma ação manual (`reenviar_laudo`), sem job em background nesta spec.
- Corrigir a lacuna de `authorize()` para filtro de lista (issue
  [#13](https://github.com/NicolasNagel/vertere-project/issues/13)) — esta spec reproduz o mesmo
  padrão de filtro em `listar_laudos` já usado em `listar_atendimentos` (S6), não resolve a
  lacuna.

## Further Notes

- Esta spec depende de S1 (Auth/Usuários), S3 (Veterinários, para `email` de envio), S5 (Exames &
  Precificação, para `categoria` do exame) e S6 (Atendimentos, para `atendimento_id`/`exame_id` e
  o e-mail do veterinário responsável).
- Ordem de specs sugerida a partir daqui (mesma de S6): Laudos (esta) → Fechamento Financeiro →
  Portal da Clínica → Importação de Dados Históricos.
- A spec de Fechamento Financeiro não depende de Laudos; a spec de Portal da Clínica depende desta
  (vai reaproveitar `listar_laudos`/`ver_laudo` com o escopo de clínica já implementado aqui).
- Configuração SMTP real (host/porta/credenciais de produção) é decisão de ambiente/deploy, fora
  do escopo desta spec — `Settings` só define os campos e um default de desenvolvimento local.

## Descobertas

<!-- Necessidades novas encontradas durante o desenvolvimento, fora do escopo acima. Não implementar sem decisão do PO. -->

## Verificação

Resultado do `/fechar-spec S7` (2026-09-20): ✅ APROVADA. Relatório completo em
`docs/specs/relatorios/S7-verificacao.md`. 326/326 testes passam; as 17 tasks marcadas `[x]` têm
evidência real; 7/7 user stories atendidas; sem scope creep (nenhum item de "Out of Scope"
implementado, incluindo a lacuna de `authorize()` para filtro de lista — issue #13 — deixada como
está). Uso de `fpdf2`/`smtplib` fora dos ADRs 0001/0002 está documentado na própria spec como
primeira decisão dessa natureza. Validação funcional de ponta a ponta contra Postgres de dev real
(login, fluxo completo clínica→veterinário→paciente→exame→atendimento→template→laudo, incluindo
finalizar com SMTP indisponível confirmando `erro_envio` gravado sem bloquear a finalização, e
reenviar). Observação não bloqueante: a seção "Testing Decisions" descreve o caso de escopo de
clínica divergente como retornando 403; o código retorna 404 (não revela existência do laudo a
quem não tem acesso) — comportamento mais seguro, já coberto por teste, divergência textual
pontual sem impacto no veredito. Sem pendências bloqueantes.
