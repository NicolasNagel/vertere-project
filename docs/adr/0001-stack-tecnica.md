# ADR-0001: Stack técnica

## Status

Aceito

## Contexto

O PRD (`issues/prd.md`) deixou a escolha de stack deliberadamente fora do escopo, para não travar o discovery funcional. Todo o código-fonte de uma versão anterior do projeto (Fastify + React) foi removido do disco antes deste discovery, então esta é uma decisão de rebuild do zero. O sistema precisa: (1) atender aos módulos do MVP definidos no PRD (auth, clínicas, veterinários, pacientes, exames, atendimentos, laudos, fechamento), e (2) suportar, em fase futura, as features de IA do briefing original (assistente de dúvidas, suporte a análise, dashboard analítico com IA), respeitando os guardrails de IA já definidos (nunca diagnosticar, nunca agir sem validação humana, nunca vazar dado sensível sem permissão).

## Decisão

- **Backend**: Python.
- **Frontend**: Node.js/TypeScript.
- **Camada de IA**: LangChain (orquestração de agentes/chains) + Langfuse (observabilidade/tracing de LLM).

Framework web específico do backend Python, ORM, ferramenta de gerenciamento de dependências, e framework de frontend (dentro do ecossistema Node/TS) ainda não foram decididos — ficam para um ADR complementar quando a implementação do primeiro módulo (Auth/Usuários) começar.

## Consequências

- O time de IA (LangChain/Langfuse) é Python-nativo, o que reforça a escolha de Python no backend: os módulos de IA da fase 2 rodam no mesmo runtime dos módulos de negócio, sem precisar de um serviço separado só para IA.
- O frontend em TypeScript permanece desacoplado do backend via API HTTP — contrato de API precisa ser definido explicitamente (OpenAPI ou equivalente) já que não há compartilhamento de tipos entre as duas linguagens.
- Testes do backend (incluindo a seam `authenticate`/`authorize` da spec de Auth) serão escritos em Python, usando o framework de testes que for definido junto com o framework web.
- Langfuse implica um serviço externo (ou self-hosted) de observabilidade de LLM — decisão de hospedagem (cloud gerenciado vs. self-host, dado o requisito de baixo custo do PRD) fica para quando a fase de IA for endereçada.
