-- Airport Cargo Operations Analytics | MySQL 8.0+
-- Dados 100% simulados. Execute este arquivo antes de importar os sete CSVs.
-- CSVs possuem UTF-8 BOM; o assistente de importacao deve usar UTF-8-SIG,
-- separador virgula, primeira linha como cabecalho, NULL para campos vazios.
CREATE DATABASE IF NOT EXISTS airport_cargo_analytics CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE airport_cargo_analytics;

CREATE TABLE IF NOT EXISTS flights (
  flight_id VARCHAR(16) PRIMARY KEY,
  airline VARCHAR(100) NOT NULL,
  flight_number VARCHAR(24) NOT NULL,
  origin_airport VARCHAR(10) NOT NULL,
  aircraft_arrival_datetime DATETIME NOT NULL,
  mantra_closure_datetime DATETIME NOT NULL,
  legal_deadline_hours INT NOT NULL,
  legal_deadline_datetime DATETIME NOT NULL,
  closure_compliance_status VARCHAR(40) NOT NULL,
  operation_shift VARCHAR(24) NOT NULL,
  CHECK (legal_deadline_hours > 0),
  INDEX idx_flights_arrival (aircraft_arrival_datetime),
  INDEX idx_flights_airline (airline)
);

CREATE TABLE IF NOT EXISTS cargo (
  cargo_id VARCHAR(16) PRIMARY KEY,
  flight_id VARCHAR(16) NOT NULL,
  awb_number VARCHAR(32) NOT NULL,
  cargo_type VARCHAR(64) NOT NULL,
  declared_pieces INT NOT NULL,
  received_pieces INT NOT NULL,
  declared_weight_kg DECIMAL(14,2) NOT NULL,
  received_weight_kg DECIMAL(14,2) NOT NULL,
  special_handling_flag VARCHAR(3) NOT NULL,
  dangerous_goods_flag VARCHAR(3) NOT NULL,
  CONSTRAINT fk_cargo_flight FOREIGN KEY (flight_id) REFERENCES flights(flight_id),
  CHECK (declared_pieces >= 0 AND received_pieces >= 0),
  CHECK (declared_weight_kg >= 0 AND received_weight_kg >= 0),
  INDEX idx_cargo_flight (flight_id),
  INDEX idx_cargo_type (cargo_type)
);

CREATE TABLE IF NOT EXISTS manifest (
  manifest_id VARCHAR(16) PRIMARY KEY,
  cargo_id VARCHAR(16) NOT NULL UNIQUE,
  declared_cargo_nature VARCHAR(100) NULL,
  manifest_error_flag VARCHAR(3) NOT NULL,
  manifest_error_type VARCHAR(120) NULL,
  cargo_nature_missing_flag VARCHAR(3) NOT NULL,
  manifest_observation TEXT NULL,
  CONSTRAINT fk_manifest_cargo FOREIGN KEY (cargo_id) REFERENCES cargo(cargo_id)
);

CREATE TABLE IF NOT EXISTS operations (
  operation_id VARCHAR(16) PRIMARY KEY,
  cargo_id VARCHAR(16) NOT NULL UNIQUE,
  physical_receiving_start_datetime DATETIME NOT NULL,
  physical_receiving_end_datetime DATETIME NOT NULL,
  depositary_system_receiving_datetime DATETIME NOT NULL,
  conference_start_datetime DATETIME NOT NULL,
  conference_end_datetime DATETIME NOT NULL,
  required_storage_area VARCHAR(100) NOT NULL,
  actual_storage_area VARCHAR(100) NOT NULL,
  storage_compliance_status VARCHAR(24) NOT NULL,
  CONSTRAINT fk_operations_cargo FOREIGN KEY (cargo_id) REFERENCES cargo(cargo_id)
);

CREATE TABLE IF NOT EXISTS inconsistencies (
  inconsistency_id VARCHAR(16) PRIMARY KEY,
  cargo_id VARCHAR(16) NOT NULL,
  inconsistency_type VARCHAR(120) NOT NULL,
  inconsistency_description TEXT NULL,
  detected_datetime DATETIME NOT NULL,
  resolved_datetime DATETIME NOT NULL,
  rework_flag VARCHAR(3) NOT NULL,
  rework_type VARCHAR(120) NULL,
  responsibility_group VARCHAR(120) NOT NULL,
  controllability_level VARCHAR(64) NOT NULL,
  CONSTRAINT fk_inc_cargo FOREIGN KEY (cargo_id) REFERENCES cargo(cargo_id),
  INDEX idx_inc_cargo (cargo_id),
  INDEX idx_inc_responsibility (responsibility_group)
);

CREATE TABLE IF NOT EXISTS release_process (
  release_id VARCHAR(16) PRIMARY KEY,
  cargo_id VARCHAR(16) NOT NULL UNIQUE,
  customs_release_required VARCHAR(3) NOT NULL,
  customs_release_datetime DATETIME NULL,
  anuence_required VARCHAR(3) NOT NULL,
  anuence_agency VARCHAR(120) NULL,
  anuence_release_datetime DATETIME NULL,
  release_status VARCHAR(60) NOT NULL,
  release_delay_reason VARCHAR(120) NULL,
  release_responsibility_group VARCHAR(120) NOT NULL,
  CONSTRAINT fk_release_cargo FOREIGN KEY (cargo_id) REFERENCES cargo(cargo_id)
);

CREATE TABLE IF NOT EXISTS delivery (
  delivery_id VARCHAR(16) PRIMARY KEY,
  cargo_id VARCHAR(16) NOT NULL UNIQUE,
  cargo_available_datetime DATETIME NOT NULL,
  pickup_request_datetime DATETIME NOT NULL,
  delivery_datetime DATETIME NOT NULL,
  delivery_status VARCHAR(60) NOT NULL,
  delivery_delay_flag VARCHAR(3) NOT NULL,
  delivery_responsibility_group VARCHAR(120) NOT NULL,
  CONSTRAINT fk_delivery_cargo FOREIGN KEY (cargo_id) REFERENCES cargo(cargo_id)
);
-- Nao criar warehouse_flow_events: nao existem observacoes de eventos dessa tabela no dataset.