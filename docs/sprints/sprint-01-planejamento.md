# Sprint 01 — Planejamento proposto

**Status:** não iniciada. **Duração candidata:** 7 dias corridos após confirmação de início. **Capacidade:** ainda não medida.

## Sprint Goal
Entregar o primeiro fluxo funcional do ScrumFlow: criar e editar projetos e cadastrar histórias no backlog com persistência em PostgreSQL.

## Escopo candidato
- US-01 (3 pontos): projetos.
- US-02 (5 pontos): cadastro de histórias.
- Total indicativo: 8 pontos. Confirmar viabilidade com disponibilidade real antes de assumir compromisso.

## Plano de execução sugerido (sequência, não datas fixas)
1. Preparar ambiente e estrutura frontend/backend/banco.
2. Implementar modelo, migração e API de projetos; testar.
3. Implementar interface de projetos; testar.
4. Implementar modelo, API e interface de cadastro de histórias; testar.
5. Executar fluxos integrados e corrigir defeitos.
6. Revisar DoD, registrar evidências, demonstrar incremento e refletir sobre melhorias.

## Dependências
PostgreSQL funcional, variáveis de ambiente, migrações, API acessível pelo frontend e ambiente de testes.

## Plano de validação
- US-01: AC01–AC07.
- US-02: AC01–AC09.
- Fluxo E2E: criar projeto → abrir projeto → cadastrar história → atualizar página → confirmar persistência e isolamento por projeto.
- Confirmar mensagens de erro e ausência de registros inválidos.

## Critério de revisão
Demonstrar o incremento executando o fluxo real. Se algo não atender ao DoD, registrar como não concluído, sem mascarar resultados.

## Modelo de Sprint Review (preencher depois)
- Data:
- Histórias demonstradas:
- Critérios aceitos / pendentes:
- Feedback recebido:
- Evidências e links:
- Mudanças sugeridas para o backlog:

## Modelo de retrospectiva individual (preencher depois)
- O que funcionou:
- O que dificultou:
- O que aprendemos:
- Uma melhoria concreta para a próxima sprint:
- Responsável e prazo:

## Registro diário opcional
Data | objetivo do dia | realizado | impedimentos | próximo passo. Não alegar Daily Scrum formal de equipe.
