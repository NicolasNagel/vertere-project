## Problem Statement

O Laboratório Vertere (Jaraguá do Sul/SC), em crescimento, controla toda a operação hoje em planilhas Excel: cadastro de clínicas parceiras, cadastro de veterinários, registro de cada atendimento (paciente, exames, valores) e apuração financeira. Isso gera risco de erro manual, dificuldade de consultar o histórico de um paciente específico, dificuldade de fechar o faturamento mensal por clínica de forma confiável, e nenhum controle de acesso — qualquer pessoa com a planilha vê tudo, inclusive dados financeiros sensíveis. Não existe hoje nenhum sistema informatizado rodando no laboratório.

## Solution

Um sistema web que digitaliza o fluxo já existente na planilha, com controle de acesso por papel de usuário: cadastro de clínicas, veterinários e pacientes; registro de atendimentos com cálculo automático de valores (incluindo regras de plantão); emissão e envio de laudos por tipo de exame; e fechamento financeiro mensal por clínica. O histórico da planilha atual (clínicas, veterinários, atendimentos de 2026) é migrado para o novo sistema. Funcionalidades de IA (assistente de dúvidas, suporte a análise, dashboard analítico) ficam fora deste PRD e serão tratadas em uma fase seguinte — este documento cobre o MVP operacional e financeiro.

## User Stories

**Autenticação e permissões**
1. Como administrador, quero criar contas de usuário com um papel definido (admin, atendente, técnico, clínica), para controlar quem acessa o quê.
2. Como administrador, quero desativar/reativar um usuário, para revogar acesso sem apagar o histórico de ações dele.
3. Como qualquer usuário, quero fazer login com e-mail/senha, para acessar apenas as áreas permitidas ao meu papel.
4. Como atendente ou técnico, não quero ter acesso a valores financeiros agregados (fechamento, faturamento por clínica), para respeitar a confidencialidade financeira do laboratório.
5. Como usuário do tipo clínica, quero acessar apenas os dados dos meus próprios atendimentos e laudos, sem ver dados de outras clínicas.

**Cadastro de clínicas**
6. Como administrador, quero cadastrar uma clínica com nome, CNPJ, endereço, telefone, e-mail e status (ativo/inativo), para manter o cadastro de parceiros atualizado.
7. Como administrador, quero editar ou inativar uma clínica, para refletir mudanças sem perder o histórico de atendimentos associados a ela.
8. Como atendente, quero buscar uma clínica pelo nome ao registrar um atendimento, para vincular o atendimento à clínica correta rapidamente.

**Cadastro de veterinários**
9. Como administrador, quero cadastrar um veterinário vinculado a uma clínica, com nome, CRMV, telefone, e-mail para laudos e status, para saber quem solicitou cada atendimento.
10. Como administrador, quero editar ou inativar um veterinário, mantendo o histórico de atendimentos vinculados a ele.
11. Como atendente, quero buscar um veterinário já cadastrado (filtrando por clínica) ao registrar um atendimento, para evitar recadastro.

**Cadastro de pacientes**
12. Como atendente, quero cadastrar um paciente (nome, espécie, raça, sexo, idade, proprietário) vinculado a uma clínica, para reutilizar esse cadastro em atendimentos futuros do mesmo animal.
13. Como atendente, quero buscar um paciente já existente (por nome + clínica + proprietário) ao registrar um novo atendimento, para não duplicar cadastros.
14. Como usuário do sistema, quero ver o histórico completo de atendimentos e laudos de um paciente específico, para acompanhar a evolução clínica dele ao longo do tempo.

**Catálogo de exames e preços**
15. Como administrador, quero cadastrar um exame com tipo/categoria, nome e preço-base, para manter a tabela de preços atualizada.
16. Como administrador, quero editar o preço de um exame, para refletir reajustes sem afetar atendimentos já registrados no passado.
17. Como administrador, quero configurar regras de adicional de plantão (dia da semana + faixa de horário + valor adicional), para que o sistema aplique automaticamente a cobrança correta.
18. Como administrador, quero editar ou desativar uma regra de plantão a qualquer momento, para ajustar preços e horários de atendimento plantonista conforme a operação do laboratório mudar.
19. Como atendente, quero que o adicional de plantão seja sugerido automaticamente com base na data/hora do atendimento, mas possa ser ajustado manualmente se necessário.

**Registro de atendimentos**
20. Como atendente, quero registrar um novo atendimento escolhendo clínica, veterinário, paciente, um ou mais exames, método de coleta e horário, para documentar a operação do dia a dia.
21. Como atendente, quero que o sistema calcule automaticamente o valor total do atendimento (soma dos exames + adicional de plantão − desconto), para evitar erro de cálculo manual.
22. Como atendente, quero aplicar um desconto manual a um atendimento, para casos negociados individualmente.
23. Como administrador, quero listar e filtrar atendimentos por período, clínica, veterinário ou status, para acompanhar a operação.
24. Como atendente, quero editar um atendimento registrado incorretamente (antes do fechamento do período), para corrigir erros de digitação.

**Laudos**
25. Como técnico, quero criar um laudo vinculado a um atendimento, usando o template correspondente ao tipo de exame (ex: hemograma, bioquímico, urinálise, perfil iônico), para preencher apenas os campos relevantes daquele exame.
26. Como administrador, quero cadastrar/editar os templates de laudo por tipo de exame (quais campos e faixas de referência aparecem), para manter os laudos atualizados sem depender de alteração de código.
27. Como técnico, quero salvar um laudo como rascunho antes de finalizar, para revisar antes do envio.
28. Como técnico, quero finalizar um laudo e disparar o envio, para que o veterinário/clínica responsável receba o resultado.
29. Como sistema, quero enviar o laudo finalizado por e-mail automaticamente para o e-mail de laudos cadastrado do veterinário, para agilizar a entrega.
30. Como usuário do tipo clínica, quero acessar e baixar os laudos dos meus próprios atendimentos pelo portal, para ter uma segunda via sempre disponível.
31. Como técnico ou administrador, quero reemitir/reenviar um laudo já finalizado, para casos de e-mail não recebido ou solicitação de segunda via.

**Financeiro e fechamento**
32. Como administrador, quero visualizar o faturamento acumulado por clínica em um período, para acompanhar a receita do laboratório.
33. Como administrador, quero gerar o fechamento mensal de uma clínica, que soma todos os atendimentos do período (com descontos e adicionais aplicados), para saber o valor total a cobrar dela.
34. Como administrador, quero que, uma vez fechado um período para uma clínica, os atendimentos daquele período fiquem bloqueados para edição, para preservar a integridade do valor fechado.
35. Como administrador, quero exportar o fechamento de uma clínica (relatório/CSV), para usar na cobrança feita fora do sistema (boleto, transferência, etc.).
36. Como administrador, quero ver um resumo financeiro geral (todas as clínicas, período selecionável), para ter visão consolidada do negócio.

**Migração de dados históricos**
37. Como administrador, quero que os dados já existentes na planilha (clínicas, veterinários e atendimentos de 2026) sejam importados para o novo sistema antes do lançamento, para não perder o histórico já registrado.
38. Como administrador, quero um relatório de validação pós-importação (quantos registros migrados, quantos com erro/inconsistência), para confirmar que a migração foi bem-sucedida antes de descontinuar a planilha.

## Implementation Decisions

- **Módulos do MVP**: Auth/Usuários (papéis: admin, atendente, técnico, clínica), Clínicas, Veterinários, Pacientes (novo cadastro formal — não existe hoje na planilha), Exames & Precificação (catálogo + regras de plantão), Atendimentos, Laudos (templates por tipo de exame + envio), Fechamento Financeiro, Portal da Clínica (visão restrita para usuários tipo clínica), Importação de Dados Históricos (script único de migração da planilha).
- **Paciente como entidade própria**: diferente da planilha atual (que só tem nome/espécie/raça por linha de atendimento), o sistema introduz um cadastro formal de paciente vinculado a clínica + proprietário, para permitir histórico confiável. Atendentes buscam ou criam o paciente ao registrar um atendimento.
- **Regras de plantão**: tabela configurável de dia da semana + faixa de horário → valor adicional, mantida pelo administrador. O valor é sugerido automaticamente ao registrar um atendimento fora do horário normal, mas pode ser ajustado manualmente pelo atendente.
- **Permissões por papel**: atendente e técnico não têm acesso a telas financeiras agregadas (fechamento, faturamento consolidado). Usuários do tipo clínica só enxergam dados (atendimentos, laudos, pacientes) da própria clínica.
- **Templates de laudo**: cada categoria de exame (ex: hematológicos, bioquímicos, urinários) tem um template próprio com campos e faixas de referência específicos, configurável pelo administrador — não fixo em código.
- **Fechamento financeiro**: operação explícita (não automática) por clínica e período; ao fechar, os atendimentos daquele período/clínica ficam bloqueados para edição. Gera relatório exportável (ex: CSV) com o valor total a cobrar. Não inclui despesas/custos do laboratório — apenas receita de atendimentos. Não inclui emissão de nota fiscal.
- **Envio de laudos**: e-mail automático (usando o e-mail de laudos já cadastrado do veterinário) + disponibilização no portal da clínica. Envio via WhatsApp fica fora do MVP (fase seguinte).
- **Migração de dados**: script de importação único, executado antes do lançamento, cobrindo as abas "Cadastro Clínicas", "Cadastro Veterinários" e "Dados" (atendimentos) da planilha atual. Requer normalização de nomes de pacientes/proprietários para popular o novo cadastro de pacientes.
- **Stack técnica**: a ser decidida em uma fase técnica separada, avaliando opções priorizando baixo custo operacional e capacidade de crescer com o laboratório — não é escopo deste PRD.

## Testing Decisions

- Um bom teste cobre comportamento observável (input → output esperado), não detalhes internos de implementação — por exemplo, testar que registrar um atendimento com exames X e Y e um desconto Z resulta no valor total correto, sem testar como o cálculo foi implementado internamente.
- Módulos priorizados para testes automatizados no MVP: **Atendimentos** (registro, cálculo automático de valor incluindo plantão e desconto, edição antes do fechamento) e **Laudos** (criação a partir do template correto por tipo de exame, transição rascunho → finalizado, disparo de envio).
- Não há testes automatizados anteriores no repositório para servir de referência (código-base anterior foi removido); os testes deste MVP estabelecem o padrão inicial do projeto.

## Out of Scope

- Uso de IA dentro da aplicação e para atendimento a clientes (assistente de dúvidas).
- Uso de IA para suporte a análise/diagnóstico (reforçando: IA nunca poderá diagnosticar o paciente, apenas esclarecer dúvidas, e nunca agir sem validação humana).
- Dashboard e painel analítico com IA para suporte à decisão do negócio.
- Envio de laudos via WhatsApp.
- Emissão de nota fiscal / integração fiscal-contábil.
- Controle de despesas/custos do laboratório (o financeiro do MVP cobre apenas receita).
- Cobrança/pagamento processado dentro do sistema (o fechamento gera apenas o valor a cobrar; a cobrança em si — boleto, transferência — continua fora do sistema).

## Further Notes

- Guardrails não-negociáveis para quando as features de IA forem endereçadas em fase futura: (1) a IA nunca pode diagnosticar o paciente, apenas tirar dúvidas; (2) a IA nunca pode tomar ação na aplicação sem validação humana explícita; (3) a IA nunca pode expor informação financeira, de pacientes ou do laboratório a clientes/usuários sem a permissão adequada. Essas restrições devem orientar o design de permissões desde o MVP (ex: separação clara entre dados visíveis a "clínica" vs. "admin"), para que a fase de IA já herde essa base de controle de acesso.
- Todo o código-fonte de uma versão anterior deste projeto (módulos de auth, atendimentos, exames, clínicas, laudos, usuários, veterinários em Fastify/React, conforme histórico do git) foi removido do disco antes do início deste discovery. Este PRD assume um rebuild a partir do zero, reaproveitando apenas o conhecimento de domínio (estrutura da planilha, regras de negócio), não o código anterior.
