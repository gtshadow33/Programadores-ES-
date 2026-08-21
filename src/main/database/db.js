const path = require("path");
const { app } = require("electron");
const Database = require("better-sqlite3");

let db;

function initDatabase() {
   //./porgarmadores_es.db
  const dbPath = path.join(__dirname, "../../programadores_es.db");
  const isNew = !require("fs").existsSync(dbPath);

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  if (isNew) {
    console.log("Base de datos no existe, creando esquema...");
  }

  // CREATE TABLE IF NOT EXISTS es idempotente,
  // así que lo dejamos correr siempre (no pasa nada si ya existe)
  db.exec(`
    CREATE TABLE IF NOT EXISTS Monedas (
      id_moneda   INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL,
      codigo      TEXT NOT NULL UNIQUE,
      simbolo     TEXT
    );

    CREATE TABLE IF NOT EXISTS Proyectos (
      id_proyecto     INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre          TEXT NOT NULL,
      fecha_creacion  DATETIME DEFAULT CURRENT_TIMESTAMP,
      precio_hora     DECIMAL(10,2),
      id_moneda       INTEGER,
      observaciones   TEXT,
      FOREIGN KEY (id_moneda) REFERENCES Monedas(id_moneda)
    );

    CREATE TABLE IF NOT EXISTS Actividades (
      id_actividad          INTEGER PRIMARY KEY AUTOINCREMENT,
      id_proyecto           INTEGER NOT NULL,
      nombre                TEXT NOT NULL,
      fecha_creacion        DATETIME DEFAULT CURRENT_TIMESTAMP,
      estado                TEXT CHECK(estado IN ('Pendiente','En progreso','Pausada','Finalizada')) DEFAULT 'Pendiente',
      tiempo_total_segundos INTEGER DEFAULT 0,
      observaciones         TEXT,
      FOREIGN KEY (id_proyecto) REFERENCES Proyectos(id_proyecto)
    );

    CREATE TABLE IF NOT EXISTS Sesiones (
      id_sesion           INTEGER PRIMARY KEY AUTOINCREMENT,
      id_actividad        INTEGER NOT NULL,
      inicio              INTEGER NOT NULL,
      fin                 INTEGER,
      FOREIGN KEY (id_actividad) REFERENCES Actividades(id_actividad)
    );

    INSERT OR IGNORE INTO Monedas (nombre, codigo, simbolo)
    VALUES ('Euro', 'EUR', '€');
  `);

  return db;
}

function getDb() {
  if (!db) throw new Error("La base de datos no está inicializada todavía.");
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    console.log("Base de datos cerrada correctamente.");
    db = null;
  }
}

module.exports = { initDatabase, getDb, closeDatabase };