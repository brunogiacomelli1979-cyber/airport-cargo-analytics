# Airport Cargo Operations Analytics

Projeto de análise de dados aplicado à logística aeroportuária de cargas de importação, com foco em KPIs operacionais, conformidade regulatória, gargalos, qualidade da informação e responsabilidade dos atrasos.

## Visão Geral

Este projeto simula um cenário operacional de um terminal de cargas de importação em um aeroporto internacional brasileiro.

O objetivo é analisar a jornada da carga desde a chegada da aeronave até a entrega/retirada, considerando etapas como recebimento físico, registro no sistema do depositário, armazenagem, conferência, tratamento de inconsistências, encerramento no Siscomex/Mantra, liberação aduaneira, anuências externas e disponibilização da carga.

A proposta principal é diferenciar o tempo total da carga no terminal dos tempos efetivamente controláveis pelo fiel depositário.

## Problema de Negócio

Em operações aeroportuárias de importação, o tempo total da carga no terminal pode ser influenciado por diferentes agentes e etapas do processo.

Nem todo atraso está sob responsabilidade direta do aeroporto. Gargalos podem ser causados por inconsistências de manifesto informadas pela companhia aérea, divergências de peso ou volumes, necessidade de retrabalho, pendências de Receita Federal, órgãos anuentes, importadores, despachantes ou transportadoras.

Este projeto busca criar uma visão analítica capaz de medir a performance operacional de forma mais justa, separando gargalos internos, externos, regulatórios e documentais.

## Objetivos do Projeto

* Medir os principais tempos operacionais da carga aérea de importação
* Analisar o tempo até o encerramento no Siscomex/Mantra
* Identificar gargalos entre recebimento no sistema do depositário e encerramento no Siscomex/Mantra
* Monitorar conformidade com prazo regulatório
* Avaliar inconsistências de manifesto, divergências, DSIC, avarias e retrabalhos
* Verificar conformidade de armazenagem conforme a natureza declarada da carga
* Diferenciar atrasos controláveis e não controláveis pelo aeroporto
* Criar indicadores e visualizações em Power BI para apoio à decisão operacional

## Escopo

O projeto considera as seguintes etapas:

1. Chegada da aeronave
2. Recebimento físico da carga
3. Registro/armazenagem no sistema do depositário
4. Direcionamento da carga para área adequada
5. Conferência e conciliação
6. Tratamento de inconsistências
7. Retrabalho operacional, quando aplicável
8. Encerramento no Siscomex/Mantra
9. Liberação pela Receita Federal ou órgãos anuentes
10. Disponibilização e entrega/retirada da carga

## Premissas

* O cenário representa um aeroporto internacional brasileiro genérico
* O sistema oficial de referência do projeto é o Siscomex/Mantra
* Os dados utilizados são simulados e criados apenas para fins educacionais e de portfólio
* Nenhum dado real, sigiloso ou operacional de empresas, aeroportos, companhias aéreas, importadores ou órgãos públicos é utilizado
* O projeto não aborda cálculo tarifário de armazenagem ou capatazia
* O projeto não detalha documentos como DI, DUIMP ou CCT
* O foco é análise de dados, BI operacional, SQL e Power BI

## Metodologia

O projeto segue as etapas do processo de análise de dados apresentado no Google Data Analytics Professional Certificate:

* Ask
* Prepare
* Process
* Analyze
* Share
* Act

Essas etapas foram adaptadas para um contexto de BI operacional aplicado à logística aeroportuária de cargas de importação.

## Ferramentas Utilizadas

* Excel
* Power Query
* Power BI
* DAX
* SQL
* MySQL
* DBeaver
* GitHub
* Markdown
* Mermaid

## Principais KPIs

* Total de voos
* Total de cargas/AWBs
* Total de volumes
* Peso total movimentado
* Tempo até recebimento no sistema do depositário
* Tempo entre recebimento no depositário e encerramento no Siscomex/Mantra
* Tempo total até encerramento no Siscomex/Mantra
* Percentual de encerramentos dentro do prazo regulatório
* Percentual de voos com inconsistências
* Taxa de erro de manifesto
* Taxa de retrabalho operacional
* Tempo médio de retrabalho
* Cargo dwell time total
* Cargo dwell time operacional limpo
* Percentual de atrasos por grupo responsável
* Percentual de atrasos controláveis pelo aeroporto
* Taxa de conformidade de armazenagem

## Estrutura do Repositório

```text
airport-cargo-analytics/
│
├── README.md
│
├── data/
│   ├── raw/
│   │   └── airport_cargo_operations_sample.xlsx
│   │
│   └── processed/
│       └── csv/
│           ├── flights.csv
│           ├── cargo.csv
│           ├── manifest.csv
│           ├── operations.csv
│           ├── inconsistencies.csv
│           ├── release_process.csv
│           └── delivery.csv
│
├── docs/
│   ├── methodology.md
│   ├── process_flow.md
│   ├── data_dictionary.md
│   └── kpi_definitions.md
│
├── sql/
│   ├── 01_create_tables.sql
│   └── 02_analysis_queries.sql
│
├── powerbi/
│   └── airport_cargo_dashboard.pbix
│
└── images/
    ├── dashboard_overview.png
    ├── data_model.png
    └── process_flow.png
```

## Status do Projeto

Em desenvolvimento.

Fase atual: base simulada criada e arquivos CSV processados. Próxima etapa: criação da estrutura SQL e consultas analíticas.

## Próximos Passos

* Criar o script SQL de criação das tabelas
* Importar os arquivos CSV no MySQL via DBeaver
* Criar consultas SQL para validação e análise dos dados
* Conectar os dados ao Power BI
* Tratar os dados com Power Query
* Criar medidas DAX
* Desenvolver o dashboard em Power BI
* Atualizar a documentação com prints, métricas e principais insights
