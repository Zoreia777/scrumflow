# Sprint 01 — Fase 1 (US-01 Backend): registro de evidências

Registra **apenas o que foi observado**. Escopo: backend da US-01 (T1.1 a T1.6). A US-01 **não está concluída**: faltam frontend, testes E2E e a Definição de Pronto completa. Os critérios de aceitação da Issue #1 não foram alterados. A US-02 não foi iniciada. Nada foi publicado no GitHub.

## Contexto da execução

- **Data:** 2026-10-21 (UTC)
- **Commit:** não aplicável (pasta fora de repositório Git).
- **Ambiente:** Ubuntu 24.04, Python 3.12.3.
- **PostgreSQL:** 16.15, instalação local (porta 5433). **Não** foi a imagem Docker `postgres:16-alpine`, pois o Docker não está acessível neste ambiente.

## Entregas

| Tarefa | Entrega |
|---|---|
| T1.1 | Modelo `Project` (`app/models/project.py`) e migração `0002` (`alembic/versions/20261021_0002_create_projects.py`) |
| T1.2 | Normalização (NFC + strip) e schemas Pydantic com mensagens em português (`app/core/text.py`, `app/schemas/project.py`) |
| T1.3–T1.5 | Serviço e endpoints `POST/GET /api/v1/projects`, `GET/PATCH /api/v1/projects/{id}` |
| T1.6 | Envelope de erros unificado: 404, 422, 405 e 500 sem vazar detalhes internos (`app/core/errors.py`) |

## Resultados de verificação

| Verificação | Resultado |
|---|---|
| `ruff check` / `ruff format --check` | passaram (43 arquivos) |
| `mypy` (strict) | "no issues found in 43 source files" |
| `pytest` (completo, com PostgreSQL) | **153 passaram** (88 unitários + 65 de integração), 0 falhas |
| `pytest -m "not integration"` (sem banco) | **88 passaram**, 65 desmarcados |
| Alembic no banco de desenvolvimento | `downgrade 0002 -> 0001`, `upgrade 0001 -> 0002`, `current` = `0002 (head)`, `check`: "No new upgrade operations detected" |
| Regressão da Fase 0 (backend) | os testes da Fase 0 seguem passando (migrações ajustadas para `0001` como alvo da baseline); `/api/v1/health` preservado |
| Sanidade por mutação | 5 defeitos injetados (limite do nome 101, limite da descrição 1001, sem NFC, 500 vazando `str(exc)`, mensagem em inglês) foram todos detectados pelos testes unitários |

O frontend não foi alterado nesta fase e seus testes **não foram reexecutados**; vale o resultado da Fase 0.

## Evidências dos endpoints (requisições reais ao servidor)

Registradas em `docs/sprints/evidencias/fase-1-endpoints.txt` (15 cenários + falha real de banco). Resumo:

| # | Requisição | Resultado |
|---|---|---|
| 1 | `POST /projects` com nome e descrição | 201, UUID gerado, `created_at`/`updated_at` |
| 2 | `POST` com `"  Segundo projeto  "`, sem descrição | 201, nome sem espaços nas pontas, `description: null` |
| 3 | `GET /projects` | 200, mais recente primeiro |
| 4 | `GET /projects/{id}` | 200 |
| 5–6 | `PATCH` nome e descrição; `GET` seguinte | 200; `updated_at` mudou; dados persistidos |
| 7 | `PATCH {"description": null}` | 200, descrição removida |
| 8 | `POST` nome em branco | 422 `blank`: "O nome não pode ficar vazio." |
| 9 | `POST` nome com 101 caracteres | 422 `too_long`: "O nome deve ter no máximo 100 caracteres." |
| 10 | `POST` descrição com 1001 caracteres | 422 `too_long` |
| 11 | `PATCH {}` | 422 `empty_body` |
| 12, 14 | `GET`/`PATCH` com UUID inexistente | 404 `not_found` |
| 13 | `GET /projects/abc` | 422 (identificador inválido) |
| 15 | `GET /projects` após reiniciar o servidor | 200, mesmos dados |
| 16 | `GET`, `GET {id}` e `POST` com o PostgreSQL parado | 500 `internal_error`, "Erro interno do servidor."; o erro técnico aparece só no log do servidor |

## Observações

- Datas saem em `timestamptz` com o fuso da sessão do PostgreSQL (aqui -03:00); o instante é o mesmo em UTC.
- Um teste de introspecção de `app.routes` foi removido por não encontrar as rotas nesta versão do FastAPI; foi substituído por testes baseados no OpenAPI (`tests/unit/test_projects_openapi.py`). Não era defeito da API.

## Não executado / limitações

- **Docker**: `docker compose up` e a imagem `postgres:16-alpine` não foram usados. Pendente em ambiente com Docker.
- **Máquina do usuário (Windows)**: os testes de integração e esta fase não foram reproduzidos lá; recomenda-se rodar `pytest -m "not integration"` (ver `docs/ambiente-local.md`, seção 7.1).
- **Playwright / frontend**: não executados nesta fase.
- **Cobertura**: não medida; nenhum percentual é informado.
