# Sprint 01 — Retrospectiva

**Como ler este documento.** As observações abaixo são do **executor técnico (Claude)** e se apoiam em fatos registrados nas evidências das Fases 0 a 4. Elas **não** representam opiniões, decisões ou avaliações do responsável do projeto (João Vitor Pereira) nem da revisão do ChatGPT. A seção 6 foi deixada em branco para o responsável completar. Nenhuma métrica de produtividade (velocidade, horas, pontos) é apresentada, porque nenhuma foi medida.

## 1. Acertos (fatos observados)

| Observação | Base |
|---|---|
| Fases entregues uma a uma, cada uma com registro de evidências, o que permitiu revisão externa entre elas. | `sprint-01-fase-{0..4}-evidencias.md` |
| O registro separa "observado" de "não executado" em cada fase. | seções "Não executado / limitações" de cada registro |
| Testes tentam provar a ausência de falso sucesso (AC06 da US-01, AC09 da US-02) no backend, na interface e no navegador. | Fases 1–4 |
| Sanidade por mutação: defeitos injetados de propósito foram detectados (backend 5; frontend 5 na Fase 2 e 12 na Fase 4). Um deles (envio duplicado) só foi detectado depois de um teste adicional. | Fases 1, 2 e 4 |
| O E2E contra API e banco reais encontrou um defeito que os testes unitários não viam (mensagem de sucesso estourando a largura com título longo). | Fase 4 |
| Regras de negócio concentradas no backend e repetidas no cliente apenas para resposta imediata; o servidor continua sendo a autoridade (422 aparece no campo certo). | ADR-002, seções 7 e 11 |
| Os 165 testes sem banco rodaram também no Windows do responsável, validando o caminho de teste que dispensa Docker. | confirmação do responsável |
| Sem dependências novas de UI; `npm audit` sem vulnerabilidades conhecidas na consolidação. | Fase 2; consolidação |

## 2. Dificuldades (fatos observados)

| Dificuldade | Efeito |
|---|---|
| Docker indisponível no ambiente do executor e sem permissão para instalar Node ou Docker na máquina do responsável. | `docker compose up` e `postgres:16-alpine` nunca foram exercitados; o frontend nunca rodou no Windows. |
| Download do Chromium pelo Playwright bloqueado (HTTP 403) na Fase 0. | E2E só passou a rodar na Fase 2, com um Chromium já instalado no ambiente (`E2E_CHROMIUM_PATH`). |
| Incompatibilidades de versão e avisos de depreciação na fundação (TypeScript 7, jsdom 30, httpx, `prepend_sys_path` do Alembic). | Versões fixadas e ajustes registrados no ADR-002, seção 9. |
| Regra `react-hooks` do ESLint 10 desaconselha `setState` síncrono dentro de efeito. | Estruturação dos hooks (`useRequest`, `useFlash`) pensada em torno disso. |
| O ambiente do executor perde contexto entre sessões longas (houve compactação). | A Definition of Done oficial (`docs/05-qualidade-e-testes.md`, citada na Fase 0) não estava disponível para a consolidação; ver checklist. |
| Os E2E deixam registros "E2E ..." no banco de desenvolvimento. | Exige banco descartável; o banco de desenvolvimento do executor foi esvaziado antes do ZIP da Fase 4 (o ZIP não contém dados de banco). |
| Um comando de encerramento de processo atingiu o próprio shell (exit 144). | Passou-se a usar scripts e arquivos de PID. |

## 3. Falhas encontradas e corrigidas durante a Sprint

- Fase 0: 6 erros de tipo (`mypy`), 2 de ordenação de imports (`ruff`), formatação de CSS (`prettier`).
- Fase 1: teste de introspecção de rotas incompatível com a versão do FastAPI, substituído por teste baseado no OpenAPI.
- Fase 4: estouro de largura do alerta de sucesso; erro de campo que persistia após a correção; guarda de envio duplicado sem teste.

## 4. O que poderia melhorar (propostas do executor, sujeitas à decisão do responsável)

Nenhuma destas foi implementada ou decidida.

1. Rodar a suíte completa no ambiente oficial (Docker + `postgres:16-alpine`) assim que houver máquina que o permita.
2. Definir se há pipeline de integração contínua e quais verificações ele deve executar; hoje não há.
3. Fazer auditoria de acessibilidade com leitor de tela e ferramenta automática.
4. Testar em outros navegadores (Firefox, Safari) e em dispositivo móvel real.
5. Medir cobertura de código e decidir se há meta.
6. Fazer o E2E limpar os registros que cria, ou usar um banco próprio para os testes de navegador.
7. Armazenar a DoD oficial dentro do repositório, para que revisões futuras não dependam de documento externo.
8. Decidir as questões de produto que as Issues deixaram em aberto (ordenação, edição e exclusão de histórias, paginação).

## 5. Aprendizados (fatos que mudaram a forma de trabalhar)

- Teste de navegador contra a API real encontra classes de defeito diferentes das encontradas por teste de componente.
- Quando o botão de envio é desabilitado, a guarda interna contra envio duplicado fica invisível; só um teste que dispara o evento diretamente a exercita.
- Limites de caracteres via `maxLength` do navegador escondem a mensagem de erro; contador mais mensagem atendem melhor ao critério de "mensagem clara".
- Mensagens de erro do cliente e do servidor devem ser mantidas idênticas, para que a origem do bloqueio não mude o texto que o usuário vê.
- Registrar o que **não** foi validado, ao lado do que foi, evitou que resultados do Linux fossem lidos como resultados do Windows.

## 6. Parecer do responsável (a preencher)

| Tema | Comentário do responsável |
|---|---|
| O que funcionou bem | _a preencher_ |
| O que não funcionou | _a preencher_ |
| O que mudar na Sprint 02 | _a preencher_ |
| Decisões tomadas na retrospectiva | _a preencher_ |
