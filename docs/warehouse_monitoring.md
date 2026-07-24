# Monitoramento Operacional do Armazém

Este documento descreve a proposta de monitoramento operacional do armazém no projeto **Airport Cargo Operations Analytics**.

O objetivo deste módulo é representar visualmente os fluxos de movimentação de cargas de importação e exportação, permitindo acompanhar tempos por etapa, identificar gargalos e apoiar decisões de alocação de efetivo.

## Objetivo do Módulo

O módulo de monitoramento do armazém busca responder às seguintes perguntas:

* Em qual etapa da operação a carga está concentrada?
* Quais etapas estão acima do tempo operacional aceitável?
* Existe diferença de desempenho entre importação e exportação?
* Cargas especiais, como perecíveis ou DGR, estão sendo direcionadas corretamente?
* Onde o gestor deve concentrar equipe para reduzir gargalos operacionais?

## Separação entre Importação e Exportação

As operações de importação e exportação devem ser tratadas separadamente.

Cargas de importação e exportação não devem se misturar fisicamente ou operacionalmente, pois possuem fluxos, controles e exigências diferentes.

Por isso, o dashboard deve representar dois ambientes distintos:

* Armazém de Importação
* Armazém de Exportação

## Fluxo da Importação

Na importação, a carga chega pela aeronave, é recebida pelo fiel depositário, armazenada, liberada e posteriormente entregue ou retirada.

Fluxo proposto:

```text
Chegada da aeronave
→ Recebimento físico
→ Registro no sistema do depositário
→ Armazenagem
→ Conferência / conciliação
→ Encerramento no Siscomex/Mantra
→ Liberação Receita Federal / órgão anuente
→ Puxada para entrega
→ Entrega ou retirada
```

### Exemplo: carga geral de importação

```text
Recebimento
→ Armazenagem em transelevador ou área geral
→ Puxada para entrega
→ Setor de liberação
→ Entrega
```

### Exemplo: carga perecível de importação

```text
Recebimento
→ Armazenagem em área controlada
→ Puxada para entrega
→ Setor de liberação
→ Entrega
```

A principal diferença está no local de armazenagem e no nível de controle operacional necessário.

## Fluxo da Exportação

Na exportação, o fluxo operacional é inverso ao da importação.

A carga entra pelo terminal, passa por recebimento, conferência, armazenagem e preparação para embarque.

Fluxo proposto:

```text
Recebimento da carga no terminal
→ Conferência documental e operacional
→ Armazenagem
→ Separação para embarque
→ Puxada para expedição
→ Carregamento / embarque
→ Saída no voo
```

## Tipos de Carga Considerados

O dashboard deve permitir visualizar os fluxos por perfil de carga:

* Carga geral
* Perecível
* Refrigerada
* DGR / carga perigosa
* Valiosa
* Avariada
* Pendente de conferência
* Pendente de liberação

Cada tipo de carga pode exigir área de armazenagem, prioridade e controle operacional diferentes.

## Tempos Operacionais por Etapa

Cada etapa do fluxo terá um tempo médio aceitável.

A comparação entre tempo real e tempo esperado permitirá classificar a operação em:

* Dentro do tempo esperado
* Atenção
* Acima do tempo esperado

Exemplo de estrutura:

| Etapa                              | Tempo aceitável | Status esperado |
| ---------------------------------- | --------------: | --------------- |
| Recebimento físico                 |          30 min | Dentro do tempo |
| Registro no sistema do depositário |          20 min | Dentro do tempo |
| Armazenagem                        |          30 min | Dentro do tempo |
| Conferência / conciliação          |          60 min | Dentro do tempo |
| Puxada para entrega                |          30 min | Dentro do tempo |
| Entrega / retirada                 |          45 min | Dentro do tempo |

Os tempos utilizados no projeto serão simulados e definidos apenas para fins analíticos.

## Campos Necessários

Para viabilizar esta análise, o projeto poderá utilizar uma tabela de eventos operacionais chamada `warehouse_flow_events`.

Campos sugeridos:

| Campo                   | Tipo     | Descrição                                 | Exemplo          |
| ----------------------- | -------- | ----------------------------------------- | ---------------- |
| event_id                | text     | Identificador único do evento             | EVT0001          |
| cargo_id                | text     | Identificador da carga                    | CGO0001          |
| operation_type          | text     | Tipo de operação                          | Importação       |
| cargo_profile           | text     | Perfil da carga                           | Perecível        |
| process_stage           | text     | Etapa operacional                         | Armazenagem      |
| warehouse_area          | text     | Área do armazém                           | Área refrigerada |
| stage_entry_datetime    | datetime | Data/hora de entrada na etapa             | 2026-01-10 10:30 |
| stage_exit_datetime     | datetime | Data/hora de saída da etapa               | 2026-01-10 11:05 |
| stage_duration_minutes  | integer  | Tempo da etapa em minutos                 | 35               |
| acceptable_time_minutes | integer  | Tempo operacional aceitável               | 30               |
| stage_status            | text     | Status da etapa                           | Atenção          |
| staff_required_flag     | boolean  | Indica necessidade de reforço operacional | Sim              |

## Indicadores do Módulo

Principais indicadores previstos:

* Tempo médio por etapa operacional
* Percentual de cargas acima do tempo aceitável
* Quantidade de cargas por etapa
* Quantidade de cargas por área do armazém
* Tempo médio por tipo de carga
* Status operacional por etapa
* Etapas com maior necessidade de reforço de equipe
* Comparação entre fluxo de importação e exportação

## Uso no Dashboard

O dashboard poderá apresentar uma página chamada **Monitoramento do Armazém**.

Essa página deve conter:

* Fluxo visual da importação
* Fluxo visual da exportação
* Cargas em cada etapa
* Tempo médio real vs tempo aceitável
* Status por etapa
* Filtros por tipo de carga, operação, área e turno
* Indicação de pontos críticos para alocação de efetivo

## Aplicação Operacional

A principal finalidade deste módulo é apoiar a gestão operacional.

Com a visualização dos tempos por etapa, o gestor pode identificar onde a operação está acumulando carga ou excedendo os tempos aceitáveis, permitindo direcionar equipe para os pontos mais críticos.

Exemplo:

```text
Se a etapa de puxada para entrega estiver acima do tempo aceitável,
o gestor pode deslocar efetivo para reduzir o acúmulo nessa etapa.
```

## Observação

Este módulo complementa a análise principal do projeto.

A base atual do projeto está focada na jornada da carga aérea de importação. A visão de exportação e monitoramento operacional do armazém poderá ser incorporada como uma camada adicional de análise, mantendo a separação entre fluxos de importação e exportação.
