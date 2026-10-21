# Executando o ScrumFlow localmente (Visual Studio Code)

Guia de ambiente: banco no Docker; backend e frontend rodando na sua máquina. Os comandos aparecem para **Windows (PowerShell)** e para **macOS/Linux (bash)**.

> Estado (fim da Sprint 01): existem a API e as telas de projetos (US-01) e de histórias de usuário (US-02). Não há autenticação, Kanban nem sprints no produto. As seções 4 e 5 (Docker) **não foram validadas** pelo executor: o Docker nunca esteve disponível nos ambientes usados (ver `docs/sprints/sprint-01-pendencias-homologacao.md`).

## 1. Pré-requisitos

| Ferramenta | Versão | Como conferir |
|---|---|---|
| Visual Studio Code | recente | — |
| Git | qualquer recente | `git --version` |
| Docker Desktop (com Compose v2) | recente | `docker --version` e `docker compose version` |
| Python | **3.12** | Windows: `py -3.12 --version` · macOS/Linux: `python3.12 --version` |
| Node.js | **22.13 ou superior (LTS 22)** | `node --version` |

Mantenha o Docker Desktop **aberto e em execução** antes de subir o banco.

## 2. Abrir o projeto no VS Code

1. `Arquivo > Abrir Pasta…` e escolha a pasta raiz `scrumflow` (a que contém `docker-compose.yml`, `backend/` e `frontend/`).
2. Quando o VS Code oferecer **"Instalar extensões recomendadas"**, aceite (Python, Pylance, Ruff, ESLint, Prettier, Playwright, Docker, EditorConfig).
3. Abra um terminal integrado: `Terminal > Novo Terminal`.

## 3. Configuração (uma vez)

Na raiz do projeto:

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
```

```bash
# macOS / Linux
cp .env.example .env
cp frontend/.env.example frontend/.env
```

O arquivo `.env` não é versionado. Pode mantê-lo como está para uso local. Se quiser, troque `POSTGRES_PASSWORD` **antes** de criar o banco pela primeira vez (veja a seção 9).

## 4. Banco de dados (PostgreSQL 16 no Docker)

Na raiz do projeto:

```bash
docker compose up -d db --wait
docker compose ps
```

O serviço `db` deve aparecer como `healthy`. O banco fica acessível apenas em `127.0.0.1:5433` (não na rede). O banco de testes (`scrumflow_test`) é criado automaticamente pelos testes.

Para parar: `docker compose down` (os dados são mantidos no volume).

## 5. Backend (FastAPI)

Em `backend/`:

```powershell
# Windows (PowerShell)
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

```bash
# macOS / Linux
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Se o PowerShell bloquear o script de ativação, execute uma vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Conferindo:

- <http://localhost:8000/api/v1/health> deve responder `{"status":"ok","database":"ok"}`.
- <http://localhost:8000/docs> mostra a documentação OpenAPI.

### Selecionar o interpretador no VS Code

`Ctrl+Shift+P` (macOS: `Cmd+Shift+P`) → **Python: Select Interpreter** → escolha o que está em `backend/.venv`.

## 6. Frontend (React + TypeScript + Vite)

Em um **segundo terminal**, a partir da raiz:

```bash
cd frontend
npm install
npm run dev
```

Abra <http://localhost:5173>. Deve aparecer a listagem de projetos (com o backend e o banco no ar; sem eles, a tela mostra uma mensagem de erro com o botão "Tentar novamente").

Rotas do frontend: `/projetos` (listagem), `/projetos/novo`, `/projetos/<id>` (detalhes, com a seção "Histórias de usuário") e `/projetos/<id>/editar`. O endereço da API vem de `VITE_API_BASE_URL` (`frontend/.env`, padrão `http://localhost:8000`).

Para os testes E2E, instale uma vez o navegador do Playwright:

```bash
npx playwright install chromium
```

## 7. Testes e verificações

Backend (`backend/`, com o ambiente virtual ativo e o banco no ar):

```bash
pytest                        # todos os testes
pytest -m "not integration"   # apenas os que não precisam de banco
ruff check .                  # lint
ruff format --check .         # formatação
mypy                          # tipos
```

Frontend (`frontend/`):

```bash
npm test                # testes unitários e de componentes (Vitest + React Testing Library)
npm run lint            # ESLint
npm run typecheck       # TypeScript
npm run format:check    # Prettier
npm run build           # build de produção
npm run test:e2e        # Playwright (sobe o servidor de desenvolvimento sozinho)
```

### 7.1 Rodar só os testes unitários no VS Code (sem Docker e sem Node)

Os testes unitários não usam banco de dados nem frontend. Para rodá-los:

1. Garanta que existe o arquivo `.env` na raiz (cópia de `.env.example`). Mesmo nos testes unitários, a variável `POSTGRES_PASSWORD` é obrigatória para a configuração carregar.
2. Em `backend/`, com o ambiente virtual criado e `pip install -r requirements-dev.txt` executado, selecione o interpretador: `Ctrl+Shift+P` > **Python: Select Interpreter** > `backend/.venv`.
3. Pelo terminal: `pytest -m "not integration"`. Pelo VS Code: tarefa **backend: testes (pytest)** ou painel **Testing**.
4. Os testes que dependem do PostgreSQL (marcados como `integration`) só rodam com o banco no ar; sem ele, ficam de fora com essa opção.
5. Resultado esperado após a Fase 3: **165 passed, 133 deselected**. (Fase 1: 88 passed; as 77 a mais são as validações e os erros da US-02, que também não precisam de banco.) Os testes de falha de banco desta suíte apontam para uma porta sem serviço (a conexão falha de verdade), então também funcionam sem PostgreSQL instalado.

No Windows (PowerShell), com o ambiente virtual ativo, em `backend\`: `pytest -m "not integration"`. A variável de ambiente `POSTGRES_PASSWORD` (ou o `.env` na raiz) precisa existir, mas o banco não precisa estar rodando.

### 7.2 Testes E2E (Playwright) contra a API real

Os testes de `frontend/e2e/` (`projects.spec.ts` para a US-01 e `stories.spec.ts` para a US-02) usam o navegador, o backend e o PostgreSQL reais (só as falhas de comunicação do AC06 são provocadas no navegador). Antes de rodar:

1. Banco no ar e migrações aplicadas (`alembic upgrade head`).
2. Backend no ar em <http://localhost:8000> (`uvicorn app.main:app`).
3. Em `frontend/`: `npx playwright install chromium` (uma vez) e `npm run test:e2e`. O Vite sobe sozinho.

Opcionais: `E2E_API_URL` (padrão `http://localhost:8000`) e `E2E_CHROMIUM_PATH` (usa um Chromium já instalado em vez do baixado pelo Playwright). Os testes criam projetos e histórias com nomes que começam por "E2E" e **não apagam** esses registros: use um banco de desenvolvimento, não um com dados reais.

## 8. Atalhos no VS Code

- **Tarefas:** `Terminal > Executar Tarefa…` lista "db: subir PostgreSQL", "backend: servidor (uvicorn)", "frontend: servidor (vite)", "backend: testes (pytest)", "frontend: testes (vitest)", entre outras (arquivo `.vscode/tasks.json`). As tarefas do backend esperam o ambiente virtual em `backend/.venv`.
- **Testes de Python:** painel **Testing** (ícone de frasco); o pytest já está configurado para `backend/tests`.
- **Playwright:** a extensão recomendada lista e executa os testes de `frontend/e2e`.

## 9. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `required variable POSTGRES_PASSWORD is missing` | Falta o arquivo `.env` na raiz | Copie `.env.example` para `.env` (seção 3) |
| Erro de conexão / `PostgreSQL indisponível` nos testes | Banco parado ou Docker fechado | Abra o Docker Desktop e rode `docker compose up -d db --wait` |
| Porta 5433 já em uso | Outro serviço usa a porta | Mude `POSTGRES_PORT` no `.env` e rode `docker compose up -d db --wait` de novo |
| `password authentication failed` depois de mudar a senha no `.env` | O banco já foi criado com a senha antiga | Volte a senha antiga, ou apague o volume com `docker compose down -v` (**apaga os dados do banco**) e suba de novo |
| Porta 8000 ou 5173 em uso | Outro processo | Encerre o processo; o Vite usa `--strictPort` de propósito |
| Erro de CORS no navegador | Origem do frontend não listada | Inclua a origem em `CORS_ORIGINS` no `.env` e reinicie o backend |
| `npm install` avisa sobre versão do Node | Node abaixo de 22.13 | Atualize para o Node 22 LTS |

## 10. Estrutura de pastas

```
scrumflow/
├── .env.example               # modelo de configuração (copie para .env)
├── docker-compose.yml         # PostgreSQL 16
├── .vscode/                   # extensões, configurações e tarefas
├── backend/
│   ├── app/
│   │   ├── main.py            # criação do app e CORS
│   │   ├── core/              # configuração e conexão com o banco
│   │   ├── api/v1/            # rotas (health, projetos e histórias)
│   │   ├── models/            # SQLAlchemy (Base, Project, Story)
│   │   ├── schemas/  services/  # validação (Pydantic) e regras de projetos e histórias
│   │   ├── repositories/      # reservado para fases futuras
│   ├── alembic/               # migrações (0001 baseline, 0002 projects, 0003 stories)
│   ├── tests/{unit,integration}/
│   ├── pyproject.toml  requirements*.txt
├── frontend/
│   ├── src/                   # App, router, api/, pages/, components/, hooks/, validation/, types/
│   ├── e2e/                   # testes Playwright
│   └── package.json  vite.config.ts  playwright.config.ts
└── docs/                      # documentação do projeto
```
