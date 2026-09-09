const startButton = document.getElementById("counter");
const stopButton = document.getElementById("stop");
const timerBox = document.getElementById("timer-box");
const activityDetailsDiv = document.getElementById("activity-details-div");
const activeActivityBox = document.getElementById("active-activity");
const activeProjectBox = document.getElementById("active-project");
import { DEFAULT_ACTIVITY, DEFAULT_PROJECT} from "./defaultValues.js";
import { getHistory } from "./historial.js";



// Informacion que vine de activity de sidebar.ja
document.addEventListener("activity:select", (e) => {
    const { actividad, project } = e.detail;

    console.log("Actividad recibida:", actividad);
    console.log("Proyecto recibido:", project);

    if (!actividad || !project) return;

    activityInput.value = `${actividad.nombre}@${project.nombre}`;

    hideSuggestions();

    activityInput.focus();
});

// ============ AUTOCMPLETADO ============
const activityInput = document.getElementById("activity-details");
const suggestionBox = document.getElementById("suggestion-box");
let suggestions = [];
let selectedIndex = -1;

//  Parsear input para separar por @
function parseSearchInput(texto) {
  if (!texto.includes("@")) {
    return { actividad: texto.trim() || null, proyecto: null };
  }
  
  const partes = texto.split("@");
  return {
    actividad: partes[0].trim() || null,
    proyecto: partes[1]?.trim() || null
  };
}

//  MODIFICADO: Ahora envía objeto con actividad y proyecto separados
async function fetchSuggestions(text) {
  if (text.trim().length < 2) {
    hideSuggestions();
    return;
  }
  
  try {
    // Parsear input para separar por @
    const { actividad, proyecto } = parseSearchInput(text);
    
    // Si no hay búsqueda válida, no buscar
    if (!actividad && !proyecto) {
      hideSuggestions();
      return;
    }
    
    // Enviar ambos parámetros al backend
    const results = await window.api.actividades.buscar({
      actividad: actividad || '',
      proyecto: proyecto || '',
      texto: text
    });
    
    suggestions = results;
    
    if (suggestions.length > 0) {
      renderSuggestions();
      selectedIndex = -1;
    } else {
      hideSuggestions();
    }
  } catch (error) {
    console.error("Error al buscar sugerencias:", error);
  }
}

function renderSuggestions() {
  suggestionBox.innerHTML = "";
  suggestions.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "px-3 py-2 cursor-pointer hover:bg-slate-100 text-slate-700";
    if (idx === selectedIndex) {
      div.classList.add("bg-slate-200");
    }
    div.textContent = `${item.actividad}@${item.proyecto}`;
    div.addEventListener("click", () => selectSuggestion(idx));
    suggestionBox.appendChild(div);
  });
  suggestionBox.classList.remove("hidden");
}

function hideSuggestions() {
  suggestionBox.classList.add("hidden");
  suggestions = [];
  selectedIndex = -1;
}

function selectSuggestion(index) {
  const item = suggestions[index];
  if (!item) return;
  activityInput.value = `${item.actividad}@${item.proyecto}`;
  hideSuggestions();
}

// Eventos del input
activityInput.addEventListener("input", (e) => {
  fetchSuggestions(e.target.value);
});



activityInput.addEventListener("keydown", (e) => {
  if (suggestionBox.classList.contains("hidden")) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
    renderSuggestions();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex = Math.max(selectedIndex - 1, 0);
    renderSuggestions();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (selectedIndex >= 0) {
      selectSuggestion(selectedIndex);
    }
  } else if (e.key === "Escape") {
    hideSuggestions();
  }
});

// Ocultar al hacer clic fuera
document.addEventListener("click", (e) => {
  if (!e.target.closest("#activity-details-div")) {
    hideSuggestions();
  }
});
// ============ FIN AUTOCMPLETADO ============

let currentSession = {
    activityId: null,
    sessionId: null,
    timerStamp: null,
    startTime: null,
    elapsedTime: 0,
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds/1000);
    const hours = Math.floor(totalSeconds/3600);
    const minutes = Math.floor((totalSeconds % 3600)/60);
    const seconds = totalSeconds % 60;
    
    const lstTime = [hours, minutes, seconds].map(value => String(value).padStart(2,"0"))
    if (hours == "00") {
        return lstTime.slice(1).join(":");
    }

    return lstTime.join(":");
}

function updateTimer() {
    const now = Date.now();

    currentSession.elapsedTime = now - currentSession.startTime;
    timerBox.textContent = formatTime(currentSession.elapsedTime);
}

function splitActivityDetails(activityDetails) {
    let activity;
    let project;

    if (activityDetails.trim() === "") {
        activity = DEFAULT_ACTIVITY.nombre;
        project = DEFAULT_PROJECT.nombre;
        return {activity, project};
    }
    
    const lst = activityDetails.split("@");
    if (lst.length == 1){
        activity = lst[0].trim();
        project = DEFAULT_PROJECT.nombre;
    }

    if (lst.length > 1) {
        activity = lst[0].trim();
        project = lst[1].trim();
    }

    return {activity, project}; 
}

startButton.addEventListener("click", async () => {
    // verificar si existe una sesion corriendo
    if (currentSession.timerStamp != null){
        return
    }

    // Deshabilitar botones
    startButton.disabled = true;
    stopButton.disabled = true;

    try {
        const activityDetailsStr = document.getElementById("activity-details").value;
        const session = splitActivityDetails(activityDetailsStr);
        
        // Revisar si el proyecto existe
        let projectId = await window.api.proyectos.obtenerId(session.project);
        
        if (!projectId) {
            const projectData = {
                nombre: session.project,
                precio_hora: DEFAULT_PROJECT.precio_hora,
                id_moneda: DEFAULT_PROJECT.id_moneda,
            }
            projectId = await window.api.proyectos.crear(projectData)
        }
        
        // Verificar si existe la actividad
        let activityId = await window.api.actividades.obtenerId(projectId, session.activity);

        if (!activityId){
            const activityData = {
                id_proyecto: projectId,
                nombre: session.activity,
            }
            activityId = await window.api.actividades.crear(activityData);
        }

        // Crear nueva sesion en la base de datos
        const newSessionId = await window.api.sesiones.iniciar(activityId)

        if (!newSessionId) {
            console.log("No se pudo crear la sesion.")
            return;
        }

        currentSession.activityId = activityId;
        currentSession.sessionId = newSessionId;
        currentSession.startTime = Date.now();
        currentSession.timerStamp = setInterval(updateTimer, 250);

        activeActivityBox.hidden = false;
        activeActivityBox.textContent = session.activity;

        activeProjectBox.hidden = false;
        activeProjectBox.textContent = session.project;

        activityDetailsDiv.hidden = true;
        startButton.hidden = true;
        stopButton.hidden = false;

    } catch (error) {
        console.error("Error al crear el sesion:", error);
        currentSession.activityId = null;
        currentSession.sessionId = null;
        currentSession.startTime = null;

        if (currentSession.timerStamp != null) {
            clearInterval(currentSession.timerStamp);
            currentSession.timerStamp = null;
        }
    } finally {
        startButton.disabled = false;
        stopButton.disabled = false;
    }
});

stopButton.addEventListener("click", async () => {
    // Verificar que haya sesion activa
    if (currentSession.timerStamp == null) {
        return;
    }

    startButton.disabled = true;
    stopButton.disabled = true;

    try {
        if (currentSession.sessionId == null) {
            console.log("No hay una sesion activa.");
            return;
        }

        const isSessionFinished = await window.api.sesiones.finalizar(currentSession.sessionId);
        
        if (!isSessionFinished) {
            console.log("La sesion no se cerro correctamente");
            return;
        }

        clearInterval(currentSession.timerStamp);
        currentSession.timerStamp = null;

        currentSession.elapsedTime = 0;
        timerBox.textContent = "00:00";
        
        currentSession.sessionId = null;
        currentSession.activityId = null;
        currentSession.startTime = null;

        startButton.hidden = false;
        stopButton.hidden = true;

        activeActivityBox.hidden = true;
        activeActivityBox.textContent = "";

        activeProjectBox.hidden = true;
        activeProjectBox.textContent = "";

        activityDetailsDiv.hidden = false;

        await getHistory()

    } catch(error){
        console.error("Error al cerrar la sesion", error);
        // Limpiar estado aunque falle
        clearInterval(currentSession.timerStamp);
        currentSession.timerStamp = null;
        currentSession.elapsedTime = 0;
        timerBox.textContent = "00:00";
        currentSession.sessionId = null;
        currentSession.activityId = null;
        currentSession.startTime = null;
        
        // Restaurar UI
        startButton.hidden = false;
        stopButton.hidden = true;
        activeActivityBox.hidden = true;
        activeProjectBox.hidden = true;
        activityDetailsDiv.hidden = false;
    } finally {
        startButton.disabled = false;
        stopButton.disabled = false;
    }
});

export { formatTime, currentSession, updateTimer, timerBox };