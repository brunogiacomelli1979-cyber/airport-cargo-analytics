# Relatório de qualidade e resultados da base simulada

Data do inventário: 2026-11-07. Origem: sete CSVs em data/processed/csv. Todos os registros são fictícios, sem dados de operações reais.

## Cobertura e grão
| Tabela | Linhas | Grão |
| --- | ---: | --- |
| flights | 120 | Voo único |
| cargo | 1.111 | Carga/AWB |
| manifest | 1.111 | Um manifesto por carga |
| operations | 1.111 | Uma linha operacional por carga |
| inconsistencies | 394 | Uma ocorrência; pode haver várias por carga |
| release_process | 1.111 | Um processo por carga |
| delivery | 1.111 | Uma entrega por carga |

Jan/2026 a mar/2026 (meses de chegada do voo); 8 companhias aéreas.

## Validações de integridade
- Sem duplicatas nas chaves principais de flights, cargo e tabelas 1:1.
- Nenhuma carga sem voo correspondente, nenhuma operação/ocorrência sem carga.
- Registros de operações, manifesto, liberação e entrega abrangem as 1.111 cargas.
- Não foram observadas durações negativas entre chegada e registro, entre registro e encerramento ou chegada e entrega.
- CSV contém BOM UTF-8; usar utf-8-sig nos scripts Python e verificar encoding nos importadores SQL/Power BI.
- Campos opcionais vazios são ausências reais no dataset; não converter para "Sem atraso" nem imputar datas.

## KPIs observados no dataset fictício
| Indicador | Resultado | Denominador/método |
| --- | ---: | --- |
| Voos | 120 | COUNT DISTINCT flight_id |
| Cargas/AWBs | 1.111 | COUNT DISTINCT cargo_id |
| Volumes recebidos | 44.892 | SUM received_pieces |
| Peso recebido | 1.384.521,66 kg | SUM received_weight_kg |
| Encerramentos no prazo | 54 (45,0%) | encerramento até deadline_datetime / 120 voos |
| Encerramentos depois do prazo | 66 (55,0%) | datetime > limite simulado / 120 |
| Cargas com erro de manifesto | 208 (18,72%) | manifest_error_flag=Sim / 1111 |
| Cargas com inconsistência | 350 (31,50%) | COUNT DISTINCT cargo_id / 1111 |
| Cargas com retrabalho | 223 (20,07%) | cargo_id distinto com >=1 evento rework_flag=Sim / 1111 |
| Armazenagens conformes | 1.021 (91,90%) | status Conforme / 1111 |
| Dwell médio | 70,11 h | média por cargo de entrega - chegada aeronave |
| Chegada ao registro no depositário | 2,50 h | média por cargo de registro - chegada aeronave |

**Cuidado com o campo de conformidade original:** há 41 voos com o status textual "Próximo ao limite" e todos esses 41 têm encerramento depois da data/hora limite no CSV. O status não deve ser agrupado automaticamente como "dentro do prazo". A regra verificável sempre compara os timestamps de encerramento e limite.

**Cuidado com causalidade:** os campos responsibility_group e controllability_level dizem respeito às *ocorrências registradas*, não provam qual agente causou o atraso do voo. Apresentar essas distribuições como "responsabilidade dos atrasos" seria metodologicamente inválido.

## Indicadores não calculáveis honestamente
- "Dwell operacional limpo": faltam intervalos detalhados de imobilização por autoridade, espera por cliente e outras dependências externas. Não subtrair tempos arbitrariamente.
- Ocupação/posição corrente do armazém, demanda instantânea por equipe, tempos por etapa e comparativo importação versus exportação: faltam dados da tabela planejada warehouse_flow_events e dados de exportação.
- O prazo de 12h do dataset é **simulado** e não deve ser comunicado como prazo jurídico aplicável.

## Reprodução
Execute python scripts/validate_data.py. O script confere linhas, chaves, integridade, ordem temporal e métricas e sai com erro se houver divergência. Para relatório legível por máquina:
python scripts/validate_data.py --output quality-summary.json

Este documento representa uma inspeção dos CSVs no GitHub, não uma certificação de dados reais.

## Reconciliação ampliada da versão 2 — 07/11/2026

As fontes CSV e a planilha original permanecem byte a byte no histórico sem alterações nesta evolução. Validador ampliado para todas as datas preenchidas, ordem de recebimento físico, registro, conferência, disponibilidade, solicitação e entrega; anuência exigida deve possuir data. Nenhum erro observado na base atual.

Novas métricas reconciliadas independentemente em Python e JavaScript:

| Indicador | Resumo / contagem verificada | Grão |
|---|---:|---|
| Registro → encerramento | 9,825 h (resumo a 3 casas) | Média por AWB |
| Chegada → encerramento | 12,283 h (resumo a 3 casas) | Média por voo |
| Detecção → resolução | 3,444 h (resumo a 3 casas) | Média por ocorrência |
| Divergência física de peso | 24 | AWBs |
| Divergência física de volumes | 32 | AWBs |

A média de chegada→registro somada à média registro→encerramento é ponderada por AWB; não deve ser igualada à média de encerramento por voo, porque são populações com pesos distintos. Divergências físicas comparam os campos declarados e recebidos sem tolerância presumida; não equivalem automaticamente ao flag de manifesto.

Observação da liberação: 159 registros têm customs_release_required = Não e data aduaneira preenchida. Os valores são preservados, sem imputação e sem inferência de obrigação jurídica. Esta interface não apresenta duração aduaneira como indicador validado.

