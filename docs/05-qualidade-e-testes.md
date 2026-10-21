# Qualidade, critérios de pronto e testes

## Definition of Ready (acordo de trabalho, não artefato obrigatório do Scrum)
Uma história pode ser selecionada quando tem objetivo claro, critérios verificáveis, dependências conhecidas, estimativa discutida e tamanho compatível com a sprint.

## Definition of Done
Uma história é considerada concluída apenas quando:
1. Critérios de aceitação implementados e demonstrados.
2. Testes automatizados pertinentes passam, incluindo casos inválidos e persistência.
3. Código revisado por responsável humano com apoio de IA.
4. Sem erros bloqueantes conhecidos no fluxo alterado.
5. Documentação, API e migrações atualizadas quando aplicável.
6. Alterações integradas ao ramo principal e evidência de execução registrada.

## Estratégia de testes planejada
- Backend: pytest para validações, serviços e integração com banco PostgreSQL de teste.
- Frontend: React Testing Library para formulários, mensagens e listagens.
- E2E: Playwright para criar projeto e cadastrar história, após integração completa.
- Segurança básica: entradas inválidas, vazamento de erros internos, CORS e ausência de segredos no repositório.
- Qualidade estática: lint, formatação e verificação de tipos.

## Matriz de rastreabilidade
| História | Evidências mínimas esperadas |
|---|---|
| US-01 | AC01–AC07, testes backend/frontend, fluxo E2E e screenshot |
| US-02 | AC01–AC09, testes backend/frontend, fluxo E2E e screenshot |

## Registro de evidência (modelo)
- História / critério:
- Data e commit:
- Ambiente e versão:
- Comando ou procedimento executado:
- Resultado observado (passou/falhou):
- Screenshot, log ou link de CI:
- Defeitos conhecidos:

**Importante:** não marcar testes como executados nem publicar números de cobertura sem evidência real.
