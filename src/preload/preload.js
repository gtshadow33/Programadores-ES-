const { contextBridge, ipcRenderer } = require("electron");

// Pequeño helper para no repetir ipcRenderer.invoke(canal, ...) en cada método.
const invocar = (canal) => (...args) => ipcRenderer.invoke(canal, ...args);

contextBridge.exposeInMainWorld("api", {

  // Legado (síncrono, fire-and-forget) — se mantiene por compatibilidad
  saludar(nombre) {
    ipcRenderer.send("saludar", nombre);
  },

  // ------------------------------------------------------------------
  // Monedas
  // ------------------------------------------------------------------
  monedas: {
    crear: invocar("monedas:crear"),
    listar: invocar("monedas:listar"),
    eliminar: invocar("monedas:eliminar")
  },

  // ------------------------------------------------------------------
  // Proyectos
  // ------------------------------------------------------------------
  proyectos: {
    crear: invocar("proyectos:crear"),
    listar: invocar("proyectos:listar"),
    obtener: invocar("proyectos:obtener"),
    obtenerId: invocar("proyectos:obtenerId"),
    actualizar: invocar("proyectos:actualizar"),
    eliminar: invocar("proyectos:eliminar")
  },

  // ------------------------------------------------------------------
  // Actividades
  // ------------------------------------------------------------------
  actividades: {
    crear: invocar("actividades:crear"),
    listar: invocar("actividades:listar"),
    obtener: invocar("actividades:obtener"),
    obtenerId: invocar("actividades:obtenerId"),
    actualizar: invocar("actividades:actualizar"),
    eliminar: invocar("actividades:eliminar")
  },

  // ------------------------------------------------------------------
  // Sesiones (cronómetro: iniciar / pausar / reanudar / finalizar)
  // ------------------------------------------------------------------
  sesiones: {
    iniciar: invocar("sesiones:iniciar"),
    pausar: invocar("sesiones:pausar"),
    reanudar: invocar("sesiones:reanudar"),
    finalizar: invocar("sesiones:finalizar"),
    listar: invocar("sesiones:listar")
  }

});
