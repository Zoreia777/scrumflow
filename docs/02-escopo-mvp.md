# Escopo e fronteiras do MVP

**Estado:** proposta

## Incluído no MVP
1. Projetos: criar, listar, visualizar e editar nome e descrição.
2. Backlog: criar, listar e editar histórias com título, descrição, prioridade e critérios de aceitação.
3. Priorização: definir ordem explícita dos itens no projeto.
4. Sprints: criar com nome, objetivo, datas e estado; iniciar apenas uma sprint ativa por projeto.
5. Planejamento: associar e retirar histórias de uma sprint antes de seu encerramento, com regras claras.
6. Fluxo: mover histórias entre `A fazer`, `Em andamento`, `Concluído`.
7. Métricas: total de itens, concluídos e percentual concluído por sprint, com fórmula documentada.

## Fora do MVP
Login, permissões, notificações, integrações externas, IA, colaboração simultânea, relatórios avançados, Power BI, aplicativos móveis nativos e dados de clientes reais.

## Regras de produto
- Uma história pertence a um projeto; opcionalmente pertence a uma sprint do mesmo projeto.
- Uma história não pode pertencer a duas sprints ao mesmo tempo.
- Apenas uma sprint ativa por projeto.
- A conclusão de uma história exige status `Concluído`; não se confunde com aprovação formal.
- Percentual da sprint = histórias concluídas / histórias atribuídas × 100; quando não há histórias, exibir `0%` e `0/0`.
- Exclusão física não faz parte do MVP; preferir arquivamento em evolução futura.

## Condições de aceite do MVP
Um avaliador consegue demonstrar o fluxo completo com banco persistente e confirmar que regras e mensagens de erro são coerentes. Evidências devem incluir capturas de tela, resultados de testes e identificação de versão/commit.
