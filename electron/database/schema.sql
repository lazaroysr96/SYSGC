-- Esquema SQLite para GCTCP Desktop (SYSGC)
-- Almacena el CloudLedgerContainer como JSON (equivalente al JSONB del servidor).
-- En fases posteriores se puede normalizar a tablas espejo de Room v24.
--
-- user_id: identificador del "propietario" local (machineId) para futura
--          multiusuario / sync multi-dispositivo.

CREATE TABLE IF NOT EXISTS cont_ledger_records (
  user_id             TEXT PRIMARY KEY,
  registro            TEXT NOT NULL DEFAULT '{}',
  inventario_registro TEXT,
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Versión de esquema (para migraciones numeradas futuras, patrón Room).
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
