const path = require("path");
const Database = require("better-sqlite3");
const fs = require("fs");

let db;

function initDatabase(customPath) {
  const dbPath = customPath || path.join(__dirname, "../../programadores_es.db");
  const isNew = !fs.existsSync(dbPath);

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  if (isNew) {
    console.log(" Creando base de datos con esquema mejorado...");
  }

  db.exec(`
    -- Monedas
    CREATE TABLE IF NOT EXISTS Monedas (
      id_moneda   INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL,
      codigo      TEXT NOT NULL UNIQUE,
      simbolo     TEXT
    );

    -- Proyectos
    CREATE TABLE IF NOT EXISTS Proyectos (
      id_proyecto     INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre          TEXT NOT NULL UNIQUE,
      fecha_creacion  DATETIME DEFAULT CURRENT_TIMESTAMP,
      precio_hora     DECIMAL(10,2) CHECK(precio_hora >= 0),
      id_moneda       INTEGER REFERENCES Monedas(id_moneda) ON DELETE SET NULL,
      observaciones   TEXT
    );

    -- Actividades
    CREATE TABLE IF NOT EXISTS Actividades (
      id_actividad          INTEGER PRIMARY KEY AUTOINCREMENT,
      id_proyecto           INTEGER NOT NULL REFERENCES Proyectos(id_proyecto) ON DELETE CASCADE,
      nombre                TEXT NOT NULL,
      fecha_creacion        DATETIME DEFAULT CURRENT_TIMESTAMP,
      estado                TEXT CHECK(estado IN ('Pendiente','En progreso','Pausada','Finalizada')) DEFAULT 'Pendiente',
      tiempo_total_segundos INTEGER DEFAULT 0,
      observaciones         TEXT
    );

    -- Sesiones
    CREATE TABLE IF NOT EXISTS Sesiones (
      id_sesion           INTEGER PRIMARY KEY AUTOINCREMENT,
      id_actividad        INTEGER NOT NULL REFERENCES Actividades(id_actividad) ON DELETE CASCADE,
      inicio              INTEGER NOT NULL,
      fin                 INTEGER,
      duracion_segundos   INTEGER DEFAULT 0,
      CHECK(fin IS NULL OR fin >= inicio),
      CHECK(duracion_segundos >= 0)
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_actividades_proyecto ON Actividades(id_proyecto);
    CREATE INDEX IF NOT EXISTS idx_sesiones_actividad   ON Sesiones(id_actividad);

    -- =============================================================
    -- VISTA DE EXPORTACIÓN (CORREGIDA)
    -- =============================================================
    CREATE VIEW IF NOT EXISTS v_exportacion AS
    SELECT
        s.id_sesion,
        COALESCE(a.nombre, 'Sin Actividad') AS actividad,
        COALESCE(p.nombre, 'Sin proyecto') AS proyecto,
        datetime(s.inicio, 'unixepoch', 'localtime') AS inicio,
        CASE 
            WHEN s.fin IS NOT NULL THEN datetime(s.fin, 'unixepoch', 'localtime')
            ELSE 'En curso'
        END AS fin,
        COALESCE(s.duracion_segundos, s.fin - s.inicio, 0) AS duracion_segundos,
        ROUND(COALESCE(s.duracion_segundos, s.fin - s.inicio, 0) / 3600.0, 2) AS horas
    FROM Sesiones s
    LEFT JOIN Actividades a ON s.id_actividad = a.id_actividad
    LEFT JOIN Proyectos p ON a.id_proyecto = p.id_proyecto
    ORDER BY s.inicio DESC;

    -- Moneda por defecto
    INSERT OR IGNORE INTO Monedas (nombre, codigo, simbolo) VALUES ('Euro', 'EUR', '€');
  `);

  console.log(" Base de datos inicializada correctamente.");
  return db;
}

function getDb() {
  if (!db) throw new Error("La base de datos no está inicializada.");
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    console.log(" Base de datos cerrada.");
    db = null;
  }
}

module.exports = { initDatabase, getDb, closeDatabase };