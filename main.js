const { app, BrowserWindow, ipcMain } = require("electron");
const { initDatabase, closeDatabase } = require("./db");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");

  // mainWindow.webContents.openDevTools(); // Descomenta para abrir las herramientas de desarrollo
}

app.whenReady().then(() => {
  initDatabase(); 
  console.log("BBDD guardada en:", path.join(app.getPath("userData"), "control_horas.sqlite"));
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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