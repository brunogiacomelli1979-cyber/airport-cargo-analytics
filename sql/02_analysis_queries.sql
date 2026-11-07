-- Execute depois da importacao dos CSVs no banco airport_cargo_analytics.
USE airport_cargo_analytics;

-- Grao: UM voo. Medir conformidade por timestamp, nunca pelo rotulo
-- "Proximo ao limite" (que nao define conformidade).
CREATE OR REPLACE VIEW vw_flight_performance AS
SELECT f.flight_id, f.airline, f.flight_number, f.origin_airport,
       f.aircraft_arrival_datetime, DATE(f.aircraft_arrival_datetime) AS arrival_date,
       DATE_FORMAT(f.aircraft_arrival_datetime, '%Y-%m') AS arrival_month,
       f.operation_shift, f.legal_deadline_hours,
       f.mantra_closure_datetime, f.legal_deadline_datetime,
       TIMESTAMPDIFF(MINUTE, f.aircraft_arrival_datetime, f.mantra_closure_datetime) AS minutes_to_closure,
       CASE WHEN f.mantra_closure_datetime >= f.aircraft_arrival_datetime
                  AND f.mantra_closure_datetime <= f.legal_deadline_datetime
            THEN 1 ELSE 0 END AS closed_on_time,
       f.closure_compliance_status AS source_status
FROM flights f;

-- Grao: UMA carga. Agregamos inconsistencias ANTES da uniao,
-- evitando multiplicar pesos/volumes por causa da relacao 1:N.
CREATE OR REPLACE VIEW vw_cargo_performance AS
SELECT c.cargo_id, c.flight_id, c.awb_number, c.cargo_type,
       c.received_pieces, c.received_weight_kg,
       f.airline, f.arrival_month, f.arrival_date, f.closed_on_time,
       m.manifest_error_flag, m.manifest_error_type,
       o.storage_compliance_status, o.required_storage_area, o.actual_storage_area,
       TIMESTAMPDIFF(MINUTE, f.aircraft_arrival_datetime,
         o.depositary_system_receiving_datetime) AS minutes_to_depositary,
       TIMESTAMPDIFF(MINUTE, o.depositary_system_receiving_datetime,
         f.mantra_closure_datetime) AS minutes_depositary_to_closure,
       TIMESTAMPDIFF(MINUTE, f.aircraft_arrival_datetime,
         d.delivery_datetime) AS dwell_minutes_arrival_to_delivery,
       COALESCE(i.inconsistency_count,0) AS inconsistency_count,
       COALESCE(i.has_rework,0) AS has_rework,
       r.release_status, d.delivery_status
FROM cargo c
JOIN vw_flight_performance f ON f.flight_id=c.flight_id
JOIN manifest m ON m.cargo_id=c.cargo_id
JOIN operations o ON o.cargo_id=c.cargo_id
JOIN release_process r ON r.cargo_id=c.cargo_id
JOIN delivery d ON d.cargo_id=c.cargo_id
LEFT JOIN (
 SELECT cargo_id, COUNT(*) AS inconsistency_count,
        MAX(CASE WHEN rework_flag='Sim' THEN 1 ELSE 0 END) AS has_rework
 FROM inconsistencies GROUP BY cargo_id
) i ON i.cargo_id=c.cargo_id;

-- 1. Controle da importacao: 120 voos; 1111 cargas; 394 ocorrencias.
SELECT 'flights' AS tabela, COUNT(*) AS linhas FROM flights UNION ALL
SELECT 'cargo',COUNT(*) FROM cargo UNION ALL
SELECT 'manifest',COUNT(*) FROM manifest UNION ALL
SELECT 'operations',COUNT(*) FROM operations UNION ALL
SELECT 'inconsistencies',COUNT(*) FROM inconsistencies UNION ALL
SELECT 'release_process',COUNT(*) FROM release_process UNION ALL
SELECT 'delivery',COUNT(*) FROM delivery;

-- 2. Conformidade regulatoria SIMULADA: denominador = voos.
SELECT COUNT(*) AS flights,
       SUM(closed_on_time) AS on_time,
       COUNT(*)-SUM(closed_on_time) AS late,
       ROUND(100.0*SUM(closed_on_time)/NULLIF(COUNT(*),0),2) AS compliance_pct,
       ROUND(AVG(minutes_to_closure)/60.0,2) AS avg_closure_hours
FROM vw_flight_performance;

-- 3. Volume e qualidade: denominador = cargas.
SELECT COUNT(*) AS awbs, SUM(received_pieces) AS pieces,
       ROUND(SUM(received_weight_kg),2) AS received_kg,
       SUM(manifest_error_flag='Sim') AS manifest_errors,
       ROUND(100.0*SUM(manifest_error_flag='Sim')/NULLIF(COUNT(*),0),2) AS manifest_error_pct,
       SUM(inconsistency_count>0) AS affected_cargo,
       SUM(has_rework) AS reworked_cargo,
       ROUND(AVG(minutes_to_depositary)/60.0,2) AS avg_depositary_hours,
       ROUND(AVG(minutes_depositary_to_closure)/60.0,2) AS avg_depositary_to_closure_hours,
       ROUND(AVG(dwell_minutes_arrival_to_delivery)/60.0,2) AS avg_dwell_hours,
       ROUND(100.0*SUM(storage_compliance_status='Conforme')/NULLIF(COUNT(*),0),2) AS storage_compliance_pct
FROM vw_cargo_performance;

-- 4. Desempenho por companhia, SEM multiplicacao de voos por AWBs.
SELECT airline,COUNT(*) AS flights,SUM(closed_on_time) AS on_time,
       ROUND(100.0*SUM(closed_on_time)/COUNT(*),2) AS on_time_pct,
       ROUND(AVG(minutes_to_closure)/60.0,2) AS avg_hours
FROM vw_flight_performance GROUP BY airline ORDER BY flights DESC,airline;

-- 5. Tendencia mensal: janela pela CHEGADA DO VOO.
SELECT arrival_month,COUNT(*) AS flights,SUM(closed_on_time) AS on_time,
       ROUND(100.0*SUM(closed_on_time)/COUNT(*),2) AS on_time_pct
FROM vw_flight_performance GROUP BY arrival_month ORDER BY arrival_month;

-- 6. Ocorrencias por responsabilidade. NAO e distribuicao de atrasos.
SELECT responsibility_group,COUNT(*) AS occurrences,
       COUNT(DISTINCT cargo_id) AS distinct_cargo
FROM inconsistencies GROUP BY responsibility_group ORDER BY occurrences DESC;

-- 7. Ocorrencias por controlabilidade. NAO atribuir causa de atraso.
SELECT controllability_level,COUNT(*) AS occurrences
FROM inconsistencies GROUP BY controllability_level ORDER BY occurrences DESC;

-- 8. Armazenagem por tipo de carga.
SELECT cargo_type,COUNT(*) AS cargo,
       SUM(storage_compliance_status='Conforme') AS compliant,
       ROUND(100.0*SUM(storage_compliance_status='Conforme')/COUNT(*),2) AS compliance_pct
FROM vw_cargo_performance GROUP BY cargo_type ORDER BY cargo DESC;

-- 9. Retrabalho (ocorrencias), e duracao de RESOLUCAO da ocorrencia;
-- nao interpretar como tempo de trabalho ativo.
SELECT COUNT(*) AS rework_occurrences,
       ROUND(AVG(TIMESTAMPDIFF(MINUTE,detected_datetime,resolved_datetime)),1)
       AS avg_resolution_minutes
FROM inconsistencies WHERE rework_flag='Sim';

-- 10. Checagens de temporalidade, devem retornar zero.
SELECT SUM(minutes_to_depositary<0) AS invalid_depositary,
       SUM(minutes_depositary_to_closure<0) AS invalid_closure,
       SUM(dwell_minutes_arrival_to_delivery<0) AS invalid_delivery
FROM vw_cargo_performance;

-- 11. Controle de cobertura da camada analitica.
SELECT (SELECT COUNT(*) FROM cargo) AS cargo_raw,
       (SELECT COUNT(*) FROM vw_cargo_performance) AS cargo_analytics,
       (SELECT COUNT(*) FROM flights) AS flights_raw,
       (SELECT COUNT(*) FROM vw_flight_performance) AS flights_analytics;

-- NAO CALCULADO: dwell operacional limpo, ocupacao por area e operacoes
-- de exportacao exigem eventos de etapas/saldos nao existentes na base.
