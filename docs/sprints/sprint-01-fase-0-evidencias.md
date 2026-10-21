# Sprint 01 — Fase 0 (Fundação técnica): registro de evidências

Segue o modelo de `docs/05-qualidade-e-testes.md`. Registra **apenas o que foi observado**. A Fase 0 não conclui nenhuma história (US-01 e US-02 não foram iniciadas).

## Contexto da execução

- **Data:** 2026-10-21 (UTC)
- **Commit:** não aplicável. A pasta foi gerada fora de um repositório Git e nada foi publicado no GitHub.
- **Ambiente:** Ubuntu 24.04 (Linux), Python 3.12.3, Node 22.22.0, npm 10.9.4.
- **PostgreSQL usado nos testes:** 16.15 (instalação local do ambiente, porta 5433, mesmas credenciais do `.env.example`). **Não** foi a imagem Docker `postgres:16-alpine`: o Docker Engine não estava acessível neste ambiente.

## Resultados por tarefa

| Tarefa | Verificação planejada | Comando / procedimento | Resultado observado |
|---|---|---|---|
| T0.1 | Backend e frontend sobem | `uvicorn app.main:app`; `vite` | API respondeu `200` em `/api/v1/health`; Vite serviu `index.html` e `src/main.tsx` com `200` |
| T0.2 | Conexão do backend com o banco | `GET /api/v1/health`; testes `test_database.py` | `{"status":"ok","database":"ok"}`; 3 testes passaram. Compose: apenas `docker compose config` (válido); **`up` não executado** |
| T0.3 | Alembic `upgrade` e `downgrade` | `alembic upgrade head`, `current`, `downgrade base`, `upgrade head --sql`, `check`; testes `test_migrations.py` | Todos concluíram sem erro; `current` = `0001 (head)`; `check`: "No new upgrade operations detected"; 2 testes passaram |
| T0.4 | Lint, formatação e tipos | `ruff check`, `ruff format --check`, `mypy`; `eslint`, `prettier --check`, `tsc --noEmit` | Todos passaram (25 arquivos Python; frontend sem avisos) |
| T0.5 | Infraestrutura de testes | `pytest`; `vitest run`; `playwright test --list` | pytest: **14 passaram**; Vitest: **5 passaram** (2 arquivos); Playwright: 4 testes listados, **não executados** |

Complementos: `npm run build` concluiu; `pytest -m "not integration"` executou 7 testes sem banco; arquivos versionáveis conferidos com um repositório temporário (65 arquivos, nenhum `.env`, `node_modules` ou `.venv`).

## Não executado / limitações

- **`docker compose up -d db`**: Docker Engine indisponível neste ambiente. O arquivo foi validado só sintaticamente (`docker compose config`), inclusive a mensagem de erro quando falta `POSTGRES_PASSWORD`.
- **Testes E2E (Playwright)**: o download do Chromium foi bloqueado (`cdn.playwright.dev`, HTTP 403). Os testes foram apenas listados. O comportamento de layout responsivo no navegador **não foi verificado**.
- **Windows / PowerShell**: os comandos do guia para Windows não foram executados; só os equivalentes em bash foram.
- **VS Code**: as tarefas (`tasks.json`), as configurações e as extensões foram escritas e tiveram a sintaxe JSON validada, mas não foram abertas no editor.
- **Cobertura de testes**: não medida; nenhum percentual é informado.

## Defeitos e correções durante a execução

- `mypy` apontou 6 erros de tipo nos testes; corrigidos e reexecutados (sem erros).
- `ruff` apontou 2 erros de ordenação de imports (pasta local `alembic/` confundida com a biblioteca); corrigido por configuração.
- `prettier` apontou formatação em `src/index.css`; corrigido.
- Avisos de depreciação (httpx e `prepend_sys_path` do Alembic) e incompatibilidades de versão (TypeScript 7, jsdom 30) foram tratados; detalhes no ADR-002, seção 9.
