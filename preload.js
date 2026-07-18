const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

  saludar(nombre) {
    ipcRenderer.send("saludar", nombre);
  }

});