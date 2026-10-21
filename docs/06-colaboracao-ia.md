# Modelo de colaboração: responsável + ChatGPT + Claude

## Papéis reais
- **Responsável humano:** decide prioridades, aprova escopo, executa e revisa entregas, publica o repositório.
- **ChatGPT:** ajuda a especificar requisitos, elaborar casos de teste, revisar mudanças e documentar resultados.
- **Claude:** apoia implementação e criação de testes com base em especificações aprovadas.

Atribuições acima são divisão de trabalho operacional, **não** equivalem a papéis formais de um Scrum Team composto por pessoas. Não atribuir retrospectivas, decisões ou testes às IAs como se fossem ações humanas verificadas.

## Fluxo de colaboração
1. Aprovar Issue e critérios de aceitação.
2. Preparar briefing com escopo, arquivos permitidos e testes esperados.
3. Claude implementa em branch de trabalho, apresentando mudanças e instruções de execução.
4. Responsável executa testes; ChatGPT revisa requisitos, riscos e evidências.
5. Corrigir defeitos e registrar decisões.
6. Aprovar PR, integrar e atualizar documentação.

## Regras
- Não inventar testes, screenshots, métricas, reviews ou aprovações.
- Não enviar senhas, tokens ou dados pessoais às IAs.
- Não copiar código sem leitura e execução pelo responsável.
- Toda alteração relevante deve ser vinculada a Issue e commit.
- Revisões e retrospectivas registram acontecimentos reais, inclusive falhas.

## Modelo de solicitação ao Claude (sem autorizar código ainda)
**Contexto:** ScrumFlow, React/TypeScript, FastAPI, PostgreSQL.
**Objetivo:** implementar apenas a Issue aprovada.
**Entrada:** história, critérios, arquitetura, DoD.
**Saída esperada:** resumo das mudanças, arquivos alterados, testes adicionados, comandos de execução, limitações e riscos.
**Restrição:** não ampliar escopo sem aprovação.
