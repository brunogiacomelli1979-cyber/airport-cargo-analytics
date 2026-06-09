# Metodologia

Este projeto utiliza como referência o processo de análise de dados apresentado no **Google Data Analytics Professional Certificate**:

**Ask → Prepare → Process → Analyze → Share → Act**

A metodologia foi aplicada a um contexto de BI operacional em logística aeroportuária de cargas de importação, com foco em performance, conformidade regulatória, gargalos e responsabilidade dos atrasos.

## 1. Ask

Nesta etapa, o objetivo é definir o problema de negócio e as principais perguntas que a análise deve responder.

A pergunta central do projeto é:

> Como medir a performance da logística aeroportuária de cargas de importação, separando gargalos internos, atrasos externos, inconsistências operacionais e conformidade regulatória?

Principais pontos analisados:

* Tempo até o encerramento no Siscomex/Mantra
* Gargalos entre recebimento no sistema do depositário e encerramento no Siscomex/Mantra
* Inconsistências de manifesto e divergências operacionais
* Retrabalhos de conferência, recontagem ou repesagem
* Conformidade da armazenagem conforme a natureza declarada da carga
* Responsabilidade e controlabilidade dos atrasos

## 2. Prepare

Nesta etapa, são definidos os dados necessários para responder às perguntas do projeto.

Os dados foram organizados em tabelas relacionadas a:

* Voos
* Cargas/AWBs
* Manifesto
* Operações
* Inconsistências
* Liberação
* Entrega

Todos os dados utilizados são fictícios e foram criados apenas para fins educacionais e de portfólio.

## 3. Process

Nesta etapa, os dados são preparados, limpos e transformados para análise.

Principais atividades previstas:

* Padronização de datas e horários
* Tratamento de campos nulos ou inconsistentes
* Classificação dos tipos de carga
* Identificação de erros de manifesto
* Cálculo de tempos operacionais
* Classificação de atrasos por grupo responsável
* Classificação de controlabilidade dos gargalos

Ferramentas utilizadas ou previstas:

* Excel
* SQL
* Power Query

## 4. Analyze

Nesta etapa, são criados indicadores e análises para identificar padrões, gargalos e riscos operacionais.

Principais análises do projeto:

* Tempo total até encerramento no Siscomex/Mantra
* Tempo entre recebimento no depositário e encerramento no Siscomex/Mantra
* Percentual de encerramentos dentro do prazo regulatório
* Taxa de erro de manifesto
* Taxa de retrabalho operacional
* Taxa de conformidade de armazenagem
* Cargo dwell time total
* Cargo dwell time operacional limpo
* Percentual de atrasos por grupo responsável
* Percentual de atrasos controláveis pelo aeroporto

## 5. Share

Nesta etapa, os resultados são comunicados de forma clara e útil para tomada de decisão.

Entregas previstas:

* Dashboard em Power BI
* Consultas SQL documentadas
* Prints das principais páginas do relatório
* Documentação dos KPIs
* README atualizado com visão geral, ferramentas, metodologia e principais resultados

## 6. Act

Nesta etapa, a análise é transformada em recomendações operacionais.

Exemplos de recomendações esperadas:

* Priorizar voos com maior risco de atraso no encerramento
* Monitorar erros de manifesto por companhia aérea ou origem
* Reduzir retrabalhos por divergência de peso, volume ou identificação
* Acompanhar cargas com maior risco de armazenagem inadequada
* Separar atrasos controláveis pelo aeroporto de atrasos externos
* Monitorar etapas regulatórias e anuências que impactam o dwell time

## Observação

Este documento não tem o objetivo de resumir todo o conteúdo do Google Data Analytics Professional Certificate.

A finalidade é demonstrar como o processo de análise de dados foi aplicado neste projeto específico de BI operacional em logística aeroportuária de cargas de importação.
