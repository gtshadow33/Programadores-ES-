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

function listarUltimasActividades(n) {
  const db = getDb();
  const ultimasActividades = db.prepare(`
    SELECT
        a.id_actividad,
        a.nombre AS actividad,
        p.nombre AS proyecto,
        s.fin AS fecha,
        COALESCE(
            SUM(
                CASE
                    WHEN s.fin IS NOT NULL
                    THEN s.fin - s.inicio
                    ELSE 0
                END
            ),
            0
        ) AS tiempo_total_segundos

    FROM Actividades AS a

    JOIN Proyectos AS p
        ON p.id_proyecto = a.id_proyecto

    LEFT JOIN Sesiones AS s
        ON s.id_actividad = a.id_actividad

    GROUP BY
        a.id_actividad,
        a.nombre,
        p.nombre

    ORDER BY MAX(s.fin) DESC
    LIMIT ?;
    `).all(n);

    return ultimasActividades
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
  const db = getDb();
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

function obtenerDatosSesion(idSesion) {
  const db = getDb();
  const result = db.prepare(`
        SELECT
            a.nombre AS nombre_actividad,
            p.nombre AS nombre_proyecto
        FROM Sesiones AS s
        INNER JOIN Actividades AS a
            ON s.id_actividad = a.id_actividad
        INNER JOIN Proyectos AS p
            ON a.id_proyecto = p.id_proyecto
        WHERE s.id_sesion = ?
    `).get(idSesion);
  
  return result;
}

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

// =====================================================================
// BÚSQUEDA DE ACTIVIDADES (NUEVA FUNCIÓN)
// =====================================================================

function buscarActividades({ actividad = null, proyecto = null }, limite = 10) {
  const db = getDb();  //  AGREGADO: Obtener la conexión a la base de datos
  
  // Si no hay búsqueda válida, retornar vacío
  if (!actividad && !proyecto) {
    return [];
  }
  
  // Construir patrones LIKE
  const likeActividad = actividad ? `%${actividad.toLowerCase()}%` : null;
  const likeProyecto = proyecto ? `%${proyecto.toLowerCase()}%` : null;
  
  // Base de la consulta
  let query = `
    SELECT
      a.id_actividad,
      a.nombre AS actividad,
      p.nombre AS proyecto,
      MAX(s.fin) AS ultima_sesion
    FROM Actividades a
    JOIN Proyectos p ON p.id_proyecto = a.id_proyecto
    LEFT JOIN Sesiones s ON s.id_actividad = a.id_actividad
    WHERE 1=1
  `;
  
  const params = [];
  
  // Condiciones según los parámetros recibidos
  if (actividad && proyecto) {
    // Caso: actividad@proyecto → buscar en AMBOS
    query += ` AND LOWER(a.nombre) LIKE ? AND LOWER(p.nombre) LIKE ?`;
    params.push(likeActividad, likeProyecto);
  } else if (actividad) {
    // Caso: solo actividad → buscar en actividad O proyecto
    query += ` AND (LOWER(a.nombre) LIKE ? OR LOWER(p.nombre) LIKE ?)`;
    params.push(likeActividad, likeActividad);
  } else if (proyecto) {
    // Caso: solo proyecto → buscar en proyecto
    query += ` AND LOWER(p.nombre) LIKE ?`;
    params.push(likeProyecto);
  }
  
  // GROUP BY y ORDER BY
  query += `
    GROUP BY a.id_actividad, a.nombre, p.nombre
    ORDER BY 
      CASE 
        WHEN LOWER(a.nombre) LIKE ? THEN 0
        WHEN LOWER(p.nombre) LIKE ? THEN 1
        ELSE 2
      END,
      ultima_sesion DESC,
      a.nombre ASC
    LIMIT ?
  `;
  
  // Parámetros para ORDER BY
  params.push(likeActividad || '%%', likeProyecto || '%%');
  params.push(limite);
  
  //  AHORA db está definida gracias a getDb()
  return db.prepare(query).all(...params);
}

// =====================================================================
// EXPORTACIONES
// =====================================================================

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
  listarUltimasActividades,
  obtenerActividad,
  obtenerActividadId,
  actualizarActividad,
  eliminarActividad,
  buscarActividades,
  // Sesiones
  iniciarSesion,
  obtenerDatosSesion,
  pausarSesion,
  reanudarSesion,
  finalizarSesion,
  finalizarActividad,
  listarSesiones
};