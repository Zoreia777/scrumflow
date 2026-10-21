# Product Backlog — versão inicial

**Status:** estimativas propostas; sujeito a refinamento. **Escala:** story points relativos, não horas.

| ID | História | Prioridade | Pontos | Sprint candidata |
|---|---|---|---:|---|
| US-01 | Criar e editar projeto | Alta | 3 | 1 |
| US-02 | Cadastrar histórias de usuário | Alta | 5 | 1 |
| US-03 | Priorizar histórias no backlog | Alta | 3 | 2+ |
| US-04 | Criar e iniciar sprint | Alta | 5 | 2+ |
| US-05 | Associar histórias à sprint | Alta | 3 | 2+ |
| US-06 | Mover histórias no quadro de fluxo | Alta | 5 | 2+ |
| US-07 | Visualizar progresso da sprint | Média | 3 | 2+ |
| US-08 | Consultar histórico de sprints | Média | 3 | Futuro |
| US-09 | Filtrar histórias por status | Média | 2 | Futuro |
| US-10 | Exportar relatório | Baixa | 5 | Futuro |

**Total indicativo:** 37 pontos. Não interpretar como compromisso de entrega.

## US-01 — Criar e editar projeto
**Como** usuário individual, **quero** criar e editar um projeto, **para** organizar histórias em um contexto identificado.

### Critérios de aceitação
- **AC01:** Dado que estou na lista de projetos, quando informo nome válido (1–100 caracteres após remoção de espaços nas extremidades) e descrição opcional (até 1000 caracteres) e salvo, então o projeto é persistido e aparece na lista.
- **AC02:** Dado nome vazio ou apenas espaços, quando tento salvar, então a operação é rejeitada, com mensagem clara, e nenhum projeto é criado.
- **AC03:** Dado nome acima de 100 caracteres ou descrição acima de 1000, quando tento salvar, então a validação impede a operação e informa o limite.
- **AC04:** Dado um projeto existente, quando altero seu nome ou descrição com valores válidos, então os dados atualizados são persistidos e exibidos após recarregar a página.
- **AC05:** Dado um projeto existente, quando abro seus detalhes, então vejo seu identificador, nome, descrição e data de criação.
- **AC06:** Dado falha de comunicação com a API, quando tento salvar, então recebo mensagem de erro sem indicação falsa de sucesso.
- **AC07:** Dado uma requisição inválida à API, então o backend responde com erro de validação apropriado e não persiste registros inválidos.

### Fora da US-01
Exclusão, arquivamento, permissões, compartilhamento e busca avançada.

## US-02 — Cadastrar histórias de usuário
**Como** usuário individual, **quero** cadastrar histórias vinculadas a um projeto, **para** registrar necessidades e planejar entregas.

### Critérios de aceitação
- **AC01:** Dado um projeto existente, quando cadastro história com título (1–150 caracteres), descrição opcional (até 2000), prioridade (`Alta`, `Média`, `Baixa`) e pelo menos um critério de aceitação não vazio, então ela é persistida e exibida no backlog do projeto.
- **AC02:** Dado título vazio ou composto por espaços, quando salvo, então a criação é rejeitada e uma mensagem identifica o campo.
- **AC03:** Dado ausência de critério de aceitação válido, quando salvo, então a criação é rejeitada.
- **AC04:** Dado uma prioridade fora dos valores permitidos, quando a API recebe a requisição, então rejeita o valor inválido.
- **AC05:** Dado um projeto inexistente, quando tento cadastrar uma história para ele, então a API responde `404` e não cria o item.
- **AC06:** Dado que duas histórias possuem títulos iguais no mesmo projeto, quando são cadastradas com dados válidos, então ambas podem existir com identificadores distintos.
- **AC07:** Dado que criei uma história, quando recarrego a página do backlog, então a história permanece visível com título, prioridade e critérios.
- **AC08:** Dado uma história de outro projeto, quando abro o backlog atual, então ela não aparece nele.
- **AC09:** Dado falha de persistência, quando tento cadastrar, então não é exibida confirmação de sucesso e não surge item fantasma na interface.

### Fora da US-02
Edição, exclusão, associação a sprint e ordenação manual; serão detalhadas em histórias posteriores ou refinamento explícito.

## Critérios iniciais para demais histórias (a refinar antes da implementação)
- **US-03:** ordem estável após atualização e recarregamento; histórias de outro projeto não afetadas.
- **US-04:** datas coerentes, objetivo definido, uma única sprint ativa por projeto.
- **US-05:** história e sprint do mesmo projeto; não permitir associação simultânea a duas sprints.
- **US-06:** somente estados válidos; mudanças persistidas; progresso coerente.
- **US-07:** total, concluídos e percentual corretos inclusive sprint vazia.
- **US-08:** sprints encerradas listadas com período e estado.
- **US-09:** filtro respeita o projeto e os estados permitidos.
- **US-10:** exportação legível, dados coerentes e nenhuma informação de outro projeto.

## Refinamento
Antes de cada sprint: esclarecer regras, dividir histórias grandes, revisar estimativas e registrar decisões em Issue/PR. Critérios não refinados não autorizam implementação.
