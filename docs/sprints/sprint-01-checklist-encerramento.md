# Sprint 01 — Checklist de encerramento (Definition of Done)

## Aviso sobre a fonte da DoD

O texto **oficial** da Definition of Done não estava disponível nesta consolidação: o registro da Fase 0 cita `docs/05-qualidade-e-testes.md`, mas esse arquivo **não faz parte do ZIP**, e a Issue #2 não contém checklist de DoD (a Issue #1 não foi relida). Os registros das Fases 1 e 2 dizem apenas que a DoD exige validação do responsável e execução no ambiente oficial (Docker, máquina do responsável).

Por isso, **os itens abaixo foram derivados do que os documentos do projeto exigem e do que a consolidação pediu verificar; não são a DoD oficial transcrita.** O responsável deve confrontar esta lista com o documento oficial e acrescentar o que faltar. Nenhum item foi inventado como se viesse de uma fonte que não foi lida.

**Status:** `Comprovado` = há evidência registrada (o ambiente vem na coluna ao lado) · `Pendente` = não comprovado ou depende de terceiros · `Não aplicável` = fora do escopo da Sprint 01.

Ambientes: **Linux/Claude** = Ubuntu 24.04 do executor, PostgreSQL 16.15 local, Chromium 141. **Windows/usuário** = máquina do responsável, sem Node nem Docker.

## 1. Requisitos e critérios de aceitação

| # | Item | Status | Ambiente | Evidência / observação |
|---|---|---|---|---|
| 1.1 | US-01 AC01–AC07 com teste automatizado de backend e de frontend | Comprovado | Linux/Claude | `sprint-01-review.md` §3 |
| 1.2 | US-02 AC01–AC09 com teste automatizado de backend e de frontend | Comprovado | Linux/Claude | `sprint-01-review.md` §4; `sprint-01-fase-4-evidencias.md` |
| 1.3 | AC verificados em navegador real contra API e banco reais | Comprovado | Linux/Claude | 60 E2E aprovados, 2 pulados (teclado no mobile) |
| 1.4 | Critérios de aceitação das Issues não alterados | Comprovado | — | Declarado em todas as fases; o texto das Issues não foi reescrito |
| 1.5 | Aceite do responsável sobre cada Issue (#1 e #2) | Pendente | — | Depende de homologação; **Issues não marcadas como Done** |
| 1.6 | Decisões de interface/negócio omissas nas Issues validadas | Pendente | — | Lista em `sprint-01-review.md` §5 |

## 2. Qualidade de código

| # | Item | Status | Ambiente | Evidência / observação |
|---|---|---|---|---|
| 2.1 | Backend: ruff, ruff format e mypy (strict) limpos | Comprovado | Linux/Claude | 54 arquivos |
| 2.2 | Frontend: ESLint, Prettier e TypeScript estrito limpos | Comprovado | Linux/Claude | Fase 4 |
| 2.3 | Build de produção do frontend conclui | Comprovado | Linux/Claude | Fase 4 |
| 2.4 | Lint/tipos do backend no Windows | Pendente | Windows/usuário | Não informado pelo responsável |
| 2.5 | Lint, tipos e build do frontend no Windows | Pendente | Windows/usuário | Sem Node na máquina |
| 2.6 | Revisão de código por outra pessoa | Pendente | — | Aguarda revisão do ChatGPT e do responsável |

## 3. Testes

| # | Item | Status | Ambiente | Evidência / observação |
|---|---|---|---|---|
| 3.1 | Backend sem banco (`-m "not integration"`) | Comprovado | Linux/Claude e Windows/usuário | 165 passaram nos dois (Windows: confirmado pelo responsável) |
| 3.2 | Backend com PostgreSQL (integração) | Comprovado | Linux/Claude | 133 passaram (total 298); PostgreSQL local 16.15 |
| 3.3 | Backend com PostgreSQL no Windows/Docker | Pendente | Windows/usuário | Docker indisponível |
| 3.4 | Frontend: Vitest | Comprovado | Linux/Claude | 137 passaram, 8 arquivos |
| 3.5 | Frontend: Vitest no Windows | Pendente | Windows/usuário | Sem Node |
| 3.6 | E2E Playwright com API e PostgreSQL reais | Comprovado | Linux/Claude | 60 passaram, 2 pulados, 0 falhas; desktop e emulação Pixel 7 |
| 3.7 | Regressão da US-01 após a US-02 | Comprovado | Linux/Claude | Testes da US-01 reexecutados na Fase 4; 1 expectativa ajustada (ver review §6) |
| 3.8 | Testes de erro de rede, 404, 422, 500, falso sucesso e isolamento | Comprovado | Linux/Claude | Vitest e E2E |
| 3.9 | Sanidade por mutação | Comprovado | Linux/Claude | Backend 5; frontend 5 (Fase 2) e 12 (Fase 4) |
| 3.10 | Cobertura de código medida | Pendente | — | Nunca medida; nenhum percentual existe |
| 3.11 | Testes de carga/volume | Pendente | — | Não executados; sem paginação (ADR-002) |

## 4. Banco de dados

| # | Item | Status | Ambiente | Evidência / observação |
|---|---|---|---|---|
| 4.1 | Migrações `upgrade`/`downgrade`/`check` (0001–0003) | Comprovado | Linux/Claude | Fases 0, 1 e 3; `test_migrations.py` |
| 4.2 | Restrições no banco (CHECK, FK, índices) exercitadas | Comprovado | Linux/Claude | `test_stories_model.py`, `test_projects_model.py` |
| 4.3 | Persistência após reiniciar o servidor | Comprovado | Linux/Claude | `fase-1-endpoints.txt` (15) |
| 4.4 | Imagem `postgres:16-alpine` via `docker compose up` | Pendente | — | Docker nunca disponível; só `docker compose config` na Fase 0 |

## 5. Segurança

| # | Item | Status | Ambiente | Evidência / observação |
|---|---|---|---|---|
| 5.1 | Nenhum segredo, `.env`, banco local ou artefato nos arquivos versionáveis | Comprovado | Linux/Claude | `sprint-01-seguranca-publicacao.md` |
| 5.2 | Erros 500 sem vazar detalhes internos | Comprovado | Linux/Claude | Testes de falha de banco (projetos e histórias) |
| 5.3 | Senha do banco não aparece em `repr` | Comprovado | Linux/Claude | `test_config.py` |
| 5.4 | Banco exposto só em 127.0.0.1 no Compose | Comprovado | — | `docker-compose.yml` (leitura; Compose não executado) |
| 5.5 | CORS restrito às origens configuradas | Comprovado | Linux/Claude | `test_cors.py` |
| 5.6 | Vulnerabilidades conhecidas em dependências do frontend | Comprovado | Linux/Claude | `npm audit`: 0 vulnerabilidades (consolidação) |
| 5.7 | Vulnerabilidades conhecidas em dependências do backend | Pendente | — | `pip check` limpo, mas `pip-audit` não instalado/executado |
| 5.8 | Autenticação e autorização | Não aplicável | — | Fora do escopo da Sprint 01 (restrição explícita) |

## 6. Acessibilidade e compatibilidade

| # | Item | Status | Ambiente | Evidência / observação |
|---|---|---|---|---|
| 6.1 | Acessibilidade básica verificada por teste (rótulos, `aria-*`, foco, teclado) | Comprovado | Linux/Claude | Vitest/RTL e E2E desktop |
| 6.2 | Auditoria com leitor de tela | Pendente | — | Não realizada |
| 6.3 | Auditoria automática (axe/Lighthouse), contraste, zoom 200% | Pendente | — | Não realizada |
| 6.4 | Layout responsivo (desktop e mobile) | Comprovado | Linux/Claude | Capturas e E2E; Chromium e emulação Pixel 7 |
| 6.5 | Firefox, Safari/WebKit e dispositivo móvel real | Pendente | — | Não testados |

## 7. Documentação

| # | Item | Status | Ambiente | Evidência / observação |
|---|---|---|---|---|
| 7.1 | Registro de evidências por fase | Comprovado | — | `sprint-01-fase-{0..4}-evidencias.md` |
| 7.2 | ADR de versões, convenções e decisões | Comprovado | — | `ADR-002` (seções 1–11) |
| 7.3 | Guia de ambiente local | Comprovado | — | `docs/ambiente-local.md` |
| 7.4 | README do projeto | Comprovado | — | `README.md` (criado na consolidação; **não revisado pelo responsável**) |
| 7.5 | Review, retrospectiva, checklist, pendências | Comprovado | — | Este conjunto; a retrospectiva tem campos do responsável em branco |
| 7.6 | Retrospectiva preenchida pelo responsável | Pendente | — | `sprint-01-retrospectiva.md` §6 |

## 8. Publicação e processo

| # | Item | Status | Ambiente | Evidência / observação |
|---|---|---|---|---|
| 8.1 | Repositório Git inicializado com histórico | Pendente | — | Pasta fora de repositório; proposta em `sprint-01-proposta-commits.md` |
| 8.2 | Publicação no GitHub | Pendente | — | **Não autorizada**; nada publicado |
| 8.3 | Revisão do ChatGPT | Pendente | — | Aguardada |
| 8.4 | Homologação completa | Pendente | — | **Não declarada** |
| 8.5 | Integração contínua (CI) | Pendente | — | Não existe pipeline; confirmar se a DoD oficial exige |
| 8.6 | Issues #1 e #2 movidas para Done | Pendente | — | **Não feito**, por instrução |

## 9. Escopo excluído da Sprint 01

| # | Item | Status |
|---|---|---|
| 9.1 | Edição e exclusão de histórias | Não aplicável (a Issue #2 não exige) |
| 9.2 | Kanban, sprints no produto | Não aplicável |
| 9.3 | Sprint 02 | Não aplicável (não iniciada) |

## Totais

Contagem dos itens das seções 1 a 8, por status: **Comprovado 30 · Pendente 21 · Não aplicável 1** (a seção 9 não entra na conta). Esta contagem descreve apenas esta lista, derivada e incompleta em relação à DoD oficial; **não é um percentual de conclusão**.
