# Research: Telas de Clínicas e Veterinários (Web)

Nenhum item do Technical Context ficou marcado como `NEEDS CLARIFICATION` — o Technical Context foi
resolvido diretamente a partir do código já existente em `apps/web` (S11) e dos módulos de backend
já entregues (S2/S3). As decisões abaixo documentam por que os padrões existentes foram reaproveitados
em vez de introduzir alternativas.

## Cliente HTTP e tipos

**Decision**: reaproveitar `requisitar<T>` (`apps/web/src/api/clienteHttp.ts`) e os tipos gerados em
`apps/web/src/api/tipos.gerados.ts` (`ClinicaResponse`, `VeterinarioResponse`,
`CriarClinicaRequest`, `EditarClinicaRequest`, `CriarVeterinarioRequest`, `EditarVeterinarioRequest`,
já presentes no OpenAPI atual).

**Rationale**: é o único cliente HTTP do projeto, já injeta `Authorization` e já dispara o handler
de sessão expirada em `401` (US3 da S11) — reimplementar isso por módulo duplicaria uma seam que já
existe e é testada.

**Alternatives considered**: biblioteca de data-fetching (React Query/SWR) — rejeitada por
introduzir dependência nova para um volume de dados pequeno (dezenas de registros, sem cache
complexo ou revalidação em background justificável nesta fase do produto).

## Gerenciamento de estado do formulário/lista

**Decision**: hooks nativos do React (`useState`/`useEffect`) encapsulados num hook por domínio
(`useClinicas`, `useVeterinarios`), seguindo o padrão de `SessaoContext.tsx`.

**Rationale**: consistente com o resto do frontend (nenhuma lib de state management ou formulário
foi adotada até aqui — ver `package.json`); a lógica de CRUD aqui é simples o suficiente (uma lista,
um formulário, sem validação cruzada complexa) para não justificar Formik/React Hook Form.

**Alternatives considered**: React Hook Form (validação de formulário) — rejeitada por ora; a
validação de negócio real (CNPJ, CRMV, duplicidade) já vive no backend e a tela só precisa repassar
o erro retornado, sem lógica de validação client-side sofisticada.

## Seam de teste no frontend

**Decision**: seam principal é o hook de dados (`useClinicas`/`useVeterinarios`), testado com
`fetch` mockado — não o componente de tela inteiro.

**Rationale**: espelha o Princípio IV da constituição ("seam de teste na camada mais alta possível")
aplicado ao frontend: o hook isola a lógica de carregamento/erro/estado sem precisar montar DOM,
enquanto o componente de tela é testado por cima só para os comportamentos de interação (clicar,
preencher formulário) que dependem de DOM real via Testing Library.

**Alternatives considered**: testar tudo via Testing Library com fetch mockado no nível do
componente — rejeitado como único nível de teste porque mistura lógica de estado com renderização,
tornando o teste mais lento e frágil a mudanças de markup.

## Estrutura de pastas

**Decision**: uma pasta por domínio (`apps/web/src/clinicas/`, `apps/web/src/veterinarios/`),
mesmo padrão de `apps/web/src/autenticacao/`.

**Rationale**: mantém o frontend organizado por domínio de negócio, como o backend já faz em
`apps/api/src/vertere_api/`; evita uma pasta `pages/`/`components/` genérica que cresceria sem
fronteira clara conforme mais seções (S13+: Pacientes, Exames, ...) forem implementadas.

**Alternatives considered**: pastas técnicas (`pages/`, `hooks/`, `services/`) — rejeitada por
divergir do padrão já estabelecido no repo (backend e S11 já organizam por domínio, não por tipo
técnico de arquivo).
