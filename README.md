# Airport Cargo Operations Analytics

**Projeto demonstrativo de BI operacional aplicado à logística aeroportuária de importação.** Transforma sete tabelas CSV fictícias em uma análise rastreável de voos, cargas, tempos, manifestações documentais, inconsistências, armazenagem e entrega.

> **Aviso: dados simulados.** Nenhum registro representa operações reais de Viracopos, de companhias aéreas, clientes ou órgãos públicos. O prazo do dataset é uma premissa de simulação, não orientação regulatória.

## Entrega atual

- **Dashboard web responsivo:** index.html + assets/dashboard.css + assets/dashboard.js.
- **Filtros:** mês de chegada, companhia aérea, tipo de carga; indicadores, gráficos e ranking se recalculam.
- **Exportação:** CSV filtrado de cargas, com grão de AWB preservado.
- **Banco relacional MySQL 8:** sql/01_create_tables.sql.
- **Consultas e views auditáveis:** sql/02_analysis_queries.sql.
- **Validação automática:** scripts/validate_data.py e tests/test_data.py, sem bibliotecas Python externas.
- **CI e publicação GitHub Pages:** .github/workflows/quality-and-pages.yml.
- **Camada Power BI:** guia de importação, relacionamentos, DAX e páginas em powerbi/GUIA_DE_IMPLEMENTACAO.md. **O arquivo PBIX nativo não está incluído; precisa ser montado no Power BI Desktop.**

## Executar o dashboard web localmente

No diretório raiz do repositório:

    python scripts/validate_data.py
    python -m unittest discover -s tests -v
    python -m http.server 8000

Acessar http://localhost:8000 no navegador. Abrir index.html diretamente como file:// pode bloquear o carregamento de CSV por segurança; use servidor HTTP.

**Dashboard publicado via GitHub Pages** em 07/11/2026:
https://brunogiacomelli1979-cyber.github.io/airport-cargo-analytics/

Publicação confirmada pelo workflow [#42385177235](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/actions/runs/42385177235), com etapa `actions/deploy-pages@v4` concluída com sucesso.

## Modelo e cargas SQL

Requisito: MySQL 8.0+ e DBeaver (ou importador equivalente).

1. Executar sql/01_create_tables.sql.
2. Importar data/processed/csv/flights.csv primeiro.
3. Importar cargo.csv em seguida.
4. Importar manifest.csv, operations.csv, inconsistencies.csv, release_process.csv e delivery.csv.
5. Usar cabeçalho, vírgula, texto UTF-8 com BOM e campos de data datetime; strings vazias opcionais devem ser NULL.
6. Executar sql/02_analysis_queries.sql após a importação. O script cria duas views e executa verificações e consultas analíticas.

A importação não é automatizada no GitHub Actions porque o projeto não possui banco MySQL de produção — o painel web consome os CSVs versionados e funciona independentemente do MySQL.

## Resumo da base simulada

| Medida | Valor |
| --- | ---: |
| Janela de chegada | janeiro–março de 2026 |
| Companhias aéreas | 8 |
| Voos | 120 |
| Cargas/AWBs | 1.111 |
| Inconsistências | 394, afetando 350 cargas |
| Voos dentro do prazo simulado | 54 / 120 (45,0%) |
| Cargas com erro de manifesto | 208 / 1.111 (18,7%) |
| Cargas com retrabalho | 223 / 1.111 (20,1%) |
| Cargas armazenadas conforme registro | 1.021 / 1.111 (91,9%) |
| Peso recebido | 1.384.521,66 kg |
| Volumes recebidos | 44.892 |
| Dwell total médio | 70,11 horas |

**Importante:** 41 voos constam como "Próximo ao limite" no campo textual, mas possuem encerramento *depois* do horário limite. O dashboard e a view calculam a conformidade pelo horário, não pelo texto.

## Conceitos e limitações

- O grão de voo e de AWB é diferente: é incorreto multiplicar voos por número de cargas na mesma viagem.
- Um AWB pode ter mais de uma ocorrência, então a taxa de cargas afetadas usa cargo_id distinto.
- A distribuição de grupos responsáveis descreve **ocorrências**, não causalidade nem culpa por atraso.
- "Dwell total" significa chegada da aeronave até entrega/retirada. A base não sustenta um cálculo de "dwell operacional limpo" sem eventos e tempos externos suficientes.
- Não existem registros de warehouse_flow_events, exportações nem saldos para medir ocupação corrente ou necessidade real de reforço de equipe.
- Datas são simuladas no mesmo fuso, sem timezone declarado; não alterar fuso durante o tratamento.
- A análise é descritiva, educacional, não operacional ou jurídica.

Documentação: docs/validation_report.md, docs/kpi_definitions.md, docs/data_dictionary.md, docs/methodology.md, docs/warehouse_monitoring.md.

## Estrutura

    airport-cargo-analytics/
    ├── index.html
    ├── assets/
    │   ├── dashboard.css
    │   └── dashboard.js
    ├── data/
    │   ├── raw/airport_cargo_operations_sample.xlsx
    │   └── processed/csv/{flights,cargo,manifest,operations,inconsistencies,release_process,delivery}.csv
    ├── sql/
    │   ├── 01_create_tables.sql
    │   └── 02_analysis_queries.sql
    ├── powerbi/GUIA_DE_IMPLEMENTACAO.md
    ├── scripts/validate_data.py
    ├── tests/test_data.py
    ├── docs/
    │   ├── validation_report.md
    │   └── demais documentos de metodologia
    └── .github/workflows/quality-and-pages.yml

## Critérios de conclusão

- [x] Inventário e validação quantitativa dos sete CSVs.
- [x] Modelo SQL com relacionamentos e proteção contra explosão de registros.
- [x] Views e consultas com denominadores e definições auditáveis.
- [x] Dashboard web com filtros e exportação.
- [x] Testes automáticos e workflow de publicação configurados.
- [x] Testes CSV/Python/JavaScript aprovados na main ([execução 42383580278](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/actions/runs/42383580278)).
- [x] GitHub Pages habilitado e publicado, com testes e deploy aprovados na [execução #42385177235](https://github.com/brunogiacomelli1979-cyber/airport-cargo-analytics/actions/runs/42385177235).
- [ ] Construir e validar PBIX nativo no Power BI Desktop, se essa entrega também for exigida.
