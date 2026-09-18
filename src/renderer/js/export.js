import { confirmar } from "./confirm-dialog.js";

document.addEventListener("DOMContentLoaded", () => {
  const exportMenuItem = document.getElementById("exportar");

  if (!exportMenuItem) return;

  exportMenuItem.addEventListener("click", async () => {
    try {
      // Pedir los datos al main
      const datos = await window.api.exportar.datos();

      // No hay datos
      if (!datos || datos.length === 0) {
        await confirmar({
          titulo: "No hay datos",
          mensaje: "No hay sesiones en la base de datos para exportar.",
          textoConfirmar: "Aceptar",
          textoCancelar: "Cerrar",
          peligro: true,
        });

        return;
      }

      // Confirmar exportación
      const confirmado = await confirmar({
        titulo: "Exportar sesiones",
        mensaje: `Se van a exportar ${datos.length} sesiones a un archivo CSV. ¿Quieres continuar?`,
        textoConfirmar: "Exportar",
        textoCancelar: "Cancelar",
        peligro: false,
      });

      if (!confirmado) return;

      // Convertir a CSV
      const csv = convertirACSV(datos);

      // Descargar
      descargarCSV(csv, "sesiones_exportadas.csv");

    } catch (error) {
      console.error("Error al exportar:", error);

      await confirmar({
        titulo: "Error al exportar",
        mensaje: "Ha ocurrido un error al intentar exportar las sesiones.",
        textoConfirmar: "Aceptar",
        textoCancelar: "Cerrar",
        peligro: true,
      });
    }
  });
});

function convertirACSV(objetos) {
  if (objetos.length === 0) return "";

  const cabeceras = Object.keys(objetos[0]);

  const filas = objetos.map(obj =>
    cabeceras.map(campo => {
      const valor = obj[campo];

      if (valor == null) return "";

      const str = String(valor);

      if (
        str.includes(",") ||
        str.includes('"') ||
        str.includes("\n")
      ) {
        return `"${str.replace(/"/g, '""')}"`;
      }

      return str;
    }).join(",")
  );

  return [cabeceras.join(","), ...filas].join("\n");
}

function descargarCSV(contenido, nombreArchivo) {
  const blob = new Blob(
    ["\uFEFF" + contenido],
    { type: "text/csv;charset=utf-8;" }
  );

  const enlace = document.createElement("a");
  const url = URL.createObjectURL(blob);

  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.style.display = "none";

  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);
}