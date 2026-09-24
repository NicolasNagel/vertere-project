# Quickstart — S11: Autenticação e Shell Autenticado do Frontend

Guia de validação manual de ponta a ponta. Não substitui a suíte automatizada (Vitest) — é o roteiro
que `/fechar-spec` (ou qualquer pessoa) usa para confirmar que a feature funciona de verdade, não só
que os testes passam.

## Pré-requisitos

- Backend rodando localmente (`apps/api`): `uv run uvicorn vertere_api.main:app --reload`, com
  Postgres de dev configurado e ao menos um usuário de cada papel existente (`admin`, `atendente`,
  `tecnico`, `clinica`) — usar os mesmos fixtures/seed já usados pelos testes de router do backend
  (`apps/api/tests/test_auth_router.py` mostra como criar cada um via `UsuarioModel`).
- Frontend instalado: `cd apps/web && pnpm install`.
- Variável de ambiente do frontend apontando para a URL do backend local (definida na T de setup do
  projeto em `tasks.md`, ex: `VITE_API_URL=http://localhost:8000`).

## Rodar localmente

```powershell
cd apps/web
pnpm dev
```

Abre em `http://localhost:5173` (padrão do Vite) ou a porta que o terminal indicar.

## Cenários de validação (mapeiam 1:1 para as Acceptance Scenarios do spec.md)

1. **Login válido (US1, cenário 1)**: acessar a raiz sem sessão ativa → deve cair na tela de login.
   Logar com um usuário `admin` válido → deve redirecionar para o shell em até poucos segundos
   (SC-001).
2. **Login inválido (US1, cenário 2)**: tentar logar com senha errada → deve mostrar "E-mail ou
   senha inválidos" e permanecer na tela de login.
3. **Usuário inativo (US1, cenário 3)**: logar com um usuário `ativo=False` e senha correta → mesma
   mensagem genérica do cenário 2, sem indicar que a diferença é "conta desativada".
4. **Menu por papel (US2, cenários 1–3)**: repetir o login com um usuário de cada papel
   (`admin`, `atendente`, `tecnico`, `clinica`) e comparar o menu renderizado contra
   `auth/service.py::_PERMISSOES` para aquele papel (SC-002) — nenhum item a mais, nenhum a menos.
5. **Logout (US2, cenário 4)**: clicar em "Sair" → deve voltar à tela de login e limpar a sessão
   (confirmar que um refresh depois do logout não reabre o shell sozinho).
6. **Acesso direto por URL bloqueado (Edge Case, SC-003)**: logado como `atendente`, digitar
   diretamente a URL de uma seção só de admin (ex: Financeiro/Usuários) → deve bloquear, não
   renderizar a tela.
7. **Sessão expirada (US3, SC-004)**: com o shell aberto, invalidar a sessão do lado do backend
   (ex: `sessoes_store.limpar_sessoes()` num shell Python, ou esperar o expirar natural) e disparar
   qualquer chamada à API (ex: navegar entre seções) → deve redirecionar ao login com a mensagem de
   sessão expirada, sem tela em branco.
8. **Refresh preserva sessão (Edge Case)**: logado, apertar F5 → deve continuar no shell, sem pedir
   login de novo.
9. **Placeholder de seção não implementada (FR-008)**: clicar em uma seção do menu que ainda não tem
   tela real (ex: Clínicas, antes da spec própria dela existir) → deve mostrar "em construção", não
   um erro ou tela em branco.

## Critério de aceite deste quickstart

Todos os 9 cenários acima passam manualmente contra o backend real (não mockado) antes de
`/fechar-spec` declarar a spec funcional de ponta a ponta — mesma exigência que o projeto já aplica
às specs de backend (ver `verificador-de-spec.md`, passo "Funcional de ponta a ponta").
