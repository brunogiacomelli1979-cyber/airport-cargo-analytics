# Montagem do relatório no Power BI Desktop

O projeto já inclui um dashboard WEB funcional na raiz do GitHub. Este guia define a camada Power BI para quem desejar também um PBIX nativo; não existe arquivo .pbix pronto neste repositório.

## 1. Importar CSVs
Power BI Desktop > Obter Dados > Texto/CSV; importar os sete arquivos de data/processed/csv. Escolher codificação UTF-8 e usar a primeira linha como cabeçalho. Os CSVs têm BOM; remover o caractere BOM se aparecer no primeiro nome de coluna. Usar como nomes das consultas: flights, cargo, manifest, operations, inconsistencies, release_process e delivery.

No Power Query:
- Identificadores e AWB são **texto**, preservando zeros à esquerda.
- Datas e horas são Date/Time usando padrão yyyy-MM-dd HH:mm, todos tratados no MESMO fuso simulado.
- Peso DECIMAL com ponto e duas casas; usar localidade en-US para converter valores como 1106.62, se necessário.
- Flags e status são texto, respeitando Sim/Não/Conforme.
- Células vazias são null, não zero e não "Sem atraso".
- Não duplicar tabelas de 1:N nem usar merge de inconsistencies com cargo sem agregação prévia.

## 2. Relacionamentos recomendados
flights[flight_id] (1) -> cargo[flight_id] (N)
cargo[cargo_id] (1) -> manifest[cargo_id] (1)
cargo[cargo_id] (1) -> operations[cargo_id] (1)
cargo[cargo_id] (1) -> release_process[cargo_id] (1)
cargo[cargo_id] (1) -> delivery[cargo_id] (1)
cargo[cargo_id] (1) -> inconsistencies[cargo_id] (N)

Direção de filtro: unidirecional da dimensão/grão pai para a tabela filha, quando permitido pelo relacionamento. Evitar relações muitos-para-muitos. Para a quantidade de voos no contexto de filtro por tipo de carga, usar a abordagem TREATAS demonstrada a seguir, ou não utilizar o filtro de tipo nos visuais de voo. A página web trata a interseção explicitamente.

## 3. Coluna calculada em flights

Nome: Closed On Time

    Closed On Time =
    IF(
      NOT ISBLANK(flights[mantra_closure_datetime]) &&
      flights[mantra_closure_datetime] >= flights[aircraft_arrival_datetime] &&
      flights[mantra_closure_datetime] <= flights[legal_deadline_datetime],
      1, 0
    )

Este limite é uma PREMISSA FICTÍCIA gravada no dataset, não uma conclusão jurídica. Ignorar o rótulo source_status para o KPI.

## 4. Coluna calculada em delivery

Nome: Dwell Total Hours

    Dwell Total Hours =
    VAR FlightKey = LOOKUPVALUE(
      cargo[flight_id], cargo[cargo_id], delivery[cargo_id]
    )
    VAR Arrival = LOOKUPVALUE(
      flights[aircraft_arrival_datetime], flights[flight_id], FlightKey
    )
    RETURN IF(
      ISBLANK(Arrival) || ISBLANK(delivery[delivery_datetime]) ||
      delivery[delivery_datetime] < Arrival,
      BLANK(),
      DIVIDE(DATEDIFF(Arrival, delivery[delivery_datetime], MINUTE), 60)
    )

## 5. Coluna calculada em operations

Nome: Arrival To Depositary Hours

    Arrival To Depositary Hours =
    VAR FlightKey = LOOKUPVALUE(
      cargo[flight_id], cargo[cargo_id], operations[cargo_id]
    )
    VAR Arrival = LOOKUPVALUE(
      flights[aircraft_arrival_datetime], flights[flight_id], FlightKey
    )
    RETURN IF(
      ISBLANK(Arrival) || ISBLANK(operations[depositary_system_receiving_datetime]) ||
      operations[depositary_system_receiving_datetime] < Arrival,
      BLANK(),
      DIVIDE(DATEDIFF(Arrival, operations[depositary_system_receiving_datetime], MINUTE),60)
    )

## 6. Medidas DAX

    Voos = DISTINCTCOUNT(flights[flight_id])
    AWBs = DISTINCTCOUNT(cargo[cargo_id])
    Volumes Recebidos = SUM(cargo[received_pieces])
    Peso Recebido kg = SUM(cargo[received_weight_kg])
    Voos No Prazo = CALCULATE([Voos], flights[Closed On Time] = 1)
    Conformidade Encerramento % = DIVIDE([Voos No Prazo], [Voos])
    Erros De Manifesto = CALCULATE(DISTINCTCOUNT(manifest[cargo_id]), manifest[manifest_error_flag] = "Sim")
    Taxa Erro Manifesto % = DIVIDE([Erros De Manifesto], [AWBs])
    Cargas Com Inconsistencia = DISTINCTCOUNT(inconsistencies[cargo_id])
    Taxa Inconsistencia % = DIVIDE([Cargas Com Inconsistencia], [AWBs])
    Cargas Com Retrabalho = CALCULATE(DISTINCTCOUNT(inconsistencies[cargo_id]), inconsistencies[rework_flag] = "Sim")
    Taxa Retrabalho % = DIVIDE([Cargas Com Retrabalho], [AWBs])
    Armazenagem Conforme = CALCULATE(DISTINCTCOUNT(operations[cargo_id]), operations[storage_compliance_status] = "Conforme")
    Taxa Conformidade Armazenagem % = DIVIDE([Armazenagem Conforme], [AWBs])
    Dwell Total Medio h = AVERAGE(delivery[Dwell Total Hours])
    Chegada Registro Medio h = AVERAGE(operations[Arrival To Depositary Hours])
    Ocorrencias = COUNTROWS(inconsistencies)

Cuidado: filtros em inconsistency_type podem limitar o subconjunto do numerador e alterar a interpretação da taxa; adicionar subtítulo de escopo da seleção.

## 7. Páginas recomendadas
**Visão geral:** KPIs por voos e por AWB, evolução mensal de voos, taxa de conformidade calculada pelas datas, tipo de carga.
**Qualidade e retrabalho:** manifesto, ocorrências, cargos com retrabalho, armazenagem conforme, tabelas de divergências.
**Gargalos e responsabilidade:** tempos médios, dwell total, distribuição de classificações de *ocorrências* por grupo e controlabilidade (não "responsáveis pelos atrasos").
**Auditoria:** cobertura das sete tabelas, chave/grão, origem simulada, metadados do filtro, limites.

## 8. Critérios de aceite PBIX
Antes de chamar o PBIX de finalizado, conferir os números com docs/validation_report.md e com o validador Python, testar filtros cruzados, conferir taxas no nível de voo versus carga, revisar datas/pesos com cultura correta e salvar screenshot das quatro páginas.

Não publicar dados como reais e não calcular ocupação do armazém, exportação nem dwell operacional limpo a partir desta base.
