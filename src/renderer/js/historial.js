import { DEFAULT_HISTORIAL_NUMBER } from "./defaultValues.js";
import { formatTime, currentSession, updateTimer } from "./counter.js";

const activityList = document.getElementById("activity-list");
const activeActivityBox = document.getElementById("active-activity");
const activeProjectBox = document.getElementById("active-project");
const activityDetailsDiv = document.getElementById("activity-details-div");

async function restartActivity (activityId) {

    if(currentSession.timerStamp != null){
        return;
    }

    const newSessionId = await window.api.sesiones.iniciar(activityId);
    
    if (!newSessionId) {
        console.log("No se pudo crear la sesión.");
        return;
    }

    const data = await window.api.sesiones.obtenerDatos(newSessionId);
    const startButton = document.getElementById("counter");
    const stopButton = document.getElementById("stop");

    // Deshabilitar botones
    startButton.disabled = true;
    stopButton.disabled = true;

    currentSession.activityId = data.id_actividad;
    currentSession.sessionId = newSessionId;
    currentSession.startTime = Date.now();
    currentSession.timerStamp = setInterval(updateTimer, 250);

    activeActivityBox.hidden = false;
    activeActivityBox.textContent = data.nombre_actividad;

    activeProjectBox.hidden = false;
    activeProjectBox.textContent = data.nombre_proyecto;

    activityDetailsDiv.hidden = true;
    startButton.hidden = true;
    stopButton.hidden = false;

    // Habilitar botones
    startButton.disabled = false;
    stopButton.disabled = false;

}

async function getLastActivities () {
    const numberRows = DEFAULT_HISTORIAL_NUMBER;
    const lastActivities = await window.api.actividades.listarUltimas(numberRows);
    
    if (lastActivities.length == 0) {
        return
    }
    
    const groupedActivities = {};
    const actDates = [];
    
    for (const elem of lastActivities){
        const myDate = new Date(elem.fecha * 1000);
        const day = myDate.getDay().toString();
        const year = myDate.getFullYear().toString();
        const month = (myDate.getMonth()+1).toString();
        const weekDay = myDate.toLocaleDateString('es-ES', { weekday: 'long'});

        const date_str = weekDay+", "+day.padStart(2,"0")+"-"+month.padStart(2,"0")+"-"+year;

        if (!(date_str in groupedActivities)){
            groupedActivities[date_str] = [];
            actDates.push(date_str);
        }
        // Include in the function the project name as well (check the sql function)
        groupedActivities[date_str].push({
            activityId: elem.id_actividad,
            project: elem.proyecto,
            activity: elem.actividad,
            tiempo_total: elem.tiempo_total_segundos
        })
    }

    return { actDates, groupedActivities }
    
}

const factoryActivity = (activity_id, activity_str, project_str, time_str) => {
    const SVG_NS = "http://www.w3.org/2000/svg";

    const container = document.createElement("div");
    container.className = "group w-full border text-slate-600 rounded-lg flex items-center justify-between py-2 px-3 hover:bg-gray-300 transition-colors mb-2 cursor-pointer";
    container.dataset.activityId = activity_id;
    container.addEventListener("click", async (e) => {
        const activityId = e.currentTarget.dataset.activityId;
        await restartActivity(activityId);
    })
    const leftSection = document.createElement("div");
    leftSection.className = "flex flex-col justify-start items-start";

    const activity = document.createElement("div");
    activity.className = "text-slate-700 font-semibold group-hover:text-slate-950";
    activity.textContent = activity_str;

    const project = document.createElement("div");
    project.className = "text-slate-500 text-sm";
    project.textContent = project_str;

    leftSection.append(activity, project);
    
    const rightSection = document.createElement("div");
    rightSection.className = "flex justify-center items-center gap-x-3";

    const formattedTime = document.createElement("span");
    formattedTime.className = "text-slate-600 text-2xl font-medium";
    formattedTime.textContent = time_str;

    const svgIcon = document.createElementNS(SVG_NS, "svg");
    svgIcon.classList.add("size-8", "group-hover:text-rose-500");

    const icon = document.createElementNS(SVG_NS, "use");

    const iconUrl = new URL(
        "./assets/icons.svg",
        document.baseURI
    ).href;

    icon.setAttribute("href", `${iconUrl}#reload`);

    svgIcon.append(icon);

    rightSection.append(formattedTime, svgIcon);

    container.append(leftSection, rightSection);

    return container;

}
async function getHistory(){
    const data = await getLastActivities();
    if (!data) return;
    //clean activity list
    while(activityList.firstChild) {
        activityList.removeChild(activityList.lastChild);
    }
    for (const dayStr of data.actDates) {
        const dayRow = document.createElement("div");
        dayRow.className = "font-medium text-gray-800 mb-2";
        dayRow.textContent = dayStr
        activityList.append(dayRow);

        const rows = data.groupedActivities[dayStr];
        for (const row of rows) {
            const formattedTime = formatTime(row.tiempo_total * 1000);
            const elem = factoryActivity(row.activityId, row.activity, row.project, formattedTime);
            activityList.append(elem);
        }
    }
}

(async () => {
    try {
        await getHistory();
    } catch (error) {
        console.error(error);
    }
})();

export { getHistory }