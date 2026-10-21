# Sprint 01 — Fase 3 (US-02 Backend): registro de evidências

Registra **apenas o que foi observado**. Escopo: backend da US-02 (T3.1 a T3.5). Não há frontend da US-02, nem sprint, Kanban ou autenticação. Nada foi publicado no GitHub e os critérios das Issues não foram alterados. **A US-02 não é declarada concluída**: falta o frontend (AC01 e AC07 "na tela", AC09 "na interface"), o E2E e a homologação.

## Contexto da execução

- **Data:** 2026-10-21 (UTC). **Commit:** não aplicável (pasta fora de repositório Git).
- **Ambiente:** Ubuntu 24.04, Python 3.12.3, Node 22, Chromium 141 (instalação do ambiente).
- **PostgreSQL:** 16.15 local (porta 5433), **não** a imagem Docker `postgres:16-alpine`.

## Entregas

| Tarefa | Entrega |
|---|---|
| T3.1 | Modelo `Story` (`app/models/story.py`) e migração `0003` (`alembic/versions/20261021_0003_create_stories.py`): UUID, `project_id` com FK, título, descrição, prioridade, critérios em JSONB, status, datas |
| T3.2 | Schemas e validação (`app/schemas/story.py`): título 1–150, descrição ≤2000, prioridades Alta/Média/Baixa, critérios 1–20 itens de 1–500 caracteres, mensagens em português |
| T3.3 | Serviço (`app/services/stories.py`) e rotas (`app/api/v1/stories.py`): `POST` e `GET /api/v1/projects/{id}/stories` |
| T3.4 | 145 testes novos (77 sem banco e 68 com PostgreSQL) |
| T3.5 | Evidências em `docs/sprints/evidencias/fase-3-endpoints.txt`; ADR-002 seção 10; guia de ambiente |

## Resultados observados

| Verificação | Resultado |
|---|---|
| `ruff check` / `ruff format --check` / `mypy` (estrito) | passaram (54 arquivos) |
| `pytest` completo (com PostgreSQL) | **298 passaram, 0 falharam** (165 sem banco + 133 de integração). Fase 1 tinha 153; 145 são novos |
| `pytest -m "not integration"` (sem banco) | **165 passaram**, 133 desmarcados (os 88 da Fase 1 seguem passando) |
| Alembic no banco de desenvolvimento | `downgrade 0003→0002` e `upgrade 0002→0003` sem erro; `alembic check`: "No new upgrade operations detected"; **o projeto criado antes continuou lá** (1 antes, 1 depois, nos dois sentidos) |
| Frontend (regressão Fases 0–2) | eslint, prettier, `tsc` e build passaram; Vitest **72 passaram** |
| E2E Playwright (regressão, API real) | **31 passaram, 1 pulado, 0 falhas** (o pulado é o teste de teclado, só desktop) |
| Sanidade por mutação | 9 defeitos injetados; 8 detectados de imediato (listagem sem filtro por projeto, prioridade aceitando tudo, critério vazio descartado, limite do título 151, status aceito do cliente, sem rollback após erro de integridade, FK sem virar 404, engolir falha de banco e confirmar) |

Sobre a mutação que sobreviveu: remover só o `raise` após o rollback em `create_story` não foi detectado, porque o `refresh` seguinte falha e a API continua respondendo 500 (o defeito fica mascarado). Com `raise` e `refresh` removidos juntos (a API passaria a confirmar sem gravar), o teste falha. A proteção existe em duas camadas; não há teste isolado para a primeira.

Alteração em teste existente: `tests/unit/test_projects_openapi.py` listava exatamente os caminhos da US-01; foi acrescentado o caminho de histórias. Os demais testes da Fase 0, 1 e 2 não foram alterados. A fixture `clean_db` passou a limpar `stories` junto com `projects` (a FK exige).

## Cobertura dos critérios de aceitação da US-02 (backend)

| AC | Situação |
|---|---|
| AC01 criar e listar no backlog | testado na API e no banco (201, listagem, ordem dos critérios) |
| AC02 título vazio | 422 com `field: "title"` e mensagem; nada gravado |
| AC03 sem critério válido | 422 para lista vazia, nula, item vazio e item só com espaços; nada gravado |
| AC04 prioridade inválida | 422 para `Urgente`, `alta`, `Media`, vazia, nula e numérica; também rejeitada pelo `CHECK` do banco |
| AC05 projeto inexistente | 404 no `POST` e no `GET`; nada gravado; corrida (projeto removido no meio) também vira 404 |
| AC06 títulos repetidos | dois itens com o mesmo título, ids diferentes, ambos listados; permitido também entre projetos |
| AC07 persistência | relido por cliente novo e direto no banco: título, prioridade, critérios e ordem preservados. **Na tela, só após o frontend** |
| AC08 isolamento | backlog de cada projeto contém só as próprias histórias |
| AC09 falha de persistência | falha no `commit`, após o `INSERT` e no banco parado: 500 genérico, sem `id` na resposta, nenhum registro; o próximo `POST` funciona. **Na interface, só após o frontend** |

## Decisões que preenchem lacunas da Issue #2 (ver ADR-002, seção 10)

Ordenação do backlog (mais recentes primeiro), status padrão `A fazer` definido pelo servidor, `ON DELETE RESTRICT`, limites dos critérios (1–500 caracteres, até 20 itens, provisórios desde a Fase 0) e `GET` de projeto inexistente retornando 404 (e não lista vazia).

## Não validado / pendências

- **Docker / `postgres:16-alpine`:** não usado. Os testes de integração rodaram em PostgreSQL 16.15 local.
- **Máquina do usuário (Windows):** os testes sem PostgreSQL (`pytest -m "not integration"`, esperado: 165 passed) ainda precisam ser confirmados lá; os de integração não podem ser rodados lá sem Docker.
- **Frontend e E2E da US-02:** não implementados (fora desta fase).
- **Concorrência real:** a corrida entre verificação e gravação foi simulada com `monkeypatch`, não com duas conexões simultâneas.
- **Carga e volume:** não avaliados (sem paginação, por decisão do ADR-002).
- **Cobertura de código:** não medida.
- **Homologação:** pendente a validação do responsável das decisões marcadas com (*) no ADR-002.
