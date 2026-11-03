-- Base central Cloudflare D1 (SQLite). A exclusao eh logica para preservar auditoria.
CREATE TABLE IF NOT EXISTS registros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  turno TEXT NOT NULL CHECK (turno IN ('08:00', '20:00')),
  palete TEXT NOT NULL CHECK (length(palete) BETWEEN 1 AND 30 AND palete NOT GLOB '*[^A-Z0-9]*'),
  cia TEXT NOT NULL CHECK (length(cia) = 3 AND cia NOT GLOB '*[^0-9]*'),
  criado_em TEXT NOT NULL,
  dispositivo TEXT,
  ativo INTEGER NOT NULL DEFAULT 1 CHECK(ativo IN (0,1)),
  excluido_em TEXT,
  excluido_dispositivo TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_registros_ativos_palete_turno ON registros(data, turno, palete) WHERE ativo = 1;
CREATE INDEX IF NOT EXISTS ix_registros_ativos_data_cia ON registros(data, cia) WHERE ativo = 1;
CREATE INDEX IF NOT EXISTS ix_registros_palete_data ON registros(palete, data, turno) WHERE ativo = 1;
CREATE TABLE IF NOT EXISTS bloqueios_acesso (
  ip_hash TEXT PRIMARY KEY,
  tentativas INTEGER NOT NULL DEFAULT 0,
  iniciado_em INTEGER NOT NULL
);
