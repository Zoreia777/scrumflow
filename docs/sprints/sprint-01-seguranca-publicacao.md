# Sprint 01 — Verificação de segurança antes da publicação

Resultado de uma varredura feita em 2026-10-21 (UTC), no ambiente Linux do executor. Método: cópia da pasta em um diretório temporário, `git init` + `git add -A` (respeitando o `.gitignore`) e inspeção dos arquivos que **seriam versionados**. Nada foi publicado e nenhum repositório foi criado dentro do projeto.

## Resultado

| Verificação | Resultado |
|---|---|
| `.env` na raiz | Existe no disco do executor e **é ignorado pelo Git** (não seria versionado). Seus valores são idênticos aos de `.env.example` (marcador `troque-esta-senha`, sem credencial real). Não está em nenhum dos 5 ZIPs entregues |
| `frontend/.env` | Não existe; só `frontend/.env.example` (endereço público da API local) |
| Segredos nos arquivos versionáveis | Busca por `password`, `secret`, `token`, `api key`, chaves privadas, `AKIA…`, `ghp_…`, `sk-…` e URLs com usuário e senha: **nenhuma credencial real**. Ocorrências são: o marcador do `.env.example`; leitura de configuração (`config.py`, `env.py`); e valores **fictícios** de teste (`SEGREDO-INTERNO host=10.0.0.5 password=abc123`, `p@ss:word/1`), usados para provar que o erro 500 não vaza detalhes e que a senha não aparece em `repr` |
| Bancos locais, dumps, logs, PIDs, chaves | Nenhum arquivo `*.db`, `*.sqlite*`, `*.dump`, `*.log`, `*.pid`, `*.pem`, `*.key` no projeto. O PostgreSQL de teste do executor fica fora da pasta |
| Dados no banco de desenvolvimento | Tabelas `stories` e `projects` esvaziadas antes do ZIP da Fase 4; o ZIP não contém dados de banco |
| `.venv`, `node_modules`, `__pycache__`, caches, `dist`, `test-results`, `playwright-report` | Existem no disco do executor, mas são **ignorados pelo Git** e **excluídos dos ZIPs** (0 ocorrências em cada um dos 5 ZIPs) |
| Caminhos absolutos do executor (`/home/claude`, `/root`) em arquivos versionáveis | Nenhum (busca por `/home/claude`, `/root/` e `C:\Users`, inclusive em `docs/`) |
| Arquivo maior versionável | Capturas de tela, no máximo cerca de 370 kB cada |
| `npm audit` | 0 vulnerabilidades (dependências de produção e desenvolvimento) |
| `pip check` | Sem requisitos quebrados |
| `pip-audit` | **Não executado** (ferramenta não instalada) |
| Banco no Compose | Publicado apenas em `127.0.0.1:${POSTGRES_PORT}`; senha obrigatória (o Compose falha sem `POSTGRES_PASSWORD`). **Compose não foi executado** |
| CORS | Restrito às origens de `CORS_ORIGINS` (teste `test_cors.py`) |
| Autenticação | Inexistente, por decisão de escopo da Sprint 01. A API não deve ser exposta fora da máquina local |

## Ajuste feito no `.gitignore` (configuração, não código funcional)

O `.gitignore` já cobria segredos, Python, Node, Playwright e editor. Foram **acrescentados** padrões de reforço: `*.sqlite`, `*.sqlite3`, `*.db`, `*.dump`, `*.log`, `*.pid`, `.coverage`, `htmlcov/`, `.vite/`, `.eslintcache`, `*.zip`, `*.pem`, `*.key`. Depois do ajuste, a simulação mostra 159 arquivos versionáveis (156 antes dos 3 documentos de consolidação) e nenhum item proibido.

`.env.example` permanece versionável por exceção (`!.env.example`), como deve ser.

## Recomendações antes de publicar (não executadas)

1. Conferir o estado do repositório remoto `Zoreia777/scrumflow` (pode já ter README, licença ou histórico) antes do primeiro `push`.
2. Se o repositório for público, **escolher uma licença** (o README registra que não há).
3. Rodar uma ferramenta de varredura de segredos (por exemplo, no GitHub: "secret scanning") depois do primeiro `push`; esta varredura foi por padrões e não substitui isso.
4. Se algum dia uma senha real for colocada no `.env`, ela não deve constar em ZIP, captura de tela nem registro de evidência.
5. Habilitar o Dependabot ou rotina equivalente e executar `pip-audit`.
6. Não expor a API fora da máquina local enquanto não houver autenticação.
