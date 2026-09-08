const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let db = null;

function getDb() {
  if (db) return db;

  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(app.getPath('userData'), 'gctcp.db');

  db = new DatabaseSync(dbPath);

  // Consejos de rendimiento y consistencia
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA busy_timeout = 5000');

  // Aplicar esquema
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  return db;
}

function closeDb() {
  if (db) {
    try {
      db.close();
    } catch (e) {
      console.error('Error cerrando la BD:', e);
    }
    db = null;
  }
}

module.exports = { getDb, closeDb };
