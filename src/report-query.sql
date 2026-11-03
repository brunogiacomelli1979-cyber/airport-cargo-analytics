-- Sequencia calculada sem depender de cache, incluindo meses anteriores.
WITH ordenados AS (
 SELECT data, turno, palete, cia,
        LAG(cia) OVER (PARTITION BY palete ORDER BY data, turno) AS cia_anterior,
        LAG(data) OVER (PARTITION BY palete ORDER BY data, turno) AS data_anterior,
        LAG(turno) OVER (PARTITION BY palete ORDER BY data, turno) AS turno_anterior
 FROM registros WHERE ativo = 1 AND data < ?1
),
 limites AS (
 SELECT *, CASE WHEN cia_anterior = cia AND
   ((strftime('%s', data) - strftime('%s', data_anterior)) / 43200
     + CASE WHEN turno='20:00' THEN 1 ELSE 0 END
     - CASE WHEN turno_anterior='20:00' THEN 1 ELSE 0 END) = 1
   THEN 0 ELSE 1 END AS inicio_sequencia
 FROM ordenados
),
 grupos AS (
 SELECT *, SUM(inicio_sequencia) OVER
   (PARTITION BY palete ORDER BY data, turno ROWS UNBOUNDED PRECEDING) AS grupo
 FROM limites
),
 sequencias AS (
 SELECT *, ROW_NUMBER() OVER
    (PARTITION BY palete, grupo ORDER BY data, turno) AS numero_sequencia
 FROM grupos
)
SELECT cia, palete,
 COUNT(*) AS periodos_registrados,
 MAX(numero_sequencia) AS maior_sequencia,
 SUM(CASE WHEN numero_sequencia >= 3 THEN 1 ELSE 0 END) AS periodos_cobraveis,
 MIN(data || ' ' || turno) AS primeiro_registro,
 MAX(data || ' ' || turno) AS ultimo_registro
FROM sequencias
WHERE data >= ?2 AND data < ?1 AND cia = ?3
GROUP BY cia,palete
HAVING periodos_cobraveis > 0
ORDER BY cia,palete;
