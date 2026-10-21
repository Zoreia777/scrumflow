# Sprint 01 — Review

Consolida as entregas da Sprint 01 (US-01 e US-02) e liga cada critério de aceitação às evidências já registradas. **Este documento não cria evidências novas**: tudo vem dos registros das Fases 0 a 4 e da confirmação do responsável sobre o Windows.

> **Estado:** pronto para revisão. As Issues #1 e #2 **não** foram marcadas como Done, a homologação **não** está completa e nada foi publicado no GitHub. Ver `sprint-01-checklist-encerramento.md` e `sprint-01-pendencias-homologacao.md`.

## 1. Escopo da Sprint

| Item | Conteúdo | Fases |
|---|---|---|
| Fundação técnica | Backend, frontend, banco, migrações, lint/tipos, infraestrutura de testes | 0 |
| US-01 — Cadastrar projetos | Backend (API) e frontend (listagem, criação, detalhes, edição) | 1 e 2 |
| US-02 — Cadastrar histórias de usuário | Backend (API) e frontend (seção na página do projeto) | 3 e 4 |

Fora do escopo, e não implementados: autenticação, Kanban, sprints no produto, edição e exclusão de histórias, exclusão de projetos.

## 2. Onde cada resultado foi obtido

Os números abaixo **não** valem para outros ambientes. A coluna "Ambiente" diz onde cada um foi observado.

| Resultado | Valor | Ambiente |
|---|---|---|
| Backend: `pytest` completo | 298 passaram (165 sem banco + 133 de integração com PostgreSQL) | Linux do Claude, PostgreSQL 16.15 local |
| Backend: `pytest -m "not integration"` | 165 passaram | Linux do Claude **e** Windows do responsável (confirmado pelo responsável) |
| Backend: ruff, ruff format, mypy (strict) | limpos (54 arquivos) | Linux do Claude |
| Frontend: Vitest | 137 passaram em 8 arquivos | Linux do Claude |
| Frontend: ESLint, Prettier, `tsc`, build | passaram | Linux do Claude |
| E2E Playwright (API e PostgreSQL reais) | 60 passaram, 2 pulados, 0 falhas (62 execuções = 31 cenários x desktop e mobile) | Linux do Claude, Chromium 141 |
| `npm audit` (todas as dependências) | 0 vulnerabilidades | Linux do Claude, executado na consolidação |
| `pip check` | sem requisitos quebrados | Linux do Claude, executado na consolidação |

Não foram executados: Docker (`docker compose up`, imagem `postgres:16-alpine`), nenhum teste de frontend no Windows, nenhum navegador além do Chromium, nenhuma auditoria com leitor de tela ou axe/Lighthouse, nenhuma medição de cobertura, `pip-audit`.

Evolução observada das contagens: backend 14 (Fase 0) → 153 (Fase 1) → 298 (Fase 3); Vitest 5 → 72 → 137; E2E 31 (US-01, 1 pulado) → 60 (total, 2 pulados).

## 3. US-01 — Cadastrar projetos

**Entregue:** `POST/GET /api/v1/projects`, `GET/PATCH /api/v1/projects/{id}`; envelope de erros unificado; telas de listagem, criação, detalhes e edição; limites de nome (100) e descrição (1000) com contador e mensagem.

| AC | Resumo | Backend (Fase 1) | Frontend (Fase 2) | Evidência |
|---|---|---|---|---|
| AC01 | Criar e ver na lista | testes de API e integração | Vitest + E2E, inclusive após recarregar | `fase-1-endpoints.txt` (cenários 1–4, 15); `sprint-01-fase-2-evidencias.md` |
| AC02 | Nome vazio recusado | 422 `blank` | Vitest + E2E (nenhum POST enviado) | `fase-1-endpoints.txt` (8) |
| AC03 | Limites 100/1000 | 422 `too_long` | Vitest + E2E (101 e 1001 bloqueados, 100 aceito) | `fase-1-endpoints.txt` (9, 10) |
| AC04 | Editar e persistir | `PATCH` | Vitest + E2E, após recarregar | `fase-1-endpoints.txt` (5–7) |
| AC05 | Detalhes (id, nome, descrição, data) | `GET {id}` | Vitest + E2E | `fase-1-endpoints.txt` (4) |
| AC06 | Falha de API sem falso sucesso | 500 genérico, sem vazamento | Vitest (rede, 500, 404, 201 inválido) + E2E (abortada, 500) | `fase-1-endpoints.txt` (16) |
| AC07 | Requisição inválida recusada pelo backend | 422 | Vitest (422 no campo) + E2E (422 direto na API, nada gravado) | `fase-1-endpoints.txt` (8–11, 13) |

A numeração e o resumo dos AC da US-01 seguem a tabela de `sprint-01-fase-2-evidencias.md`. O texto integral da Issue #1 não foi relido nesta consolidação.

## 4. US-02 — Cadastrar histórias de usuário

**Entregue:** tabela `stories` (migração 0003), `POST/GET /api/v1/projects/{id}/stories`, seção "Histórias de usuário" na página de detalhes do projeto, formulário com critérios dinâmicos (1 a 20, até 500 caracteres cada), status "A fazer" definido pelo servidor.

| AC | Resumo | Backend (Fase 3) | Frontend (Fase 4) | Evidência |
|---|---|---|---|---|
| AC01 | Criar história e ver no backlog | 201, listagem, ordem dos critérios | Vitest "envia o corpo exato..."; E2E "AC01 + AC07" | `fase-3-endpoints.txt`; `fase-4-integracao-api.txt` (seções 2–3); capturas `fase-4-*-backlog.png`, `*-sucesso.png` |
| AC02 | Título vazio recusado, mensagem identifica o campo | 422 `field: "title"` | Vitest (vazio, espaços, tab); E2E "AC02" | `fase-3-endpoints.txt`; captura `*-formulario-validacao.png` |
| AC03 | Sem critério válido recusado | 422 (vazia, nula, item vazio, só espaços) | Vitest (vazio, em branco, 501, 20); E2E "AC03" | `sprint-01-fase-4-evidencias.md` |
| AC04 | Prioridade fora do conjunto recusada | 422 (`Urgente`, `alta`, `Media`, vazia, nula, numérica) + `CHECK` no banco | Vitest (sem pré-seleção, 422 no campo); E2E "AC04" | `sprint-01-fase-3-evidencias.md` |
| AC05 | Projeto inexistente → 404, nada criado | 404 em `POST` e `GET`; corrida também vira 404 | Vitest (sem seção; 404 no cadastro); E2E "AC05" | `fase-4-integracao-api.txt` (seção 6, `POST` em projeto inexistente → HTTP 404) |
| AC06 | Títulos repetidos permitidos | ids distintos, ambos listados | Vitest "aceita títulos repetidos"; E2E "AC06" | `sprint-01-fase-4-evidencias.md` |
| AC07 | Persistência após recarregar | relido por cliente novo e direto no banco | Vitest (backend falso); E2E "AC01 + AC07" (recarrega e confere) | `fase-4-integracao-api.txt` (seção 3) |
| AC08 | História de outro projeto não aparece | backlog separado por projeto | Vitest (navegação A→B, resposta lenta, recusa de `project_id` diferente); E2E "AC08" | `fase-4-integracao-api.txt` (seção 4) |
| AC09 | Falha ao salvar: sem sucesso e sem item fantasma | falha no `commit`, após `INSERT` e com banco parado: 500, nenhum registro | Vitest (rede, 500, 201 inválido); E2E "AC09" (abort e 500) | `fase-4-integracao-api.txt` (seções 5–6) |

O mapa com os nomes dos testes está em `sprint-01-fase-4-evidencias.md`. A Issue #2 não define ordenação, status padrão nem texto exato de mensagens; essas escolhas estão no ADR-002 (seções 10 e 11).

## 5. Decisões de interface e de projeto que aguardam validação do responsável

Escolhas feitas pelo executor (Claude) onde as Issues eram omissas. Constam no ADR-002.

1. Prioridade sem opção pré-selecionada.
2. Critério em branco **bloqueia** o envio, em vez de ser ignorado.
3. Formulário de história dentro da página de detalhes do projeto.
4. Nova história aparece no topo da lista após o `201`.
5. Sem edição e sem exclusão de histórias.
6. Roteador próprio (History API) e CSS próprio, sem dependências novas de UI.
7. Limites de caracteres sem `maxLength` do navegador, para exibir contador e mensagem.
8. Listagens "mais recentes primeiro"; sem paginação.
9. O formulário da US-01 mantém o erro exibido até o próximo envio (comportamento da Fase 2, não alterado na Fase 4).

## 6. Alterações em testes existentes durante a Sprint

- Fase 2: removido o teste-modelo da Fase 0 (`App.test.tsx`), substituído pelos novos; `smoke.spec.ts` atualizado para a nova página inicial.
- Fase 4: `test/helpers.tsx` (`mockFetch` responde lista vazia a `GET .../stories`) e uma expectativa de `projects-flow.test.tsx` (de 2 para 3 requisições `GET`), porque o detalhe do projeto passou a buscar as histórias.
- Fase 1: um teste de introspecção de rotas foi substituído por testes baseados no OpenAPI (limitação da versão do FastAPI, não defeito da API).

## 7. Resumo do estado

| Pergunta | Resposta |
|---|---|
| Os AC da US-01 e da US-02 têm evidência? | Sim, em ambiente Linux do Claude (e, para o backend sem banco, também no Windows do responsável). |
| Foi validado no ambiente oficial (Docker, máquina do responsável)? | **Não.** |
| As Issues podem ser marcadas como Done? | **Não** sem a homologação do responsável. |
| Há algo publicado no GitHub? | **Não.** |
