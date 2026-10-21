# ADR-001 — Stack e estilo arquitetural

**Estado:** aceita para planejamento | **Data:** 2026-10-21

## Contexto
O projeto deve demonstrar gestão ágil, frontend, API, persistência relacional e qualidade de software, mantendo complexidade compatível com desenvolvimento individual.

## Decisão
Adotar React + TypeScript + Vite no frontend, FastAPI + Pydantic no backend e PostgreSQL com SQLAlchemy/Alembic. Usar API REST JSON e arquitetura modular, sem microserviços.

## Alternativas consideradas
- Streamlit + SQLite: menor custo de entrada, porém menor profundidade full-stack.
- Django + PostgreSQL: estrutura integrada, mas menos separação explícita entre frontend React e API.

## Consequências
**Positivas:** portfólio full-stack, separação de responsabilidades, documentação OpenAPI, banco relacional robusto.
**Negativas:** mais configuração, integração e testes entre camadas.

## Revisão
Revisitar se a complexidade impedir a entrega de incrementos funcionais.
