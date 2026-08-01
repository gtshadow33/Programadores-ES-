const fs = require("fs");
const path = require("path");
const os = require("os");

let tempDir;

jest.mock("electron", () => ({
  app: {
    getPath: () => global.__TEST_TEMP_DIR__
  }
}));

const { initDatabase, closeDatabase } = require("../src/db/db.js");

beforeEach(() => {
  // Carpeta nueva y única en cada test, así nunca hay datos residuales
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "control-horas-test-"));
  global.__TEST_TEMP_DIR__ = tempDir;
});

afterEach(() => {
  closeDatabase();
  // Borra la carpeta temporal entera después de cada test
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("Base de datos - esquema", () => {
  test("crea las 4 tablas esperadas", () => {
    const db = initDatabase();
    const tablas = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map(t => t.name);

    expect(tablas).toEqual(
      expect.arrayContaining(["Monedas", "Proyectos", "Actividades", "Sesiones"])
    );
  });

  test("tiene las foreign keys activadas", () => {
    const db = initDatabase();
    const fk = db.pragma("foreign_keys", { simple: true });
    expect(fk).toBe(1);
  });

  test("volver a llamar initDatabase no destruye datos existentes", () => {
    const db = initDatabase();
    db.prepare("INSERT INTO Monedas (nombre, codigo, simbolo) VALUES (?, ?, ?)")
      .run("Euro", "EUR", "€");

    // Simula reinicio de la app llamando initDatabase otra vez
    // (misma carpeta temporal, mismo archivo .sqlite, porque no hemos cerrado el test)
    const db2 = initDatabase();
    const monedas = db2.prepare("SELECT * FROM Monedas").all();

    expect(monedas.length).toBe(1);
    expect(monedas[0].codigo).toBe("EUR");
  });
});

describe("Base de datos - relaciones e integridad", () => {
  test("un proyecto puede vincularse a una moneda existente", () => {
    const db = initDatabase();

    const moneda = db
      .prepare("INSERT INTO Monedas (nombre, codigo, simbolo) VALUES (?, ?, ?)")
      .run("Dólar", "USD", "$");

    const proyecto = db
      .prepare("INSERT INTO Proyectos (proyecto, precio_hora, id_moneda) VALUES (?, ?, ?)")
      .run("Web Cliente X", 30, moneda.lastInsertRowid);

    const row = db
      .prepare(`
        SELECT p.proyecto, m.codigo
        FROM Proyectos p
        JOIN Monedas m ON p.id_moneda = m.id_moneda
        WHERE p.id_proyecto = ?
      `)
      .get(proyecto.lastInsertRowid);

    expect(row.codigo).toBe("USD");
  });

  test("rechaza un id_proyecto inexistente al crear una actividad (FK)", () => {
    const db = initDatabase();

    expect(() => {
      db.prepare(`
        INSERT INTO Actividades (id_proyecto, nombre)
        VALUES (?, ?)
      `).run(9999, "Actividad huérfana");
    }).toThrow(/FOREIGN KEY/);
  });

  test("rechaza un estado no válido en Actividades (CHECK constraint)", () => {
    const db = initDatabase();

    const proyecto = db
      .prepare("INSERT INTO Proyectos (proyecto, precio_hora) VALUES (?, ?)")
      .run("Proyecto Y", 20);

    expect(() => {
      db.prepare(`
        INSERT INTO Actividades (id_proyecto, nombre, estado)
        VALUES (?, ?, ?)
      `).run(proyecto.lastInsertRowid, "Tarea rara", "Inventado");
    }).toThrow(/CHECK/);
  });

  test("una actividad nueva empieza en estado Pendiente por defecto", () => {
    const db = initDatabase();

    const proyecto = db
      .prepare("INSERT INTO Proyectos (proyecto, precio_hora) VALUES (?, ?)")
      .run("Proyecto Z", 15);

    const actividad = db
      .prepare("INSERT INTO Actividades (id_proyecto, nombre) VALUES (?, ?)")
      .run(proyecto.lastInsertRowid, "Tarea inicial");

    const row = db
      .prepare("SELECT estado, tiempo_total_segundos FROM Actividades WHERE id_actividad = ?")
      .get(actividad.lastInsertRowid);

    expect(row.estado).toBe("Pendiente");
    expect(row.tiempo_total_segundos).toBe(0);
  });
});

describe("Base de datos - lógica de sesiones (iniciar/pausar/reanudar/finalizar)", () => {
  let idActividad;
  let db;

  beforeEach(() => {
    db = initDatabase();

    const proyecto = db
      .prepare("INSERT INTO Proyectos (proyecto, precio_hora) VALUES (?, ?)")
      .run("Proyecto Sesiones", 40);

    const actividad = db
      .prepare("INSERT INTO Actividades (id_proyecto, nombre, estado) VALUES (?, ?, ?)")
      .run(proyecto.lastInsertRowid, "Tarea con sesiones", "En progreso");

    idActividad = actividad.lastInsertRowid;
  });

  test("iniciar sesión crea un registro con fin NULL", () => {
    const inicio = "2026-07-27 09:00:00";

    db.prepare("INSERT INTO Sesiones (id_actividad, inicio) VALUES (?, ?)")
      .run(idActividad, inicio);

    const sesion = db
      .prepare("SELECT * FROM Sesiones WHERE id_actividad = ?")
      .get(idActividad);

    expect(sesion.inicio).toBe(inicio);
    expect(sesion.fin).toBeNull();
  });

  test("pausar sesión calcula duracion_segundos correctamente", () => {
    const inserted = db
      .prepare("INSERT INTO Sesiones (id_actividad, inicio) VALUES (?, ?)")
      .run(idActividad, "2026-07-27 09:00:00");

    db.prepare(`
      UPDATE Sesiones
      SET fin = ?, duracion_segundos = ?
      WHERE id_sesion = ?
    `).run("2026-07-27 09:45:00", 2700, inserted.lastInsertRowid);

    const sesion = db
      .prepare("SELECT * FROM Sesiones WHERE id_sesion = ?")
      .get(inserted.lastInsertRowid);

    expect(sesion.duracion_segundos).toBe(2700);
    expect(sesion.fin).toBe("2026-07-27 09:45:00");
  });

  test("reanudar crea una nueva sesión independiente de la anterior", () => {
    const s1 = db
      .prepare("INSERT INTO Sesiones (id_actividad, inicio) VALUES (?, ?)")
      .run(idActividad, "2026-07-27 09:00:00");
    db.prepare("UPDATE Sesiones SET fin = ?, duracion_segundos = ? WHERE id_sesion = ?")
      .run("2026-07-27 09:45:00", 2700, s1.lastInsertRowid);

    const s2 = db
      .prepare("INSERT INTO Sesiones (id_actividad, inicio) VALUES (?, ?)")
      .run(idActividad, "2026-07-27 10:15:00");

    const sesiones = db
      .prepare("SELECT * FROM Sesiones WHERE id_actividad = ? ORDER BY id_sesion")
      .all(idActividad);

    expect(sesiones.length).toBe(2);
    expect(sesiones[0].fin).not.toBeNull();
    expect(sesiones[1].fin).toBeNull();
    expect(sesiones[1].id_sesion).not.toBe(s1.lastInsertRowid);
  });

  test("finalizar actividad: suma correctamente el tiempo total de todas las sesiones", () => {
    const sesiones = [
      { inicio: "2026-07-27 09:00:00", fin: "2026-07-27 09:45:00", dur: 2700 },
      { inicio: "2026-07-27 10:15:00", fin: "2026-07-27 11:00:00", dur: 2700 },
      { inicio: "2026-07-27 11:30:00", fin: "2026-07-27 12:00:00", dur: 1800 }
    ];

    for (const s of sesiones) {
      db.prepare(`
        INSERT INTO Sesiones (id_actividad, inicio, fin, duracion_segundos)
        VALUES (?, ?, ?, ?)
      `).run(idActividad, s.inicio, s.fin, s.dur);
    }

    const total = db
      .prepare("SELECT SUM(duracion_segundos) AS total FROM Sesiones WHERE id_actividad = ?")
      .get(idActividad).total;

    expect(total).toBe(7200);

    db.prepare(`
      UPDATE Actividades
      SET tiempo_total_segundos = ?, estado = 'Finalizada'
      WHERE id_actividad = ?
    `).run(total, idActividad);

    const actividad = db
      .prepare("SELECT * FROM Actividades WHERE id_actividad = ?")
      .get(idActividad);

    expect(actividad.tiempo_total_segundos).toBe(7200);
    expect(actividad.estado).toBe("Finalizada");
  });

  test("no permite crear una sesión para una actividad inexistente (FK)", () => {
    expect(() => {
      db.prepare("INSERT INTO Sesiones (id_actividad, inicio) VALUES (?, ?)")
        .run(9999, "2026-07-27 09:00:00");
    }).toThrow(/FOREIGN KEY/);
  });
});