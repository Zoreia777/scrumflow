# Sprint 01 — Fase 4 (US-02 Frontend): registro de evidências

Registra **apenas o que foi observado**. Escopo: interface de cadastro e listagem de histórias de usuário (T4.1 a T4.5). Foram usados apenas os endpoints existentes; nenhuma regra do backend foi alterada; não há edição/exclusão de histórias, Kanban, sprints ou autenticação. Nada foi publicado no GitHub e as Issues não foram alteradas. **A US-02 não é declarada concluída**: depende de revisão e homologação.

## Contexto da execução

- **Data:** 2026-10-21 (UTC). **Commit:** não aplicável (pasta fora de repositório Git).
- **Ambiente:** Ubuntu 24.04, Python 3.12.3, Node 22.22.0, Chromium 141 (instalação do ambiente, via `E2E_CHROMIUM_PATH`).
- **PostgreSQL:** 16.15 local (porta 5433), **não** a imagem Docker `postgres:16-alpine`.

## Entregas

| Tarefa | Entrega |
|---|---|
| T4.1 | `src/types/story.ts`, `src/api/stories.ts`, `src/validation/story.ts`; `useRequest` ganhou `mutate` |
| T4.2 | `StoriesSection`, `StoryForm`, `CriteriaEditor`, `PriorityPicker`, `StoryCard`; seção integrada à página de detalhes; CSS acrescentado sem alterar a identidade |
| T4.3 | 65 testes Vitest novos |
| T4.4 | 15 cenários Playwright novos (`e2e/stories.spec.ts`), 14 capturas de tela e registro de integração |
| T4.5 | Regressão completa, ADR-002 (seção 11), guia de ambiente |

## Resultados observados

| Verificação | Resultado |
|---|---|
| ESLint / Prettier | sem avisos / passou |
| `tsc --noEmit` (estrito) | passou |
| `npm run build` | concluiu (JS 249 kB, 77 kB gzip; CSS 11 kB) |
| Vitest | **137 passaram** em 8 arquivos (Fases 0–2: 72; novos: 65 — validação 15, API 11, fluxos 39) |
| Playwright, API e PostgreSQL reais | **60 passaram, 2 pulados, 0 falhas** (62 execuções = 31 cenários x desktop e mobile; os 2 pulados são os testes de teclado no perfil mobile). US-01: 31 passaram (1 pulado); US-02: 29 passaram (1 pulado) |
| Backend (regressão) | `pytest`: **298 passaram** (165 sem banco + 133 de integração); ruff, format e mypy limpos |
| Sanidade por mutação (frontend) | 12 defeitos injetados (sucesso antes da resposta, erro engolido, limite 21 critérios, isolamento sem checagem do projeto, critério vazio descartado, história criada não listada, status fixo no cliente, cliente enviando status, título 151, prioridade pré-selecionada, envio duplicado, remover último critério): **todos detectados** (o de envio duplicado só depois de um teste adicional, pois o botão desativado o escondia) |

### Alterações em testes existentes (regressão da US-01)

- `src/test/helpers.tsx`: o `mockFetch` passou a responder lista vazia a `GET .../stories`, porque a página de detalhes agora consulta as histórias; sem isso os testes da US-01 receberiam uma resposta inadequada.
- `projects-flow.test.tsx`: uma expectativa mudou de duas para três requisições `GET` ("sem alterações não chama a API"), pois o detalhe também busca as histórias. Nenhuma gravação passou a ocorrer.
- `e2e/projects.spec.ts` e o backend não foram alterados.

## Defeitos encontrados e corrigidos nesta fase

1. **Layout:** com título longo e sem espaços, a mensagem de sucesso estourava a largura no E2E de responsividade (desktop e mobile). Corrigido com quebra de palavra no `Alert`.
2. **Usabilidade:** o erro de um campo permanecia depois de o usuário corrigi-lo. Agora cada erro some quando o campo é editado (2 testes novos).
3. **Teste insuficiente:** a guarda contra envio duplicado não era exercitada; foi acrescentado um teste que dispara o evento de envio diretamente.

## Critérios de aceitação da US-02 x evidências

Referências: **V** = Vitest (`src/pages/stories-flow.test.tsx`, `src/api/stories.test.ts`, `src/validation/story.test.ts`); **E** = Playwright (`e2e/stories.spec.ts`, API real); **B** = backend (`backend/tests/...`, Fase 3); **I** = `evidencias/fase-4-integracao-api.txt`.

| AC | Evidência |
|---|---|
| AC01 cadastrar e ver no backlog | V "envia o corpo exato (sem status), mostra sucesso e a nova história com status 'A fazer'"; E "AC01 + AC07"; E "limites ... aceitos pela API real"; I passos 2–3 |
| AC02 título vazio | V "título vazio: mensagem clara, foco no campo e nenhuma chamada"; V validação (`""`, espaços, tab); E "AC02" (nenhum `POST` enviado); B 422 |
| AC03 sem critério válido | V "sem nenhum critério preenchido", "critério em branco entre outros" e validação; E "AC03" (adicionar/remover e recusa); B 422 |
| AC04 prioridade inválida | V "prioridade não escolhida é recusada", "422 do servidor aparece no campo" e opções limitadas às 3; E "AC04" (3 opções, sem pré-seleção, API recusa `Urgente`); B 422 |
| AC05 projeto inexistente | V "projeto inexistente não mostra a seção" e "404 durante o cadastro"; E "AC05" (API 404 em `POST`/`GET` e tela sem seção) e "404 ao cadastrar mostra erro"; I item final (HTTP 404) |
| AC06 títulos repetidos | V "aceita títulos repetidos"; E "AC06" (2 itens, ids distintos, também após recarregar); B |
| AC07 persistência | V "continua com título, prioridade e critérios depois de recarregar" (backend falso); E "AC01 + AC07" (recarrega e confere título, prioridade, status e critérios); I passo 3 |
| AC08 isolamento | V "histórias de um projeto não aparecem em outro", "ao navegar..." e "resposta lenta de outro projeto não contamina"; V recusa de itens de outro projeto; E "AC08" (tela, navegação e API); I passo 4 |
| AC09 falha de persistência | V "falha de comunicação: erro claro, sem sucesso, sem item fantasma", "erro 500", "201 com corpo inválido", "enquanto a API não responde"; E "AC09" (requisição abortada e 500; depois conferido na API que nada foi gravado); I passo 5; B rollback |

## Requisitos da Fase 4 x evidências

| # | Requisito | Evidência |
|---|---|---|
| 1–2 | Seção na página de detalhes com título, prioridade, status e critérios | V "Seção ... mostra a seção"; capturas `fase-4-*-backlog.png` |
| 3–6 | Formulário, título 1–150, descrição ≤2000, prioridades | V "Formulário: título e descrição"; E "limites" |
| 7–8 | Critérios dinâmicos, 1 a 20 itens de até 500 caracteres | V "critérios de aceitação dinâmicos"; E "AC03" e "limites" |
| 9 | Status `A fazer` vindo do backend | V "exibe o status definido pelo backend"; E "AC01 + AC07"; I |
| 10–11 | Mensagens claras; sem sucesso antes da resposta válida | V "enquanto a API não responde", "201 com corpo inválido"; E "AC09" |
| 12 | Isolamento por projeto | ver AC08 |
| 13 | Estado vazio | V "estado vazio"; captura `estado-vazio` |
| 14 | Carregamento e "Tentar novamente" | V "falha ao carregar ... recupera"; E "falha ao listar"; captura `erro-rede` |

## Capturas de tela

`docs/sprints/evidencias/fase-4-{desktop,mobile}-{backlog,estado-vazio,formulario-vazio,formulario-validacao,formulario-preenchido,sucesso,erro-rede}.png` (reais, geradas no Chromium; desktop 1280 px e emulação Pixel 7). O cabeçalho fixo foi desativado só nas capturas de página inteira.

## Acessibilidade básica (verificada por testes)

Formulário nomeado; campos rotulados; erros ligados por `aria-describedby`/`aria-invalid`; foco no primeiro campo inválido e no título ao abrir; prioridade como grupo de opções com legenda; critérios em grupo com legenda, números nos rótulos e botões "Remover critério N"; mudanças na lista de critérios anunciadas por região `aria-live`; carregamento com `role="status"`, erros com `role="alert"`; prioridade e status identificados por texto (não só cor); hierarquia h1 > h2 > h3; foco devolvido ao botão ao cancelar; fluxo completo só com teclado (E2E desktop). **Não houve auditoria com leitor de tela nem ferramenta automática (axe/Lighthouse).**

## Não validado / limitações

- **Windows do usuário (sem Node/Docker):** o frontend só pôde ser executado neste ambiente Linux.
- **Docker / `postgres:16-alpine`:** não usado.
- **Navegadores:** apenas Chromium (desktop e emulação Pixel 7); Firefox, Safari e aparelhos reais não foram testados.
- **Leitor de tela, contraste automatizado, zoom 200%:** não verificados.
- **Cobertura de código:** não medida.
- **Os E2E deixam registros "E2E …"** no banco de desenvolvimento (não os apagam).
- **Volume:** a lista não tem paginação (ADR-002); não foi avaliada com centenas de histórias.
- **Formulário da US-01** continua mostrando o erro até o próximo envio (comportamento da Fase 2, não alterado nesta fase).
- **Decisões (*)** do ADR-002, seção 11, aguardam validação do responsável.
