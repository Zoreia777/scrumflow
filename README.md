# ScrumFlow

Plataforma web de gestão ágil. Nesta etapa (Sprint 01) o produto permite **cadastrar projetos** e **cadastrar e listar histórias de usuário** de cada projeto.

> Estado do projeto: em revisão. A Sprint 01 foi implementada e testada pelo executor, mas **não foi homologada**: as Issues #1 e #2 não estão marcadas como concluídas, não houve validação com Docker nem do frontend no Windows, e o código foi publicado no GitHub, mas ainda aguarda revisão final e homologação. Veja [Limitações conhecidas](#limitações-conhecidas) e `docs/sprints/sprint-01-pendencias-homologacao.md`.

## Funcionalidades

US-01 — Projetos**
- Criar, listar, ver detalhes e editar projetos (nome de 1 a 100 caracteres; descrição opcional de até 1000).
- Mensagens de erro claras, sem falso sucesso quando a API falha.

**US-02 — Histórias de usuário**
- Na página de um projeto, seção "Histórias de usuário" com cadastro e listagem.
- Título (1–150), descrição opcional (até 2000), prioridade (Alta, Média ou Baixa) e de 1 a 20 critérios de aceitação (até 500 caracteres cada).
- Status inicial "A fazer", definido pelo servidor.
- Histórias isoladas por projeto; títulos repetidos são permitidos.
- Estados de carregamento, vazio e erro com "Tentar novamente".

**Fora do escopo atual:** autenticação, edição e exclusão de histórias, Kanban, sprints no produto, paginação.

## Stack

| Camada | Tecnologias |
|---|---|
| Backend | Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2, Alembic, psycopg 3 |
| Banco | PostgreSQL 16 (Docker Compose, imagem `postgres:16-alpine`) |
| Frontend | React 19, TypeScript, Vite, CSS próprio (sem biblioteca visual) |
| Qualidade | pytest, ruff, mypy (strict); Vitest, React Testing Library, Playwright, ESLint, Prettier |

Versões exatas e justificativas: `docs/adr/ADR-002-versoes-dependencias-convencoes.md`.

## Arquitetura

Monólito modular, com backend e frontend separados:

```
Navegador (React) ──HTTP/JSON──> FastAPI ──SQLAlchemy──> PostgreSQL
```

```
backend/app/
  api/v1/       rotas HTTP (health, projects, stories)
  schemas/      contratos de entrada/saída e validação (Pydantic)
  services/     regras de negócio
  models/       tabelas (SQLAlchemy)
  core/         configuração, banco, normalização de texto, envelope de erros
  repositories/ pacote reservado (ainda sem conteúdo)
backend/alembic/  migrações (0001 baseline, 0002 projects, 0003 stories)

frontend/src/
  api/          cliente HTTP tipado e erros classificados
  pages/        telas e roteador (History API)
  components/   componentes reutilizáveis
  validation/   regras de formulário, iguais às do backend
  hooks/ types/ lib/ test/
frontend/e2e/   testes Playwright
```

Decisões que merecem destaque:
- O **backend é a autoridade** das regras; o frontend repete as validações só para resposta imediata.
- Normalização de texto (remover espaços nas pontas, NFC) e limites contados em pontos de código.
- Erros em formato único: `{"error": {"code", "message", "fields?"}}`; erros 500 não expõem detalhes internos.
- A UI só mostra sucesso depois de uma resposta válida da API.

### API

Prefixo `/api/v1`. Documentação interativa em `/docs` com o backend no ar.

| Método e caminho | Função |
|---|---|
| `GET /health` | Estado da API e do banco |
| `POST /projects`, `GET /projects` | Criar e listar projetos |
| `GET /projects/{id}`, `PATCH /projects/{id}` | Detalhar e editar projeto |
| `POST /projects/{id}/stories`, `GET /projects/{id}/stories` | Cadastrar e listar histórias do projeto |

## Como executar

Pré-requisitos: Git, Docker com Compose v2, Python 3.12, Node.js 22.13 ou superior. O passo a passo completo, com Windows (PowerShell) e macOS/Linux, está em [`docs/ambiente-local.md`](docs/ambiente-local.md). Resumo:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
docker compose up -d db --wait

cd backend
python3.12 -m venv .venv && source .venv/bin/activate   # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# em outro terminal
cd frontend
npm install
npm run dev          # http://localhost:5173
```

O arquivo `.env` guarda a senha local do banco e **não deve ser versionado**. O valor de `.env.example` é só um marcador.

## Testes

```bash
# Backend (em backend/, ambiente virtual ativo)
pytest                        # todos (os de integração exigem o PostgreSQL no ar)
pytest -m "not integration"   # sem banco
ruff check . && ruff format --check . && mypy

# Frontend (em frontend/)
npm run lint && npm run format:check && npm run typecheck
npm test                      # Vitest + React Testing Library
npm run build
npm run test:e2e              # Playwright; exige backend e banco no ar
```

Os testes E2E criam registros "E2E ..." e não os apagam: rode-os apenas em banco de desenvolvimento.

### Resultados registrados (e onde foram obtidos)

| Verificação | Resultado | Ambiente |
|---|---|---|
| Backend, `pytest` completo | 298 passaram | Linux do executor, PostgreSQL 16.15 local |
| Backend, sem banco | 165 passaram | Linux do executor e Windows do responsável |
| Frontend, Vitest | 137 passaram | Linux do executor |
| E2E Playwright | 60 passaram, 2 pulados | Linux do executor, Chromium, API e PostgreSQL locais |

Esses números **não** foram reproduzidos em outros ambientes. Cobertura de código não foi medida. Detalhes por fase: `docs/sprints/`.

## Limitações conhecidas

- **Docker e `postgres:16-alpine`** nunca foram exercitados (`docker compose up` não foi executado); os testes de integração usaram um PostgreSQL 16.15 instalado localmente.
- **Frontend no Windows** não foi executado (a máquina do responsável não permite instalar Node.js nem Docker).
- **Navegadores:** só Chromium (desktop e emulação de celular). Firefox, Safari e aparelhos reais não foram testados.
- **Acessibilidade:** verificações básicas por teste; sem auditoria com leitor de tela, axe ou Lighthouse.
- **Dependências:** `npm audit` sem vulnerabilidades na data da consolidação; `pip-audit` não foi executado.
- Sem paginação nas listagens, sem autenticação, sem edição ou exclusão de histórias.
- Decisões de interface tomadas onde as Issues eram omissas aguardam validação (lista no ADR-002, seção 11).

## Documentação

| Documento | Conteúdo |
|---|---|
| `docs/ambiente-local.md` | Execução local passo a passo e solução de problemas |
| `docs/adr/ADR-002-versoes-dependencias-convencoes.md` | Versões, convenções e decisões técnicas |
| `docs/sprints/sprint-01-fase-{0..4}-evidencias.md` | Evidências observadas em cada fase |
| `docs/sprints/sprint-01-review.md` | Review da Sprint 01 e mapa dos critérios de aceitação |
| `docs/sprints/sprint-01-retrospectiva.md` | Retrospectiva |
| `docs/sprints/sprint-01-checklist-encerramento.md` | Checklist de encerramento |
| `docs/sprints/sprint-01-pendencias-homologacao.md` | Pendências de homologação |
| `docs/sprints/sprint-01-seguranca-publicacao.md` | Verificação de arquivos sensíveis |
| `docs/sprints/sprint-01-proposta-commits.md` | Proposta de commits (não executada) |

## Licença

Licença ainda não definida. O repositório é público, mas isso não significa que seu código esteja liberado para reutilização por terceiros
