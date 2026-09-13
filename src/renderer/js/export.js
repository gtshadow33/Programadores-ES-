// export.js
document.addEventListener("DOMContentLoaded", () => {
  const exportMenuItem = document.getElementById("exportar");   // ← CAMBIO
  if (!exportMenuItem) return;

  exportMenuItem.addEventListener("click", async () => {
    try {
      // 1. Pedir los datos al main
      const datos = await window.api.exportar.datos();

      if (!datos || datos.length === 0) {
        alert("No hay datos para exportar.");
        return;
      }

      // 2. Convertir a CSV
      const csv = convertirACSV(datos);

      // 3. Descargar
      descargarCSV(csv, "sesiones_exportadas.csv");
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Hubo un error al exportar los datos.");
    }
  });
});

// Función para convertir array de objetos a CSV
function convertirACSV(objetos) {
  if (objetos.length === 0) return "";

  const cabeceras = Object.keys(objetos[0]);
  const filas = objetos.map(obj =>
    cabeceras.map(campo => {
      let valor = obj[campo];
      if (valor == null) return "";
      const str = String(valor);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );

  return [cabeceras.join(","), ...filas].join("\n");
}

// Función para descargar el archivo CSV
function descargarCSV(contenido, nombreArchivo) {
  const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
  const enlace = document.createElement("a");
  const url = URL.createObjectURL(blob);
  enlace.setAttribute("href", url);
  enlace.setAttribute("download", nombreArchivo);
  enlace.style.display = "none";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}