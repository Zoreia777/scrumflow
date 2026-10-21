# Sprint 01 — Fase 2 (US-01 Frontend): registro de evidências

Registra **apenas o que foi observado**. Escopo: frontend da US-01 (T2.1 a T2.5). Nada foi publicado no GitHub, a US-02 não foi iniciada, não há autenticação e os critérios da Issue #1 não foram alterados.

**A US-01 não é declarada concluída.** Há evidência de integração e E2E em ambiente de sandbox (abaixo), mas a Definição de Pronto exige validação do responsável do projeto e a execução no ambiente oficial (Docker, máquina do usuário).

## Contexto da execução

- **Data:** 2026-10-21 (UTC). **Commit:** não aplicável (pasta fora de repositório Git).
- **Ambiente:** Ubuntu 24.04, Python 3.12.3, Node 22, Chromium 141 (instalação do ambiente, via `E2E_CHROMIUM_PATH`; não o baixado pelo Playwright 1.64.1).
- **PostgreSQL:** 16.15 local (porta 5433), **não** a imagem Docker `postgres:16-alpine`.

## Entregas

| Tarefa | Entrega |
|---|---|
| T2.1 | Cliente de API tipado (`src/api/client.ts`, `projects.ts`) com erros classificados (rede, tempo esgotado, 422, 404, 500, resposta inesperada); roteador (`src/router.tsx`); tipos e validação (`src/types`, `src/validation`) |
| T2.2 | Listagem e formulário de criação (`pages/ProjectListPage`, `NewProjectPage`, `components/ProjectForm`) |
| T2.3 | Detalhes e edição (`pages/ProjectDetailPage`, `EditProjectPage`) |
| T2.4 | 72 testes Vitest + React Testing Library |
| T2.5 | 14 cenários E2E Playwright x 2 perfis (desktop e mobile) + smoke; execução real; lint, tipos e build |

Decisões: roteador próprio de ~100 linhas (History API) em vez de nova dependência; CSS próprio sem biblioteca visual; nenhuma dependência nova em `package.json`; o limite de caracteres **não** usa `maxLength` do navegador, para o usuário ver contador e mensagem (AC03). O teste placeholder da Fase 0 (`App.test.tsx`, "Fundação técnica") foi removido por ter sido substituído; o `smoke.spec.ts` foi atualizado para a nova página inicial.

## Resultados observados

| Verificação | Resultado |
|---|---|
| `eslint` | sem avisos |
| `prettier --check` | passou |
| `tsc --noEmit` | passou |
| `npm run build` | concluiu (JS 237 kB, 74 kB gzip; CSS 7 kB) |
| Vitest | **72 passaram** em 5 arquivos (Fase 0: 5; novos: 67) |
| Playwright (API e PostgreSQL reais) | **31 passaram, 1 pulado, 0 falhas** (32 execuções: 16 desktop + 16 mobile). O pulado é o teste de teclado, restrito ao desktop |
| Backend (regressão) | `pytest`: **153 passaram** (88 unitários + 65 de integração); `pytest -m "not integration"`: **88 passaram**; ruff, format e mypy sem problemas |
| Sanidade por mutação (frontend) | 5 defeitos injetados (erro engolido, limite do nome removido, sem trim, navegação antes da API, PATCH enviando tudo) foram todos detectados (6, 2, 8, 5 e 2 testes falharam) |

## Cobertura dos critérios de aceitação

| AC | Vitest | E2E (API real) |
|---|---|---|
| AC01 criar e ver na lista | sim | sim, inclusive após recarregar |
| AC02 nome vazio recusado | sim | sim (nenhuma requisição POST enviada) |
| AC03 limites 100/1000 exibidos | sim | sim (101 e 1001 bloqueados; 100 aceito) |
| AC04 editar e persistir | sim | sim, após recarregar |
| AC05 detalhes com id, nome, descrição e data | sim | sim |
| AC06 falha de API sem falso sucesso | sim (rede, 500, 404, 201 inválido) | sim (requisição abortada; 500 na listagem) |
| AC07 requisição inválida recusada pelo backend | sim (422 exibido no campo) | sim (422 direto na API e nada gravado) |

## Evidências visuais

Capturas reais em `docs/sprints/evidencias/`: `fase-2-{desktop,mobile}-{listagem,validacao,detalhes}.png`.

## Acessibilidade básica (verificada por testes)

Rótulos associados aos campos; erros ligados por `aria-describedby` e `aria-invalid`; foco no primeiro campo inválido; alertas com `role="alert"` e estados de carregamento com `role="status"`; um `h1` por página com foco ao navegar; link "Ir para o conteúdo"; navegação com `aria-current`; criação possível só com teclado (E2E desktop); `prefers-reduced-motion` respeitado. **Não houve auditoria com leitor de tela nem ferramenta automática (axe/Lighthouse).**

## Não validado / limitações

- **Máquina do usuário (Windows, sem Node/Docker):** o frontend não pôde ser executado lá; o resultado acima vale para este ambiente Linux.
- **Docker / `postgres:16-alpine`:** não usado.
- **Navegadores:** apenas Chromium (desktop e emulação Pixel 7). Firefox, Safari e dispositivos reais não foram testados.
- **Leitor de tela, contraste automatizado, zoom 200%:** não verificados.
- **Cobertura de código:** não medida.
- **Os E2E deixam registros** "E2E …" no banco de desenvolvimento (não são removidos pelos testes).
- **Concorrência de edição** (dois usuários editando o mesmo projeto): fora do escopo; vale a última gravação.
