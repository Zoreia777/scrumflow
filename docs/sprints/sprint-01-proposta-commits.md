# Sprint 01 — Proposta de commits (não executada)

**Nenhum commit foi feito, nenhum repositório Git foi criado dentro do projeto e nada foi publicado.** Este documento só propõe uma organização. A pasta atual não é um repositório.

## Limite que precisa ficar claro

Todo o código existe hoje no **estado final** da Sprint 01. Não há histórico real de como cada arquivo evoluiu entre as fases. Por isso os commits abaixo organizam o conteúdo **por camada e assunto**, e não reconstroem o histórico cronológico. Também por isso, **commits intermediários não são garantidos de passar nos testes isoladamente** (por exemplo, `main.py` já registra as rotas de histórias). A rastreabilidade por fase está nos registros `docs/sprints/sprint-01-fase-*-evidencias.md`.

Alternativa: um único commit inicial com a mensagem do commit 1 ampliada. É mais simples e igualmente honesto; escolha do responsável.

## Antes de começar

1. Conferir o estado do remoto `Zoreia777/scrumflow` (já pode ter README, licença ou histórico). Se houver histórico, trabalhar em um branch e abrir pull request.
2. Confirmar que o `.env` **não** está na pasta que será versionada ou que o `.gitignore` o cobre (cobre).
3. Revisar o resultado de `git status` e `git diff --cached --stat` antes de cada commit.

## Sequência proposta (8 commits)

Branch sugerido: `chore/sprint-01-inicial` (ou `main`, se o repositório estiver vazio). Os trailers de atribuição ao final de cada mensagem seguem a configuração desta sessão; o responsável pode removê-los.

```bash
git init -b main          # só se a pasta ainda não for um repositório

# 1 — configuração base
git add .editorconfig .gitattributes .gitignore .nvmrc .python-version .env.example docker-compose.yml .vscode
git commit -m "chore: configuração base do repositório" \
  -m "EditorConfig, EOL, versões de runtime, Docker Compose do PostgreSQL 16 e configurações do VS Code. O .env não é versionado; .env.example traz apenas marcadores."

# 2 — backend (código)
git add backend/alembic.ini backend/pyproject.toml backend/requirements.txt backend/requirements-dev.txt backend/alembic backend/app
git commit -m "feat(backend): API de projetos e histórias de usuário" \
  -m "FastAPI, SQLAlchemy e Alembic (migrações 0001 a 0003). Endpoints de projetos (US-01) e de histórias (US-02), normalização de texto e envelope de erros único."

# 3 — backend (testes)
git add backend/tests
git commit -m "test(backend): suíte unitária e de integração" \
  -m "298 testes registrados no Linux do executor (165 sem banco). Integração exige PostgreSQL."

# 4 — frontend (código e configuração)
git add frontend/.env.example frontend/.prettierignore frontend/.prettierrc frontend/eslint.config.js frontend/index.html \
        frontend/package.json frontend/package-lock.json frontend/playwright.config.ts frontend/tsconfig.json frontend/vite.config.ts \
        frontend/src
git reset -q -- frontend/src/test ':(glob)frontend/src/**/*.test.ts' ':(glob)frontend/src/**/*.test.tsx'
git commit -m "feat(frontend): telas de projetos e histórias de usuário" \
  -m "React 19 + TypeScript + Vite, cliente HTTP tipado, roteador próprio, formulários com validação e seção de histórias na página do projeto."

# 5 — frontend (testes)
git add frontend/src frontend/e2e
git commit -m "test(frontend): Vitest, React Testing Library e Playwright" \
  -m "137 testes Vitest e 31 cenários E2E (62 execuções, 2 puladas) registrados no Linux do executor."

# 6 — documentação técnica e README
git add README.md docs/adr docs/ambiente-local.md
git commit -m "docs: README, ADR-002 e guia de ambiente local"

# 7 — evidências por fase
git add docs/sprints/evidencias docs/sprints/sprint-01-fase-0-evidencias.md docs/sprints/sprint-01-fase-1-evidencias.md \
        docs/sprints/sprint-01-fase-2-evidencias.md docs/sprints/sprint-01-fase-3-evidencias.md docs/sprints/sprint-01-fase-4-evidencias.md
git commit -m "docs(sprint-01): evidências das fases 0 a 4" \
  -m "Registros do que foi observado e do que não foi validado, capturas de tela e saídas de integração."

# 8 — consolidação
git add docs/sprints
git commit -m "docs(sprint-01): review, retrospectiva, checklist e pendências" \
  -m "Sem homologação: Issues #1 e #2 não marcadas como concluídas; pendências de Docker, Windows, acessibilidade e navegadores listadas."
```

Cada mensagem pode terminar com:

```
Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015XCADgD7TzP6CwZo3eSY5t
```

## Depois dos commits (somente com autorização)

1. `git status` limpo e `git ls-files | grep -E '\.env$|node_modules|\.venv'` sem resultado.
2. Tag opcional, por exemplo `sprint-01-revisao` (não `v1.0`, pois não houve homologação).
3. `git push` para um branch e abrir pull request, em vez de empurrar direto para `main`, se o remoto já tiver histórico.
4. **Não** fechar nem mover as Issues #1 e #2 até o aceite do responsável.

## Verificação da proposta

Os comandos foram executados em uma cópia descartável da pasta (fora do projeto, sem `.venv` nem `node_modules`). Resultado observado: 8 commits criados, 163 arquivos versionados (10 + 33 + 26 + 44 + 13 + 3 + 28 + 6), cada arquivo em exatamente um commit e `git status` limpo ao final. **Não** foram rodados lint nem testes em cada commit intermediário.
