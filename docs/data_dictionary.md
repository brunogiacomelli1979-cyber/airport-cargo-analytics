# Dicionário de Dados

Este documento apresenta a estrutura da base de dados do projeto **Airport Cargo Operations Analytics**.

Os dados são simulados e organizados para permitir análises de performance operacional, conformidade regulatória, armazenagem, inconsistências, gargalos e responsabilidade dos atrasos.

## Modelo Conceitual

```text
flights 1 ─── N cargo
cargo 1 ─── 1 manifest
cargo 1 ─── 1 operations
cargo 1 ─── N inconsistencies
cargo 1 ─── 1 release_process
cargo 1 ─── 1 delivery
```

## 1. flights

Tabela com dados principais dos voos.

| Campo                     | Tipo     | Descrição                                    | Exemplo          |
| ------------------------- | -------- | -------------------------------------------- | ---------------- |
| flight_id                 | text     | Identificador único do voo                   | FLT0001          |
| airline                   | text     | Companhia aérea                              | LATAM Cargo      |
| flight_number             | text     | Número do voo                                | LA8123           |
| origin_airport            | text     | Aeroporto de origem                          | MIA              |
| aircraft_arrival_datetime | datetime | Data/hora de chegada da aeronave             | 2026-01-10 08:15 |
| mantra_closure_datetime   | datetime | Data/hora de encerramento no Siscomex/Mantra | 2026-01-10 17:40 |
| legal_deadline_hours      | integer  | Prazo regulatório adotado em horas           | 12               |
| legal_deadline_datetime   | datetime | Data/hora limite para encerramento           | 2026-01-10 20:15 |
| closure_compliance_status | text     | Status de conformidade do encerramento       | Dentro do prazo  |
| operation_shift           | text     | Turno operacional                            | Manhã            |

## 2. cargo

Tabela com dados da carga/AWB.

| Campo                 | Tipo    | Descrição                                 | Exemplo      |
| --------------------- | ------- | ----------------------------------------- | ------------ |
| cargo_id              | text    | Identificador único da carga              | CGO0001      |
| flight_id             | text    | Identificador do voo relacionado          | FLT0001      |
| awb_number            | text    | Número do conhecimento aéreo              | 045-12345675 |
| cargo_type            | text    | Tipo ou natureza da carga                 | Perecível    |
| declared_pieces       | integer | Volumes declarados                        | 25           |
| received_pieces       | integer | Volumes recebidos                         | 24           |
| declared_weight_kg    | decimal | Peso declarado em kg                      | 850.50       |
| received_weight_kg    | decimal | Peso recebido em kg                       | 848.20       |
| special_handling_flag | boolean | Indica necessidade de tratamento especial | Sim          |
| dangerous_goods_flag  | boolean | Indica carga perigosa/DGR                 | Não          |

## 3. manifest

Tabela com informações declaradas pela companhia aérea e qualidade dos dados de manifesto.

| Campo                     | Tipo    | Descrição                                          | Exemplo                             |
| ------------------------- | ------- | -------------------------------------------------- | ----------------------------------- |
| manifest_id               | text    | Identificador do registro de manifesto             | MAN0001                             |
| cargo_id                  | text    | Identificador da carga relacionada                 | CGO0001                             |
| declared_cargo_nature     | text    | Natureza declarada pela companhia aérea            | Refrigerada                         |
| manifest_error_flag       | boolean | Indica erro ou ausência de informação no manifesto | Sim                                 |
| manifest_error_type       | text    | Tipo de erro identificado                          | Divergência de peso                 |
| cargo_nature_missing_flag | boolean | Indica ausência de natureza declarada              | Não                                 |
| manifest_observation      | text    | Observação sobre a inconsistência                  | Peso declarado divergente do físico |

## 4. operations

Tabela com eventos operacionais do recebimento, registro, armazenagem e conferência.

| Campo                                | Tipo     | Descrição                                | Exemplo          |
| ------------------------------------ | -------- | ---------------------------------------- | ---------------- |
| operation_id                         | text     | Identificador da operação                | OPE0001          |
| cargo_id                             | text     | Identificador da carga relacionada       | CGO0001          |
| physical_receiving_start_datetime    | datetime | Início do recebimento físico             | 2026-01-10 08:50 |
| physical_receiving_end_datetime      | datetime | Fim do recebimento físico                | 2026-01-10 10:20 |
| depositary_system_receiving_datetime | datetime | Registro no sistema do depositário       | 2026-01-10 10:45 |
| conference_start_datetime            | datetime | Início da conferência/conciliação        | 2026-01-10 11:00 |
| conference_end_datetime              | datetime | Fim da conferência/conciliação           | 2026-01-10 14:30 |
| required_storage_area                | text     | Área esperada conforme natureza da carga | Área refrigerada |
| actual_storage_area                  | text     | Área real de armazenagem                 | Área refrigerada |
| storage_compliance_status            | text     | Status de conformidade da armazenagem    | Conforme         |

## 5. inconsistencies

Tabela com inconsistências, ocorrências e retrabalhos.

| Campo                     | Tipo     | Descrição                                | Exemplo                  |
| ------------------------- | -------- | ---------------------------------------- | ------------------------ |
| inconsistency_id          | text     | Identificador da inconsistência          | INC0001                  |
| cargo_id                  | text     | Identificador da carga relacionada       | CGO0001                  |
| inconsistency_type        | text     | Tipo de inconsistência                   | DSIC                     |
| inconsistency_description | text     | Descrição resumida da ocorrência         | Volume sem identificação |
| detected_datetime         | datetime | Data/hora da detecção                    | 2026-01-10 11:20         |
| resolved_datetime         | datetime | Data/hora da resolução                   | 2026-01-10 13:10         |
| rework_flag               | boolean  | Indica se houve retrabalho               | Sim                      |
| rework_type               | text     | Tipo de retrabalho                       | Recontagem               |
| responsibility_group      | text     | Grupo responsável ou influenciador       | Companhia aérea          |
| controllability_level     | text     | Nível de controlabilidade pelo aeroporto | Não controlável          |

## 6. release_process

Tabela com dados de liberação aduaneira, órgãos anuentes e pendências externas.

| Campo                        | Tipo     | Descrição                                            | Exemplo             |
| ---------------------------- | -------- | ---------------------------------------------------- | ------------------- |
| release_id                   | text     | Identificador do processo de liberação               | REL0001             |
| cargo_id                     | text     | Identificador da carga relacionada                   | CGO0001             |
| customs_release_required     | boolean  | Indica necessidade de liberação pela Receita Federal | Sim                 |
| customs_release_datetime     | datetime | Data/hora da liberação pela Receita Federal          | 2026-01-11 09:30    |
| anuence_required             | boolean  | Indica necessidade de órgão anuente                  | Sim                 |
| anuence_agency               | text     | Órgão anuente relacionado                            | Anvisa              |
| anuence_release_datetime     | datetime | Data/hora de liberação do órgão anuente              | 2026-01-11 15:40    |
| release_status               | text     | Status da liberação                                  | Liberada            |
| release_delay_reason         | text     | Motivo de atraso na liberação                        | Aguardando anuência |
| release_responsibility_group | text     | Grupo responsável pelo atraso                        | Órgão anuente       |

## 7. delivery

Tabela com dados de disponibilização, retirada e entrega da carga.

| Campo                         | Tipo     | Descrição                                 | Exemplo                  |
| ----------------------------- | -------- | ----------------------------------------- | ------------------------ |
| delivery_id                   | text     | Identificador da entrega                  | DEL0001                  |
| cargo_id                      | text     | Identificador da carga relacionada        | CGO0001                  |
| cargo_available_datetime      | datetime | Data/hora em que a carga ficou disponível | 2026-01-11 16:00         |
| pickup_request_datetime       | datetime | Data/hora da solicitação de retirada      | 2026-01-11 17:20         |
| delivery_datetime             | datetime | Data/hora da entrega/retirada             | 2026-01-11 18:10         |
| delivery_status               | text     | Status da entrega                         | Entregue                 |
| delivery_delay_flag           | boolean  | Indica atraso na retirada/entrega         | Não                      |
| delivery_responsibility_group | text     | Grupo responsável por eventual atraso     | Transportadora / cliente |

## Observação

Este dicionário de dados poderá ser ajustado durante a modelagem SQL, tratamento dos dados e construção do dashboard em Power BI.
