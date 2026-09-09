const fs = require("fs");
const path = require("path");
const os = require("os");

let tempDir;
let dbPath;

jest.mock("electron", () => ({
  app: {
    getPath: () => global.__TEST_TEMP_DIR__
  }
}));

const { initDatabase, closeDatabase } = require("../src/main/database/db.js");
const repo = require("../src/main/database/repository.js");

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "control-horas-test-"));
  global.__TEST_TEMP_DIR__ = tempDir;
  dbPath = path.join(tempDir, "test.db");
  initDatabase(dbPath);
});

afterEach(() => {
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function getDb() {
  const { getDb } = require("../src/main/database/db.js");
  return getDb();
}

describe("Repositorio - Monedas", () => {
  test("crearMoneda inserta una moneda", () => {
    const moneda = repo.crearMoneda({ nombre: "Yen", codigo: "JPY", simbolo: "¥" });
    expect(moneda.id_moneda).toBeGreaterThan(0);
    const db = getDb();
    const row = db.prepare("SELECT * FROM Monedas WHERE id_moneda = ?").get(moneda.id_moneda);
    expect(row).toMatchObject({ nombre: "Yen", codigo: "JPY", simbolo: "¥" });
  });

  test("listarMonedas devuelve todas las monedas", () => {
    repo.crearMoneda({ nombre: "Dólar", codigo: "USD", simbolo: "$" });
    repo.crearMoneda({ nombre: "Libra", codigo: "GBP", simbolo: "£" });
    const monedas = repo.listarMonedas();
    // +1 por el EUR sembrado por defecto en initDatabase
    expect(monedas.length).toBe(3);
    expect(monedas.map(m => m.codigo)).toEqual(expect.arrayContaining(["USD", "GBP", "EUR"]));
  });

  test("eliminarMoneda borra una moneda", () => {
    const { id_moneda } = repo.crearMoneda({ nombre: "Libra", codigo: "GBP", simbolo: "£" });
    const result = repo.eliminarMoneda(id_moneda);
    expect(result.eliminado).toBe(true);
    const db = getDb();
    const moneda = db.prepare("SELECT * FROM Monedas WHERE id_moneda = ?").get(id_moneda);
    expect(moneda).toBeUndefined();
  });
});

describe("Repositorio - Proyectos", () => {
  let idMoneda;

  beforeEach(() => {
    idMoneda = repo.crearMoneda({ nombre: "Dólar", codigo: "USD", simbolo: "$" }).id_moneda;
  });

  test("crearProyecto inserta un proyecto", () => {
    const id = repo.crearProyecto({ nombre: "Proyecto Test", precio_hora: 50, id_moneda: idMoneda });
    expect(id).toBeGreaterThan(0);
    const db = getDb();
    const proyecto = db.prepare("SELECT * FROM Proyectos WHERE id_proyecto = ?").get(id);
    expect(proyecto).toMatchObject({ nombre: "Proyecto Test", precio_hora: 50, id_moneda: idMoneda });
  });

  test("listarProyectos devuelve los proyectos con sus monedas", () => {
    repo.crearProyecto({ nombre: "Proyecto A", id_moneda: idMoneda });
    repo.crearProyecto({ nombre: "Proyecto B", id_moneda: null });
    const proyectos = repo.listarProyectos();
    expect(proyectos.length).toBe(2);
    const pA = proyectos.find(p => p.nombre === "Proyecto A");
    expect(pA.moneda_codigo).toBe("USD");
    const pB = proyectos.find(p => p.nombre === "Proyecto B");
    expect(pB.moneda_codigo).toBeNull();
  });

  test("obtenerProyectoId devuelve el id del proyecto por nombre", () => {
    const id = repo.crearProyecto({ nombre: "Proyecto X" });
    const idObtenido = repo.obtenerProyectoId("Proyecto X");
    expect(idObtenido).toBe(id);
    expect(repo.obtenerProyectoId("Inexistente")).toBeNull();
  });

  test("actualizarProyecto modifica los campos permitidos", () => {
    const id = repo.crearProyecto({ nombre: "Viejo", precio_hora: 10 });
    const actualizado = repo.actualizarProyecto(id, { nombre: "Nuevo", precio_hora: 25, observaciones: "cambiado" });
    expect(actualizado.nombre).toBe("Nuevo");
    expect(actualizado.precio_hora).toBe(25);
    expect(actualizado.observaciones).toBe("cambiado");
  });

  test("eliminarProyecto borra un proyecto y cascada actividades/sesiones", () => {
    const idProyecto = repo.crearProyecto({ nombre: "Proyecto A" });
    const idActividad = repo.crearActividad({ id_proyecto: idProyecto, nombre: "Actividad 1" });
    const idSesion = repo.iniciarSesion(idActividad);
    repo.finalizarSesion(idSesion);
    const result = repo.eliminarProyecto(idProyecto);
    expect(result.eliminado).toBe(true);
    const db = getDb();
    const proyecto = db.prepare("SELECT * FROM Proyectos WHERE id_proyecto = ?").get(idProyecto);
    expect(proyecto).toBeUndefined();
    const actividad = db.prepare("SELECT * FROM Actividades WHERE id_actividad = ?").get(idActividad);
    expect(actividad).toBeUndefined();
    const sesion = db.prepare("SELECT * FROM Sesiones WHERE id_sesion = ?").get(idSesion);
    expect(sesion).toBeUndefined();
  });
});

describe("Repositorio - Actividades", () => {
  let idProyecto;

  beforeEach(() => {
    idProyecto = repo.crearProyecto({ nombre: "Proyecto Actividades" });
  });

  test("crearActividad inserta una actividad", () => {
    const id = repo.crearActividad({ id_proyecto: idProyecto, nombre: "Tarea 1", observaciones: "urgente" });
    expect(id).toBeGreaterThan(0);
    const db = getDb();
    const actividad = db.prepare("SELECT * FROM Actividades WHERE id_actividad = ?").get(id);
    expect(actividad).toMatchObject({ id_proyecto: idProyecto, nombre: "Tarea 1", observaciones: "urgente", estado: "Pendiente", tiempo_total_segundos: 0 });
  });

  test("listarActividades devuelve las actividades (opcionalmente filtradas por proyecto)", () => {
    repo.crearActividad({ id_proyecto: idProyecto, nombre: "Tarea A" });
    repo.crearActividad({ id_proyecto: idProyecto, nombre: "Tarea B" });
    const todas = repo.listarActividades();
    expect(todas.length).toBe(2);
    const filtradas = repo.listarActividades(idProyecto);
    expect(filtradas.length).toBe(2);
  });

  test("obtenerActividadId devuelve id por proyecto y nombre", () => {
    const id = repo.crearActividad({ id_proyecto: idProyecto, nombre: "Buscar" });
    const obtenido = repo.obtenerActividadId(idProyecto, "Buscar");
    expect(obtenido).toBe(id);
  });

  test("actualizarActividad modifica campos permitidos", () => {
    const id = repo.crearActividad({ id_proyecto: idProyecto, nombre: "Original" });
    const actual = repo.actualizarActividad(id, { nombre: "Modificado", estado: "En progreso" });
    expect(actual.nombre).toBe("Modificado");
    expect(actual.estado).toBe("En progreso");
  });

  test("eliminarActividad borra una actividad y sus sesiones", () => {
    const idActividad = repo.crearActividad({ id_proyecto: idProyecto, nombre: "Eliminar" });
    const idSesion = repo.iniciarSesion(idActividad);
    repo.finalizarSesion(idSesion);
    const result = repo.eliminarActividad(idActividad);
    expect(result.eliminado).toBe(true);
    const db = getDb();
    const act = db.prepare("SELECT * FROM Actividades WHERE id_actividad = ?").get(idActividad);
    expect(act).toBeUndefined();
    const ses = db.prepare("SELECT * FROM Sesiones WHERE id_sesion = ?").get(idSesion);
    expect(ses).toBeUndefined();
  });

  test("listarUltimasActividades devuelve las N actividades con tiempo total", () => {
    const db = getDb();
    for (let i = 0; i < 3; i++) {
      const idAct = repo.crearActividad({ id_proyecto: idProyecto, nombre: `Act ${i}` });
      const idSes = repo.iniciarSesion(idAct);
      const sesion = db.prepare("SELECT * FROM Sesiones WHERE id_sesion = ?").get(idSes);
      const fin = sesion.inicio + 100; // fin-inicio es lo que suma la query
      db.prepare("UPDATE Sesiones SET fin = ?, duracion_segundos = ? WHERE id_sesion = ?").run(fin, 100, idSes);
      db.prepare("UPDATE Actividades SET tiempo_total_segundos = tiempo_total_segundos + ? WHERE id_actividad = ?").run(100, idAct);
    }
    const ultimas = repo.listarUltimasActividades(2);
    expect(ultimas.length).toBe(2);
    expect(ultimas[0].tiempo_total_segundos).toBe(100);
  });
});

describe("Repositorio - Sesiones (lógica principal)", () => {
  let idActividad;

  beforeEach(() => {
    const idProyecto = repo.crearProyecto({ nombre: "Proyecto Sesiones" });
    idActividad = repo.crearActividad({ id_proyecto: idProyecto, nombre: "Tarea Sesiones" });
  });

  test("iniciarSesion crea una sesión con fin NULL", () => {
    const idSesion = repo.iniciarSesion(idActividad);
    expect(idSesion).toBeGreaterThan(0);
    const db = getDb();
    const sesion = db.prepare("SELECT * FROM Sesiones WHERE id_sesion = ?").get(idSesion);
    expect(sesion.inicio).toBeDefined();
    expect(sesion.fin).toBeNull();
  });

  test("finalizarSesion cierra una sesión específica", () => {
    const idSesion = repo.iniciarSesion(idActividad);
    const db = getDb();
    const ahora = Math.floor(Date.now() / 1000) + 10;
    db.prepare("UPDATE Sesiones SET fin = ?, duracion_segundos = ? WHERE id_sesion = ?").run(ahora, 10, idSesion);
    const resultado = repo.finalizarSesion(idSesion);
    expect(resultado).toBe(false);
    const sesionFinal = db.prepare("SELECT * FROM Sesiones WHERE id_sesion = ?").get(idSesion);
    expect(sesionFinal.fin).not.toBeNull();
    expect(sesionFinal.duracion_segundos).toBe(10);
  });

  test("pausarSesion cierra sesión y actualiza tiempo total de actividad", () => {
    const idSesion = repo.iniciarSesion(idActividad);
    const db = getDb();
    const ahora = Math.floor(Date.now() / 1000);
    db.prepare("UPDATE Sesiones SET inicio = ? WHERE id_sesion = ?").run(ahora - 5, idSesion);
    const resultado = repo.pausarSesion(idActividad);
    expect(resultado.estado).toBe("Pausada");
    const sesionPausada = db.prepare("SELECT * FROM Sesiones WHERE id_sesion = ?").get(idSesion);
    expect(sesionPausada.fin).not.toBeNull();
    expect(sesionPausada.duracion_segundos).toBeGreaterThan(0);
    const actividad = db.prepare("SELECT * FROM Actividades WHERE id_actividad = ?").get(idActividad);
    expect(actividad.tiempo_total_segundos).toBeGreaterThan(0);
  });

  test("reanudarSesion crea una nueva sesión", () => {
    const idSesion1 = repo.iniciarSesion(idActividad);
    repo.pausarSesion(idActividad);
    const idSesion2 = repo.reanudarSesion(idActividad);
    expect(idSesion2).not.toBe(idSesion1);
    const db = getDb();
    const sesiones = db.prepare("SELECT * FROM Sesiones WHERE id_actividad = ?").all(idActividad);
    expect(sesiones.length).toBe(2);
    expect(sesiones[1].fin).toBeNull();
  });

  test("finalizarActividad cierra sesión abierta, suma total y marca actividad como Finalizada", () => {
    const db = getDb();
    const inicio1 = Math.floor(Date.now() / 1000) - 45;
    const fin1 = inicio1 + 45;
    db.prepare("INSERT INTO Sesiones (id_actividad, inicio, fin, duracion_segundos) VALUES (?, ?, ?, ?)")
      .run(idActividad, inicio1, fin1, 45);
    const inicio2 = Math.floor(Date.now() / 1000) - 30;
    const fin2 = inicio2 + 30;
    db.prepare("INSERT INTO Sesiones (id_actividad, inicio, fin, duracion_segundos) VALUES (?, ?, ?, ?)")
      .run(idActividad, inicio2, fin2, 30);
    const actividad = repo.finalizarActividad(idActividad);
    expect(actividad.estado).toBe("Finalizada");
    expect(actividad.tiempo_total_segundos).toBe(75);
  });
});

describe("Repositorio - Búsqueda de actividades", () => {
  let idProyecto;

  beforeEach(() => {
    idProyecto = repo.crearProyecto({ nombre: "Proyecto Busqueda" });
    repo.crearActividad({ id_proyecto: idProyecto, nombre: "Desarrollo" });
    repo.crearActividad({ id_proyecto: idProyecto, nombre: "Desastre" });
    repo.crearActividad({ id_proyecto: idProyecto, nombre: "Documentación" });
    repo.crearActividad({ id_proyecto: idProyecto, nombre: "Tarea" });
  });

  test("buscarActividades sin parámetros devuelve array vacío", () => {
    const resultados = repo.buscarActividades({});
    expect(resultados.length).toBe(0);
  });

  test("buscarActividades con actividad devuelve coincidencias en nombre de actividad", () => {
    const resultados = repo.buscarActividades({ actividad: "desa" });
    expect(resultados.length).toBe(2);
    expect(resultados.map(r => r.actividad)).toEqual(expect.arrayContaining(["Desarrollo", "Desastre"]));
  });

  test("buscarActividades con proyecto devuelve coincidencias en nombre de proyecto", () => {
    const resultados = repo.buscarActividades({ proyecto: "busqueda" });
    expect(resultados.length).toBe(4);
  });

  test("buscarActividades con actividad y proyecto busca en ambos", () => {
    const resultados = repo.buscarActividades({ actividad: "Tarea", proyecto: "Proyecto Busqueda" });
    expect(resultados.length).toBe(1);
    const resultados2 = repo.buscarActividades({ actividad: "Desarrollo", proyecto: "Otro" });
    expect(resultados2.length).toBe(0);
  });
});

describe("Repositorio - Exportación", () => {
  test("exportarDatos devuelve el contenido de v_exportacion", () => {
    const idProyecto = repo.crearProyecto({ nombre: "Export Test" });
    const idActividad = repo.crearActividad({ id_proyecto: idProyecto, nombre: "Actividad Export" });
    const idSesion = repo.iniciarSesion(idActividad);
    const db = getDb();
    const sesion = db.prepare("SELECT * FROM Sesiones WHERE id_sesion = ?").get(idSesion);
    const fin = sesion.inicio + 60;
    db.prepare("UPDATE Sesiones SET fin = ?, duracion_segundos = ? WHERE id_sesion = ?").run(fin, 60, idSesion);
    db.prepare("UPDATE Actividades SET tiempo_total_segundos = 60 WHERE id_actividad = ?").run(idActividad);
    const datos = repo.exportarDatos();
    expect(datos.length).toBe(1);
    expect(datos[0]).toMatchObject({
      actividad: "Actividad Export",
      proyecto: "Export Test",
      duracion_segundos: 60,
      horas: 0.02
    });
  });
});