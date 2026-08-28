import { DEFAULT_HISTORIAL_NUMBER } from "./defaultValues.js";
import { formatTime } from "./counter.js";

const activityList = document.getElementById("activity-list");

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
        const month = myDate.getMonth().toString();
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

const factoryActivity = (activity_str, project_str, time_str) => {
    const SVG_NS = "http://www.w3.org/2000/svg";

    const container = document.createElement("button");
    container.className = "group w-full border text-slate-600 rounded-lg flex items-center justify-between py-2 px-3 hover:bg-gray-300 transition-colors mb-2";
    
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
    const lst = document.getElementById("")
    const data = await getLastActivities();
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
            const elem = factoryActivity(row.activity, row.project, formattedTime);
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