const { getDb } = require('./connection');
const crypto = require('crypto');

// Identifica al propietario local de los datos. Reutiliza el machineId para
// que en el futuro se pueda sincronizar entre dispositivos de forma estable.
function getLocalUserId() {
  const os = require('os');
  const info = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || 'unknown',
    os.totalmem().toString(),
  ].join('|');
  return crypto.createHash('sha256').update(info).digest('hex').toUpperCase();
}

function loadLedger() {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT registro, inventario_registro, updated_at FROM cont_ledger_records WHERE user_id = ?',
    )
    .get(getLocalUserId());

  if (!row) {
    return {
      registro: { activeWorkspaceId: '', workspaces: [] },
      inventarioRegistro: null,
      updatedAt: null,
    };
  }

  let registro = { activeWorkspaceId: '', workspaces: [] };
  try {
    registro = JSON.parse(row.registro || '{}');
  } catch (e) {
    console.error('Error parseando registro local:', e);
  }

  let inventarioRegistro = null;
  if (row.inventario_registro) {
    try {
      inventarioRegistro = JSON.parse(row.inventario_registro);
    } catch (e) {
      console.error('Error parseando inventario local:', e);
    }
  }

  return {
    registro,
    inventarioRegistro,
    updatedAt: row.updated_at || null,
  };
}

function saveLedger(registro, inventarioRegistro) {
  const db = getDb();
  const userId = getLocalUserId();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO cont_ledger_records (user_id, registro, inventario_registro, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       registro = excluded.registro,
       inventario_registro = COALESCE(excluded.inventario_registro, cont_ledger_records.inventario_registro),
       updated_at = excluded.updated_at`,
  ).run(
    userId,
    JSON.stringify(registro),
    inventarioRegistro ? JSON.stringify(inventarioRegistro) : null,
    now,
  );

  return { updatedAt: now };
}

module.exports = { loadLedger, saveLedger, getLocalUserId };
