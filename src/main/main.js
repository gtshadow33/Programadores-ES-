const { app, BrowserWindow, ipcMain } = require("electron");
const { initDatabase, closeDatabase } = require("./database/db");
const repo = require("./database/repository");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  mainWindow.loadFile("./src/renderer/index.html");

  mainWindow.webContents.openDevTools(); // Descomenta para abrir las herramientas de desarrollo
}

app.whenReady().then(() => {
  initDatabase(); 
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


app.on("before-quit", () => {
  closeDatabase();
});


app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ===================== IPC =====================

ipcMain.on("saludar", (event, nombre) => {
  console.log(`Hola ${nombre}`);
});

// ---------------------------------------------------------------------
// IPC asíncrono (ipcMain.handle <-> ipcRenderer.invoke)
//
// Cada handler delega en repository.js. Si la función de repositorio
// lanza un error (p.ej. FK inexistente, sesión ya abierta...), Electron
// serializa ese error y llega como Promise rechazada al renderer, así
// que basta con dejar que se propague — no hace falta un try/catch aquí.
// ---------------------------------------------------------------------

function registrarHandler(canal, fn) {
  ipcMain.handle(canal, async (event, ...args) => fn(...args));
}

// Monedas
registrarHandler("monedas:crear", repo.crearMoneda);
registrarHandler("monedas:listar", repo.listarMonedas);
registrarHandler("monedas:eliminar", repo.eliminarMoneda);

// Proyectos
registrarHandler("proyectos:crear", repo.crearProyecto);
registrarHandler("proyectos:listar", repo.listarProyectos);
registrarHandler("proyectos:obtener", repo.obtenerProyecto);
registrarHandler("proyectos:obtenerId", repo.obtenerProyectoId);
registrarHandler("proyectos:actualizar", repo.actualizarProyecto);
registrarHandler("proyectos:eliminar", repo.eliminarProyecto);

// Actividades
registrarHandler("actividades:crear", repo.crearActividad);
registrarHandler("actividades:listar", repo.listarActividades);
registrarHandler("actividades:listarUltimas", repo.listarUltimasActividades);
registrarHandler("actividades:obtener", repo.obtenerActividad);
registrarHandler("actividades:obtenerId", repo.obtenerActividadId);
registrarHandler("actividades:actualizar", repo.actualizarActividad);
registrarHandler("actividades:eliminar", repo.eliminarActividad);

// Sesiones (cronómetro)
registrarHandler("sesiones:iniciar", repo.iniciarSesion);
registrarHandler("sesiones:obtenerDatos", repo.obtenerDatosSesion);
registrarHandler("sesiones:pausar", repo.pausarSesion);
registrarHandler("sesiones:reanudar", repo.reanudarSesion);
registrarHandler("sesiones:finalizar", repo.finalizarSesion);
// registrarHandler("sesiones:finalizar", repo.finalizarActividad);
registrarHandler("sesiones:listar", repo.listarSesiones);