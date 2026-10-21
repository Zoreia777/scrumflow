# Sprint 01 — Pendências de homologação

Resumo do que **ainda não foi validado**. Nenhum item abaixo foi dado como resolvido. Itens sem responsável definido aguardam decisão do responsável do projeto.

## 1. Ambiente oficial

| # | Pendência | O que já existe | O que falta | Dependência |
|---|---|---|---|---|
| P1 | **Docker / Compose** | `docker-compose.yml` validado apenas sintaticamente (`docker compose config`, Fase 0) | `docker compose up -d db --wait`, health `healthy`, e a suíte completa contra a imagem `postgres:16-alpine` | Máquina com Docker (a máquina corporativa do responsável não permite instalar) |
| P2 | **Suíte completa em ambiente oficial** | 298 testes no Linux do executor, com PostgreSQL 16.15 instalado localmente | Reexecutar `pytest` completo, Vitest e E2E no ambiente oficial e comparar | Docker e Node.js |
| P3 | **Frontend no Windows do responsável** | Nada executado lá | Lint, tipos, Vitest, build e E2E | Node.js 22.13+ (não instalável na máquina atual) |
| P4 | **Backend de integração no Windows** | 165 testes sem banco aprovados (confirmado pelo responsável) | Os 133 testes de integração | Docker ou PostgreSQL |
| P5 | Lint/tipos do backend no Windows | Verde no Linux | Rodar `ruff` e `mypy` no Windows | — |
| P6 | Guia `ambiente-local.md` seguido de ponta a ponta | Escrito e revisado; passos de Docker nunca executados | Executar o guia do zero em uma máquina limpa | P1 |

## 2. Acessibilidade

| # | Pendência | Observação |
|---|---|---|
| P7 | Auditoria com leitor de tela (NVDA, VoiceOver) | Só há verificação por teste de rótulos, `aria-*`, foco e teclado |
| P8 | Auditoria automática (axe, Lighthouse) | Não executada |
| P9 | Contraste de cores e zoom de 200% | Não verificados |

## 3. Navegadores e dispositivos

| # | Pendência | Observação |
|---|---|---|
| P10 | Firefox e Safari/WebKit | Só Chromium 141 |
| P11 | Dispositivo móvel real | Só emulação Pixel 7 |
| P12 | Testes de teclado no perfil mobile | 2 cenários pulados de propósito nos E2E |

## 4. Qualidade e segurança

| # | Pendência | Observação |
|---|---|---|
| P13 | Cobertura de código | Nunca medida; nenhuma meta definida |
| P14 | `pip-audit` | Não executado (`npm audit` e `pip check` limpos) |
| P15 | Volume/paginação | Sem paginação; comportamento com muitas histórias não avaliado |
| P16 | CI | Não existe pipeline; confirmar se é exigido |
| P17 | E2E que sujam o banco | Criam registros "E2E ..." e não os apagam |

## 5. Decisão e aceite do responsável

| # | Pendência |
|---|---|
| P18 | Confrontar `sprint-01-checklist-encerramento.md` com a DoD oficial (`docs/05-qualidade-e-testes.md`, que não faz parte do ZIP) |
| P19 | Validar as decisões de interface/negócio omissas nas Issues (`sprint-01-review.md` §5; ADR-002, seções 10 e 11) |
| P20 | Aceite da US-01 e da US-02 (as Issues **não** foram marcadas como Done) |
| P21 | Revisão do ChatGPT desta consolidação |
| P22 | Preencher a seção 6 da retrospectiva |
| P23 | Decidir quando e como criar o repositório Git e publicar (proposta em `sprint-01-proposta-commits.md`), incluindo licença |

## 6. Ordem sugerida (sujeita ao responsável)

1. Aprovar ou ajustar esta consolidação (P18, P21).
2. Obter uma máquina com Docker e Node.js e executar P1 a P6; registrar os resultados em um novo documento de evidências, sem sobrescrever os atuais.
3. Auditoria de acessibilidade e navegadores adicionais (P7 a P11).
4. Aceite das Issues (P19, P20) e só então a publicação (P23).
