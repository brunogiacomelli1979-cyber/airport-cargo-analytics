# Definições vigentes dos indicadores

Versão 2, 07/11/2026. Dados inteiramente simulados de importação. Prazo de encerramento fictício; não é interpretação jurídica.

## Escopo e grão

Os filtros globais selecionam mês de chegada do voo, companhia e perfil de carga. Um perfil selecionado inclui apenas seus AWBs e os voos que contêm ao menos um desses AWBs. As medidas de voo usam flight_id distinto. Ocorrências nunca multiplicam peso ou volumes. Busca, voo e condição da tabela refinam apenas a tabela e seu CSV.

| Indicador | Numerador / cálculo | Denominador / grão |
|---|---|---|
| Voos | Contagem distinta de flight_id | Voo |
| AWBs | Contagem distinta de cargo_id | Carga |
| Volumes | Soma received_pieces | Carga única |
| Peso recebido | Soma received_weight_kg | Carga única, kg; visão geral também em t = kg / 1.000 |
| Encerramento no prazo | chegada ≤ encerramento ≤ limite do CSV | Voos selecionados |
| Chegada → registro | Média de registro no depositário − chegada da aeronave | AWBs, horas |
| Registro → encerramento | Média de encerramento − registro no depositário | AWBs, horas |
| Chegada → encerramento | Média de encerramento − chegada | Voos únicos, horas |
| Dwell total | Média de entrega − chegada da aeronave | AWBs, horas; inclui etapas externas |
| Erro de manifesto | AWBs com manifest_error_flag = Sim | AWBs selecionados |
| Retrabalho | AWBs distintos com ≥1 ocorrência rework_flag = Sim | AWBs selecionados |
| Armazenagem conforme | AWBs com status Conforme | AWBs selecionados |
| Cargas afetadas | AWBs distintos com ≥1 ocorrência | AWBs selecionados |
| Ocorrências | Contagem de inconsistency_id | Ocorrência |
| Resolução média | Média de resolved_datetime − detected_datetime | Ocorrência; tempo decorrido, não trabalho ativo |
| Divergência de peso | AWBs com peso declarado diferente do recebido | Contagem de cargas; nenhuma tolerância presumida |
| Divergência de volumes | AWBs com volumes declarados diferentes dos recebidos | Contagem de cargas |
| Grupo / controlabilidade | Contagem das classificações registradas | Ocorrência; não distribuição causal de atrasos |

Datas são locais simuladas sem fuso declarado. A coordenada UTC no JavaScript serve exclusivamente para subtrair componentes sem conversão de fuso. Os cálculos usam precisão integral; a tela mostra percentuais com uma casa e horas com duas. Médias sem observações e taxas com denominador zero aparecem como “—”; contagens e somas vazias são zero.

A distribuição de dwell usa intervalos [0,24), [24,48), [48,72), [72,96), [96,120) e [120,+∞), em horas. A soma é igual à quantidade de AWBs válidos selecionados.

## Limitações e propostas futuras

Não são calculados: dwell operacional limpo, ocupação atual do armazém, necessidade instantânea de equipe, tempos por etapas sem eventos, exportação ou culpa por atraso. Dependem de dados adicionais não presentes. O antigo nome “tempo médio de retrabalho” foi substituído por intervalo de resolução de ocorrência para evitar inferir esforço de trabalho. Os grupos e a controlabilidade descrevem registros de ocorrências.

As 41 classificações “Próximo ao limite” não contam como cumprimento: todas encerraram após o limite pela data. O indicador ignora esse rótulo.
