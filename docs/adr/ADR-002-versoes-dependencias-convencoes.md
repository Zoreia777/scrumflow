# ADR-002 — Versões, dependências e convenções técnicas (Fase 0)

**Estado:** aplicada na Fase 0, sujeita a objeção do responsável | **Data:** 2026-10-21

Complementa o ADR-001 (stack). Registra as escolhas feitas **antes** da implementação da Fase 0 (T0.1–T0.5). Nada aqui amplia o escopo do MVP.

## 1. Decisões já aprovadas pelo responsável

- Docker Compose apenas para o PostgreSQL (desenvolvimento e testes); backend e frontend rodam localmente.
- Identificador UUID; critérios de aceitação em JSONB (a partir da US-02).
- Mensagens de erro de validação em português.
- CSS simples e responsivo, sem biblioteca de UI.
- Testes: pytest, React Testing Library e Playwright.
- Sem autenticação e sem funcionalidades além da Fase 0 nesta etapa.

## 2. Versões de runtime

| Item | Escolha | Justificativa |
|---|---|---|
| Python | **3.12** (`.python-version`) | Versão estável, com wheels disponíveis para todas as dependências, inclusive no Windows |
| Node.js | **22 LTS, mínimo 22.13** (`.nvmrc`, `engines`) | LTS com suporte a Vite 8, Vitest e Playwright; 22.13 é o piso exigido pelo jsdom 29 |
| PostgreSQL | **16** (`postgres:16-alpine`) | Versão estável; `gen_random_uuid()` e JSONB nativos |
| Docker Compose | v2 (`docker compose`) | Padrão atual do Docker Desktop |

## 3. Dependências do backend

Gerenciador: **pip + venv** (`backend/.venv`), com `requirements.txt` (execução) e `requirements-dev.txt` (desenvolvimento e testes). Escolhido por funcionar igual em Windows, macOS e Linux e por dispensar ferramenta extra. As versões exatas resolvidas na instalação ficam fixadas (`==`) nesses arquivos.

- **Execução:** FastAPI, Uvicorn, Pydantic 2, pydantic-settings, SQLAlchemy 2, Alembic, psycopg 3 (driver `postgresql+psycopg`).
- **Desenvolvimento:** pytest, httpx2 (cliente de teste do FastAPI/Starlette; o `httpx` clássico gera aviso de depreciação nesta versão do Starlette), Ruff (lint e formatação), mypy (tipos).
- **Sessões síncronas** (SQLAlchemy síncrono; rotas `def`). Mais simples de testar; suficiente para o MVP.
- **Não instalados agora:** bibliotecas de cobertura, ORMs auxiliares, qualquer biblioteca de autenticação.

## 4. Dependências do frontend

Gerenciador: **npm** (com `package-lock.json`).

- **Execução:** React, React DOM.
- **Build/dev:** Vite, `@vitejs/plugin-react`, TypeScript **6.0.x** (não a 7: o `typescript-eslint` atual declara suporte apenas a TypeScript abaixo de 6.1).
- **Testes:** Vitest + jsdom **29** (a 30 exige Node 22.22.2+, restrição desnecessária para o projeto), React Testing Library (`@testing-library/react`, `@testing-library/dom`, `jest-dom`, `user-event`), Playwright (`@playwright/test`; o navegador é baixado à parte com `npx playwright install chromium`).
- **Qualidade:** ESLint (+ typescript-eslint e regras de hooks do React), Prettier.
- **Adiado para a Fase 2** (não instalado agora): React Router. Cliente HTTP: `fetch` nativo, sem biblioteca. Sem biblioteca de estado, de formulários ou de UI.

## 5. Convenções de ambiente

- Fonte única de configuração: **`.env` na raiz** (copiado de `.env.example`), lido pelo Docker Compose e pelo backend. O frontend usa `frontend/.env` apenas para `VITE_API_BASE_URL`.
- Porta do PostgreSQL no host: **5433** (evita conflito com um PostgreSQL local na 5432).
- Bancos: `scrumflow` (desenvolvimento) e `scrumflow_test` (testes, criado automaticamente pelos testes se não existir).
- Backend em `http://localhost:8000`, frontend em `http://localhost:5173`. CORS restrito às origens listadas em `CORS_ORIGINS`.
- Nenhum segredo versionado; apenas `.env.example`. A senha do exemplo é um marcador para uso local e deve ser trocada se o banco for exposto.
- Finais de linha LF (`.gitattributes`, `.editorconfig`) para evitar ruído entre Windows e Linux.

## 6. Convenções de banco

- Chaves `uuid` geradas pela aplicação (`uuid4`), sem depender de extensão do PostgreSQL.
- Datas em `timestamptz`, sempre em UTC.
- Convenção de nomes para constraints e índices definida no `MetaData` do SQLAlchemy, para que o Alembic gere nomes estáveis.
- Prioridade e status como `VARCHAR` + `CHECK` (não ENUM nativo), facilitando migrações.
- Migração inicial vazia (`baseline`); nenhuma tabela de negócio na Fase 0.

## 7. Convenções de normalização e validação (valem a partir da Fase 1)

Respondem às decisões D-08 a D-12 e D-15 do planejamento. São **provisórias até o início das Fases 1 e 3**, quando o responsável pode ajustá-las antes da implementação.

| Tema | Convenção |
|---|---|
| Texto | `strip()` nas extremidades e normalização Unicode NFC; espaços internos não são alterados |
| Contagem de limites | Em caracteres (code points) **depois** da normalização |
| Nome do projeto / título da história | Obrigatório; 1–100 e 1–150 caracteres após normalização |
| Descrição | Opcional; texto vazio ou só espaços vira `null`; máx. 1000 (projeto) e 2000 (história) |
| Nome duplicado | Permitido (projeto e história); sem restrição UNIQUE |
| Critérios de aceitação | Lista de textos; ao menos 1; **cada item não vazio** (item vazio é rejeitado, nunca descartado em silêncio); provisório: 1–500 caracteres por item e até 20 itens |
| Prioridade | Exatamente `Alta`, `Média` ou `Baixa` (diferencia maiúsculas; sem apelidos) |
| Status da história | Definido pelo servidor (`A fazer`); o cliente não envia |
| PATCH | Parcial; campo desconhecido → 422; corpo vazio → 422; `name` nulo → 422; `description` nula limpa o campo |
| Listagens | Mais recentes primeiro (`created_at` desc, `id` como desempate); sem paginação |
| Identificador malformado no caminho | 422; identificador bem formado e inexistente → 404 |

### Formato único de erro (todas as respostas não 2xx)

```json
{
  "error": {
    "code": "validation_error",
    "message": "Dados inválidos.",
    "fields": [
      { "field": "name", "code": "too_long", "message": "O nome deve ter no máximo 100 caracteres." }
    ]
  }
}
```

- `code` de topo: `validation_error` (422), `not_found` (404), `internal_error` (500).
- `fields` aparece apenas em `validation_error`.
- Mensagens em português; erro 500 nunca expõe detalhes internos.
- O tratador global é implementado na tarefa T1.6; a Fase 0 apenas fixa o contrato.

## 8. Escopo técnico da Fase 0

- Único endpoint criado: `GET /api/v1/health` (verificação de execução e de conexão com o banco). Não é funcionalidade de produto.
- Nenhuma tabela, rota ou tela de US-01 ou US-02.
- Docker Compose é **validado sintaticamente**; a execução real depende do Docker do computador do responsável (ver relatório da Fase 0).
- Fonte de verdade das versões instaladas: `backend/requirements*.txt` (fixadas com `==`) e `frontend/package-lock.json`.

## 9. Ajustes feitos durante a execução da Fase 0

| Ajuste | Motivo |
|---|---|
| TypeScript 6.0.x em vez de 7 | Incompatibilidade de versão com `typescript-eslint` |
| jsdom 29 em vez de 30; `engines.node >=22.13` | jsdom 30 exige Node 22.22.2+ |
| httpx2 em vez de httpx nos testes | Aviso de depreciação do Starlette 1.x |
| `known-third-party = ["alembic"]` no Ruff | A pasta local `alembic/` seria confundida com a biblioteca na ordenação de imports |
| `path_separator = os` no `alembic.ini` | Aviso de depreciação do Alembic |

## 10. Decisões da Fase 3 (US-02, backend)

Aplicam as convenções das seções 6 e 7 à tabela `stories`. Itens marcados com (*) preenchem pontos que a Issue #2 deixa em aberto e podem ser ajustados pelo responsável.

| Tema | Decisão |
|---|---|
| Rotas | `POST` e `GET /api/v1/projects/{project_id}/stories` |
| Relacionamento | `stories.project_id` → `projects.id`, `NOT NULL`, índice próprio, `ON DELETE RESTRICT` (nenhuma cascata: não existe exclusão de projeto no MVP) |
| Critérios de aceitação | `JSONB NOT NULL`; no banco, `CHECK` de que é um array com ao menos 1 item; a regra "cada item não vazio, 1–500 caracteres, até 20 itens" fica na API (itens vazios são rejeitados, nunca descartados) |
| Prioridade | `VARCHAR(10)` + `CHECK` em `Alta`, `Média`, `Baixa`; na API, comparação exata (sem apelidos, sem `strip`) |
| Status (*) | `VARCHAR(20)` + `CHECK` hoje só com `A fazer`; o servidor define o valor e o cliente não pode enviá-lo (campo extra → 422). Novos status exigirão uma migração quando houver quadro/sprint |
| Ordenação do backlog (*) | Mais recentes primeiro (`created_at` desc, `id` desc), como nas demais listagens |
| Projeto inexistente | `POST` e `GET` → 404, nada é gravado; se o projeto sumir entre a verificação e a gravação, a violação de chave estrangeira também vira 404 |
| Validação x existência | Corpo inválido tem prioridade: `422` é devolvido antes de consultar o projeto |
| Atomicidade | Uma história é uma única transação; falha de banco → rollback, 500 genérico e nenhuma confirmação |
| Códigos de erro novos | `invalid_priority`, `criteria_required`, `too_many` (além de `blank`, `too_long`, `invalid_type`) |
| Migração | `0003`; `upgrade` só cria `stories` e `downgrade` só a remove, sem tocar em `projects` |

## 11. Decisões da Fase 4 (US-02, frontend)

Aplicam as seções 7 e 10 à interface. Itens marcados com (*) são escolhas de interface que a Issue #2 não define e podem ser ajustadas pelo responsável.

| Tema | Decisão |
|---|---|
| Onde fica | Seção "Histórias de usuário" na página de detalhes do projeto (`/projetos/<id>`); sem rota nova. O formulário abre dentro da seção |
| API | Somente `POST` e `GET /api/v1/projects/{id}/stories`; nenhum endpoint novo e nenhuma regra de negócio do backend alterada |
| Validação | As mesmas regras do backend, repetidas no cliente para dar resposta imediata: título 1–150, descrição ≤2000, 1–20 critérios de 1–500 caracteres, após `strip` + NFC, contados em pontos de código. O backend continua sendo a autoridade (erros 422 aparecem no campo correspondente) |
| Prioridade (*) | Três opções (rádio) sem valor pré-selecionado; escolher é obrigatório |
| Critérios (*) | A lista começa com 1 linha, não permite remover a última e bloqueia "Adicionar" em 20. Linha em branco é **recusada** com o número do critério (nunca descartada em silêncio, conforme a seção 7) |
| Status | Exibido exatamente como o backend devolve (`A fazer`); o cliente nunca o envia nem o calcula |
| Ordenação | A lista mostra a ordem da API (mais recentes primeiro); a história criada entra no topo depois do `201` |
| Sucesso | Só depois de `201` com corpo que seja uma história **do mesmo projeto**; qualquer outra resposta é erro e nada é exibido na lista |
| Erros | Falha de rede, tempo esgotado (15 s), 404, 422, 500 e resposta inesperada têm mensagem própria em português; o rascunho do formulário é preservado |
| Isolamento | A seção é recriada por projeto (`key`), requisições antigas são canceladas e itens de outro projeto são recusados na camada de API |
| Edição e exclusão | Não implementadas (a Issue #2 não as exige) |

