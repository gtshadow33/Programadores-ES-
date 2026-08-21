const startButton = document.getElementById("counter");
const stopButton = document.getElementById("stop");
const timerBox = document.getElementById("timer-box");
const activityDetailsDiv = document.getElementById("activity-details-div");
const activeActivityBox = document.getElementById("active-activity");
const activeProjectBox = document.getElementById("active-project");
import { DEFAULT_ACTIVITY, DEFAULT_PROJECT} from "./defaultValues.js";

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
    
    const lst = activityDetails.split(" @");
    
    if (lst.length == 1){
        activity = lst[0];
        project = DEFAULT_PROJECT.nombre;
    }

    if (lst.length > 1) {
        activity = lst[0];
        project = lst[2];
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
    
    // Usado para hacer debug
    // console.dir(window.api);

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
            throw new Error("No se pudo crear la sesion.")
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
            throw new Error("No hay una sesion activa");
        }

        const isSessionFinished = await window.api.sesiones.finalizar(currentSession.sessionId);
        
        if (!isSessionFinished) {
            console.log("La sesion no se cerro correctamente");
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


    } catch(error){
        console.error("Error al cerrar la sesion", error);
    } finally {
        startButton.disabled = false;
        stopButton.disabled = false;
    }
});