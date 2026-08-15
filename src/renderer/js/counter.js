const counterButton = document.getElementById("counter");
const stopButton = document.getElementById("stop");
const timerBox = document.getElementById("timer-box");
const activityDetailsDiv = document.getElementById("activity-details-div");
const activeActivityBox = document.getElementById("active-activity");
const activeProjectBox = document.getElementById("active-project");
import { DEFAULT_ACTIVITY, DEFAULT_PROJECT} from "./defaultValues";

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

counterButton.addEventListener("click", async () => {
    if (currentSession.timerStamp != null){
        return
    }
    
    counterButton.disabled = true;
    counterButton.hidden = true;
    // block stopButton clicking
    stopButton.disabled = true;
    stopButton.hidden = false;

    const activityDetailsStr = document.getElementById("activity-details").value;
    const session = splitActivityDetails(activityDetailsStr);
    
    try {
        // Check if the project exists if not create a new project
        const projectData = {
            nombre: session.project,
            precio_hora: DEFAULT_PROJECT.precio_hora,
            id_moneda: DEFAULT_PROJECT.id_moneda,
        }
        const project_id = await window.api.proyectos.crear(projectData)

        const activityData = {
            id_proyecto: project_id,
            nombre: session.activity,
        }

        const newActivity = await window.api.actividades.crearActividad(activityData);

        const newSessionId = await window.api.sesiones.iniciarSesion(newActivity.id_actividad)

        currentSession.activityId = newActivity.id_actividad;
        currentSession.sessionId = newSessionId;
    } catch (error) {
        console.error("Error al crear el proyecto:", error);
    } finally {
        counterButton.disabled = false;
        stopButton.disabled = false;
    }7


    
    console.dir(window.api);
    
    
    
    // include active-activity box to show and hide the actividad proyecto input box
    activeActivityBox.hidden = false;
    activeActivityBox.textContent = session.activity;

    activeProjectBox.hidden = false;
    activeProjectBox.textContent = session.project;

    activityDetailsDiv.hidden = true;

    currentSession.startTime = Date.now();

    currentSession.timerStamp = setInterval(updateTimer, 250);

})

stopButton.addEventListener("click", async () => {
    
    if (currentSession.timerStamp == null) {
        return;
    }

    counterButton.hidden = false;
    stopButton.hidden = true;
    // include active-activity box to show and hide the actividad proyecto input box
    activeActivityBox.hidden = true;
    activeActivityBox.textContent = "";

    activeProjectBox.hidden = true;
    activeProjectBox.textContent = "";

    activityDetailsDiv.hidden = false;

    // try {
    //     // deterner session

    // }
    clearInterval(currentSession.timerStamp);
    currentSession.timerStamp = null;
    currentSession.elapsedTime = 0;
    timerBox.textContent = "00:00";
    
    // Save activity in the database
    // show last activities in the historial app as well
    console.log("saving elapsed time in db")
})