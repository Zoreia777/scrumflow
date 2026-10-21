# ScrumFlow

> Plataforma de gestão ágil e inteligência de projetos — projeto individual assistido por IA.

**Estado:** planejamento da Etapa 1. Nenhuma funcionalidade foi implementada ou testada até esta versão.

## Visão geral
O ScrumFlow ajuda profissionais e equipes pequenas a organizar projetos, priorizar histórias, planejar sprints e acompanhar entregas em uma interface acessível.

## Stack definida
- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI + Pydantic
- Persistência: PostgreSQL + SQLAlchemy + Alembic
- Contrato: API REST JSON com OpenAPI
- Testes previstos: pytest, React Testing Library e Playwright (fluxos críticos)

## MVP
Criar/editar projetos; cadastrar/priorizar histórias; criar/iniciar sprints; associar histórias; mover itens em quadro de fluxo; acompanhar progresso básico. Sem autenticação na primeira versão: uso local/demonstração, não adequado para exposição pública com dados sensíveis.

## Documentação
- [Visão do produto](docs/01-visao-produto.md)
- [Escopo do MVP](docs/02-escopo-mvp.md)
- [Product Backlog e critérios de aceitação](docs/03-product-backlog.md)
- [Arquitetura](docs/04-arquitetura.md)
- [Qualidade e testes](docs/05-qualidade-e-testes.md)
- [Colaboração e governança](docs/06-colaboracao-ia.md)
- [Riscos e decisões pendentes](docs/07-riscos-e-decisoes.md)
- [Sprint 01 — planejamento](docs/sprints/sprint-01-planejamento.md)
- [ADR-001 — stack e arquitetura](docs/adr/ADR-001-stack.md)

## Gestão de trabalho
Issues por história (`US-xx`), pull requests vinculados, mudanças documentadas e evidências reais após execução. Estimativas iniciais são hipóteses, não velocidade comprovada.

## Próximos passos
1. Revisar e aprovar os documentos.
2. Criar o repositório e publicar a documentação.
3. Criar Issues para US-01 e US-02.
4. Só então autorizar a implementação da Sprint 1.

## Transparência
Este projeto é desenvolvido por uma pessoa com apoio de ChatGPT (planejamento e revisão) e Claude (implementação). As práticas de Scrum são adaptadas ao contexto individual; não há alegação de equipe Scrum formal ou cerimônias que não ocorreram.
