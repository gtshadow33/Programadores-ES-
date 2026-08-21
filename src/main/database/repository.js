const { getDb } = require("../database/db");

// =====================================================================
// MONEDAS
// =====================================================================

function crearMoneda({ nombre, codigo, simbolo }) {
  const db = getDb();
  const info = db
    .prepare("INSERT INTO Monedas (nombre, codigo, simbolo) VALUES (?, ?, ?)")
    .run(nombre, codigo, simbolo ?? null);
  return db.prepare("SELECT * FROM Monedas WHERE id_moneda = ?").get(info.lastInsertRowid);
}

function listarMonedas() {
  const db = getDb();
  return db.prepare("SELECT * FROM Monedas ORDER BY nombre").all();
}

function eliminarMoneda(id_moneda) {
  const db = getDb();
  const info = db.prepare("DELETE FROM Monedas WHERE id_moneda = ?").run(id_moneda);
  return { eliminado: info.changes > 0 };
}

// =====================================================================
// PROYECTOS
// =====================================================================

function crearProyecto({ nombre, precio_hora = null, id_moneda = null, observaciones = null }) {
  const db = getDb();
  const info = db
    .prepare(`
      INSERT INTO Proyectos (nombre, precio_hora, id_moneda, observaciones)
      VALUES (?, ?, ?, ?)
    `)
    .run(nombre, precio_hora, id_moneda, observaciones);
  return info.lastInsertRowid;
}

function obtenerProyectoId(nombre){
  const db = getDb();
  const project = db
    .prepare(`
      SELECT id_proyecto
      FROM Proyectos
      WHERE nombre = ?
      `)
      .get(nombre);
  
  return project ? project.id_proyecto : null;
}

function listarProyectos() {
  const db = getDb();
  return db
    .prepare(`
      SELECT p.*, m.codigo AS moneda_codigo, m.simbolo AS moneda_simbolo
      FROM Proyectos p
      LEFT JOIN Monedas m ON p.id_moneda = m.id_moneda
      ORDER BY p.fecha_creacion DESC
    `)
    .all();
}

function obtenerProyecto(id_proyecto) {
  const db = getDb();
  return db
    .prepare(`
      SELECT p.*, m.codigo AS moneda_codigo, m.simbolo AS moneda_simbolo
      FROM Proyectos p
      LEFT JOIN Monedas m ON p.id_moneda = m.id_moneda
      WHERE p.id_proyecto = ?
    `)
    .get(id_proyecto);
}

function actualizarProyecto(id_proyecto, campos) {
  const db = getDb();
  const permitidos = ["proyecto", "precio_hora", "id_moneda", "observaciones"];
  const claves = Object.keys(campos).filter((k) => permitidos.includes(k));

  if (claves.length === 0) return obtenerProyecto(id_proyecto);

  const set = claves.map((k) => `${k} = ?`).join(", ");
  const valores = claves.map((k) => campos[k]);

  db.prepare(`UPDATE Proyectos SET ${set} WHERE id_proyecto = ?`).run(...valores, id_proyecto);
  return obtenerProyecto(id_proyecto);
}

function eliminarProyecto(id_proyecto) {
  const db = getDb();
  const info = db.prepare("DELETE FROM Proyectos WHERE id_proyecto = ?").run(id_proyecto);
  return { eliminado: info.changes > 0 };
}

// =====================================================================
// ACTIVIDADES
// =====================================================================

function crearActividad({ id_proyecto, nombre, observaciones = null }) {
  const db = getDb();
  const info = db
    .prepare(`
      INSERT INTO Actividades (id_proyecto, nombre, observaciones)
      VALUES (?, ?, ?)
    `)
    .run(id_proyecto, nombre, observaciones);
  return info.lastInsertRowid;
}

function obtenerActividadId(id_proyecto, nombre) {
  const db = getDb();
  const actividad = db
    .prepare(`
      SELECT id_actividad 
      FROM Actividades
      WHERE id_proyecto = ? 
        AND  nombre = ?
    `)
    .get(id_proyecto, nombre);
  
    return actividad ? actividad.id_actividad : null;
}

function listarActividades(id_proyecto = null) {
  const db = getDb();
  if (id_proyecto) {
    return db
      .prepare("SELECT * FROM Actividades WHERE id_proyecto = ? ORDER BY fecha_creacion DESC")
      .all(id_proyecto);
  }
  return db.prepare("SELECT * FROM Actividades ORDER BY fecha_creacion DESC").all();
}

function obtenerActividad(id_actividad) {
  const db = getDb();
  return db.prepare("SELECT * FROM Actividades WHERE id_actividad = ?").get(id_actividad);
}

function actualizarActividad(id_actividad, campos) {
  const db = getDb();
  const permitidos = ["nombre", "estado", "observaciones"];
  const claves = Object.keys(campos).filter((k) => permitidos.includes(k));

  if (claves.length === 0) return obtenerActividad(id_actividad);

  const set = claves.map((k) => `${k} = ?`).join(", ");
  const valores = claves.map((k) => campos[k]);

  db.prepare(`UPDATE Actividades SET ${set} WHERE id_actividad = ?`).run(...valores, id_actividad);
  return obtenerActividad(id_actividad);
}

function eliminarActividad(id_actividad) {
  const db = getDb();
  const info = db.prepare("DELETE FROM Actividades WHERE id_actividad = ?").run(id_actividad);
  return { eliminado: info.changes > 0 };
}

// =====================================================================
// SESIONES (control del cronómetro)
// =====================================================================

function sesionAbierta(id_actividad) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM Sesiones WHERE id_actividad = ? AND fin IS NULL")
    .get(id_actividad);
}

function iniciarSesion(id_actividad) {
  const db  = getDb();
  const result = db
    .prepare(`
      INSERT INTO Sesiones (id_actividad, inicio)
      VALUES (?, strftime('%s', 'now'))
    `)
    .run(id_actividad);
  
  return result.lastInsertRowid;
}

function finalizarSesion(id_sesion) {
  const db = getDb();
  const result = db
    .prepare(`
      UPDATE Sesiones 
      SET 
        fin = strftime('%s', 'now') 
      WHERE id_sesion = ? AND fin IS NULL
      `)
    .run(id_sesion);
  return result.changes > 0;
}


// Considerar esta funcion cuando se implemente un TODO list en la app
// function iniciarSesion(id_actividad) {
//   const db = getDb();

//   const ejecutar = db.transaction(() => {
//     const abierta = sesionAbierta(id_actividad);
//     if (abierta) {
//       throw new Error("Ya existe una sesión abierta para esta actividad.");
//     }
//     // Changing from datetime('now', 'localtime') to strftime('%s', 'now')
//     // in order to have timestamp instead of datetime format
//     const info = db
//       .prepare("INSERT INTO Sesiones (id_actividad, inicio) VALUES (?, strftime('%s', 'now'))")
//       .run(id_actividad);chro

//     db.prepare("UPDATE Actividades SET estado = 'En progreso' WHERE id_actividad = ?").run(id_actividad);

//     return db.prepare("SELECT * FROM Sesiones WHERE id_sesion = ?").get(info.lastInsertRowid);
//   });

//   return ejecutar();
// }

function pausarSesion(id_actividad) {
  const db = getDb();

  const ejecutar = db.transaction(() => {
    const sesion = sesionAbierta(id_actividad);
    if (!sesion) {
      throw new Error("No hay ninguna sesión abierta para esta actividad.");
    }

    db.prepare(`
      UPDATE Sesiones
      SET fin = datetime('now', 'localtime'),
          duracion_segundos = CAST(
            (julianday(datetime('now', 'localtime')) - julianday(inicio)) * 86400 AS INTEGER
          )
      WHERE id_sesion = ?
    `).run(sesion.id_sesion);

    const sesionCerrada = db
      .prepare("SELECT * FROM Sesiones WHERE id_sesion = ?")
      .get(sesion.id_sesion);

    db.prepare(`
      UPDATE Actividades
      SET estado = 'Pausada',
          tiempo_total_segundos = tiempo_total_segundos + ?
      WHERE id_actividad = ?
    `).run(sesionCerrada.duracion_segundos, id_actividad);

    return sesionCerrada;
  });

  return ejecutar();
}

// Reanudar es semánticamente idéntico a iniciar: abre una sesión nueva
// e independiente de las anteriores. Se expone con nombre propio porque
// desde la UI representa una acción distinta (retomar vs empezar de cero).
function reanudarSesion(id_actividad) {
  return iniciarSesion(id_actividad);
}

function finalizarActividad(id_actividad) {
  const db = getDb();

  const ejecutar = db.transaction(() => {
    const abierta = sesionAbierta(id_actividad);
    if (abierta) {
      pausarSesion(id_actividad);
    }

    const total = db
      .prepare("SELECT COALESCE(SUM(duracion_segundos), 0) AS total FROM Sesiones WHERE id_actividad = ?")
      .get(id_actividad).total;

    db.prepare(`
      UPDATE Actividades
      SET estado = 'Finalizada', tiempo_total_segundos = ?
      WHERE id_actividad = ?
    `).run(total, id_actividad);

    return obtenerActividad(id_actividad);
  });

  return ejecutar();
}

function listarSesiones(id_actividad) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM Sesiones WHERE id_actividad = ? ORDER BY id_sesion")
    .all(id_actividad);
}

module.exports = {
  // Monedas
  crearMoneda,
  listarMonedas,
  eliminarMoneda,
  // Proyectos
  crearProyecto,
  listarProyectos,
  obtenerProyecto,
  obtenerProyectoId,
  actualizarProyecto,
  eliminarProyecto,
  // Actividades
  crearActividad,
  listarActividades,
  obtenerActividad,
  obtenerActividadId,
  actualizarActividad,
  eliminarActividad,
  // Sesiones
  iniciarSesion,
  pausarSesion,
  reanudarSesion,
  finalizarSesion,
  finalizarActividad,
  listarSesiones
};