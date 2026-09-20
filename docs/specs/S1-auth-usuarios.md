---
codigo: S1
modulo: Auth/Usuários
issue: https://github.com/NicolasNagel/vertere-project/issues/2
status: em-desenvolvimento
---

## Problem Statement

O Laboratório Vertere não tem hoje nenhum controle de acesso: a planilha de controle é vista e editada por qualquer pessoa que tenha acesso ao arquivo, incluindo dados financeiros e de pacientes. Diferentes pessoas na operação (administração, atendimento, técnicos de laudo, clínicas parceiras) precisam de níveis de acesso diferentes ao sistema que vai substituir a planilha.

## Solution

Um módulo de autenticação e autorização que identifica cada usuário do sistema, associa um papel (admin, atendente, técnico, clínica) a ele, e restringe o que cada papel pode ver/fazer. Este módulo é a base sobre a qual todos os outros módulos do MVP (Clínicas, Veterinários, Pacientes, Exames, Atendimentos, Laudos, Fechamento) aplicam suas regras de permissão.

## User Stories

1. Como administrador, quero criar contas de usuário com um papel definido (admin, atendente, técnico, clínica), para controlar quem acessa o quê.
2. Como administrador, quero editar o papel de um usuário existente, para refletir mudança de função sem recriar a conta.
3. Como administrador, quero desativar um usuário, para revogar acesso imediatamente sem apagar o histórico de ações associado a ele.
4. Como administrador, quero reativar um usuário previamente desativado, para casos de retorno (ex: licença).
5. Como qualquer usuário, quero fazer login com e-mail e senha, para acessar o sistema.
6. Como qualquer usuário, quero que uma tentativa de login com credenciais inválidas seja rejeitada com uma mensagem genérica (sem indicar se o e-mail existe), para não vazar informação sobre contas cadastradas.
7. Como qualquer usuário, quero que uma tentativa de login em uma conta desativada seja rejeitada, para que a desativação tenha efeito imediato.
8. Como qualquer usuário autenticado, quero que minha sessão expire após um período de inatividade, para reduzir o risco de acesso indevido em uma máquina compartilhada.
9. Como administrador, quero resetar a senha de um usuário, para casos de esquecimento sem depender de e-mail transacional no MVP.
10. Como sistema, quero verificar o papel do usuário autenticado antes de autorizar qualquer ação sensível (ex: acessar tela de fechamento financeiro), para impedir acesso indevido mesmo que a interface tente esconder a opção.
11. Como atendente ou técnico, não quero conseguir acessar telas ou dados financeiros agregados (fechamento, faturamento consolidado por clínica), mesmo tentando acessar a URL/endpoint diretamente.
12. Como usuário do tipo clínica, quero que minhas permissões me restrinjam a ver apenas dados (pacientes, atendimentos, laudos) da minha própria clínica, mesmo tentando acessar diretamente um registro de outra clínica.
13. Como desenvolvedor de outro módulo, quero uma função central de autorização que qualquer módulo possa chamar antes de executar uma ação, para não duplicar lógica de permissão espalhada pelo código.

## Implementation Decisions

- **Módulos afetados**: novo módulo `auth` (usuários, papéis, autenticação, autorização). Todos os outros módulos do MVP (Clínicas, Veterinários, Pacientes, Exames, Atendimentos, Laudos, Fechamento) consultam este módulo antes de expor dados ou aceitar uma ação, mas não fazem parte desta spec.
- **Papéis (roles) do MVP**: `admin`, `atendente`, `tecnico`, `clinica`. Cada usuário tem exatamente um papel. Um usuário do papel `clinica` está vinculado a uma clínica específica (a entidade Clínica é definida em uma spec separada; aqui basta um identificador de vínculo).
- **Interface de autenticação**: `authenticate(email, senha) -> { usuario, papel } | falha`. Falha não distingue "e-mail não existe" de "senha errada" — mensagem genérica em ambos os casos.
- **Interface de autorização**: `authorize(papel, acao, contexto?) -> boolean`. `contexto` carrega dados como "clínica dona do registro" para permitir a regra de escopo do papel `clinica` (só acessa registros da própria clínica). Esta função é o ponto único que os demais módulos devem chamar; nenhum módulo deve reimplementar checagem de papel por conta própria.
- **Estado do usuário**: ativo/inativo. Usuário inativo falha em `authenticate` mesmo com credenciais corretas.
- **Sessão**: expira por inatividade (tempo exato de expiração é decisão de configuração, não bloqueia esta spec).
- **Reset de senha no MVP**: operação administrativa (admin define uma nova senha temporária para o usuário), sem depender de fluxo de e-mail transacional. Fluxo de "esqueci minha senha" self-service fica fora do MVP.
- **Armazenamento de senha**: hash com `bcrypt` diretamente — não `passlib` (incompatível com bcrypt 5.x, ver ADR-0002).

## Testing Decisions

- Bom teste aqui cobre comportamento observável do módulo: dado um conjunto de usuários (via um repositório fake em memória), `authenticate` e `authorize` devem retornar o resultado esperado — sem depender de banco de dados real ou de um servidor HTTP rodando.
- Módulo testado: `auth` (funções `authenticate` e `authorize`), incluindo casos de: login válido, login com senha errada, login em conta inativa, autorização de admin em ação financeira, negação de atendente/técnico em ação financeira, negação de clínica tentando acessar registro de outra clínica.
- Seam única (`authenticate`/`authorize`), sem mocks de HTTP/DB — padrão de teste inicial do projeto (não há prior art anterior no repositório).

## Tasks

<!-- Backfill retroativo: esta seção não existia quando T1/T2 foram implementadas (convenção
adotada depois). Marcadas [x] com base no código e nos testes já existentes no repo, auditados
pela verificação de /fechar-spec S1 (ver seção Verificação). -->

- [x] T1 — Domínio (`Papel`, `Usuario`) e scaffold do projeto `apps/api` com `uv` (User Stories: base para todas) — commit `feat(s1): implementa authenticate/authorize com testes` (13d4f4f)
- [x] T2 — `authenticate()`/`authorize()` com testes na seam (repositório fake em memória) e hash de senha com `bcrypt` (User Stories: 6, 7, 10, 13; parcial: 11, 12 — lógica correta e testada, falta enforcement em endpoint real) — mesmo commit de T1
- [x] T3 — Persistência real de usuário: modelo SQLAlchemy + migração Alembic implementando `UsuarioRepository` contra PostgreSQL (pré-requisito de T4; User Stories: 1, 2, 3, 4, 9) — commit `feat(s1): persistência real de usuário via SQLAlchemy/PostgreSQL`
- [x] T4 — CRUD de usuário: criar, editar papel, desativar, reativar (User Stories: 1, 2, 3, 4) — commit `feat(s1): CRUD de usuário (criar/editar papel/desativar/reativar)`
- [x] T5 — Reset de senha administrativo (User Stories: 9) — commit `feat(s1): reset de senha administrativo`
- [x] T6 — Sessão com expiração por inatividade (User Stories: 8) — commit `feat(s1): lógica de expiração de sessão por inatividade`
- [ ] T7 — Endpoint HTTP de login (FastAPI) + dependency/middleware aplicando `authorize()` nas rotas, fechando de ponta a ponta as stories que hoje só têm lógica testada isoladamente (User Stories: 5, 11, 12)

## Out of Scope

- Cadastro/edição de Clínicas, Veterinários, Pacientes, Exames — specs separadas que dependem desta.
- Fluxo self-service de "esqueci minha senha" (reset é administrativo no MVP).
- Autenticação social/SSO, 2FA.
- Auditoria detalhada de ações por usuário (log de quem fez o quê) — pode ser considerado em spec futura se necessário.

## Further Notes

- **Banco de dev/testes local**: `docker run -d --name vertere_postgres_dev -e POSTGRES_USER=vertere -e POSTGRES_PASSWORD=vertere -e POSTGRES_DB=vertere -p 5434:5432 postgres:16-alpine`. Porta 5434 (não 5433/5432) porque a máquina de desenvolvimento já tinha um PostgreSQL nativo do Windows ocupando 5433 — verifique portas livres antes de assumir uma. `apps/api/.env.example` documenta a `DATABASE_URL` esperada. Os testes em `test_usuario_repository.py` rodam contra esse Postgres real (sem mocks de DB), criando/limpando a tabela a cada teste.

- Esta spec depende do PRD em `issues/prd.md` (módulo "Auth/Usuários"). Os guardrails de IA do PRD (nunca expor dado financeiro/de paciente sem permissão) dependem diretamente da correção deste módulo — qualquer feature de IA futura deve reutilizar `authorize()`, não reimplementar checagem de acesso.
- Ordem de specs sugerida a partir daqui: Clínicas → Veterinários → Pacientes → Exames & Precificação → Atendimentos → Laudos → Fechamento Financeiro → Portal da Clínica → Importação de Dados Históricos.

## Descobertas

<!-- Anotar aqui qualquer necessidade nova descoberta durante a implementação que esteja fora do escopo acima. Não implementar — parar e decidir com o PO. -->

## Verificação

Resultado do último `/fechar-spec S1`: ❌ BLOQUEADA (ver `docs/specs/relatorios/S1-verificacao.md` quando existir). Pendências: CRUD de usuário (stories 1-4), reset de senha (story 9), sessão com expiração (story 8), persistência real, e endpoint HTTP expondo login/authorize (stories 5, 11, 12) — ver histórico da sessão para o relatório detalhado até este arquivo ser criado.
