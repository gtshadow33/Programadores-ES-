// js/sidebar.js
// Lógica del menú lateral: lista de proyectos con actividades desplegables.
// Al desplegar un proyecto, se recargan sus actividades desde la base de datos.
// Escucha eventos de creación/actualización de proyectos para refrescar la lista.

// --- Referencias DOM ---
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebar-overlay");
const openBtn = document.getElementById("sidebar-open");
const closeBtn = document.getElementById("sidebar-close");
const projectListEl = document.getElementById("project-list");

// --- Estado ---
let projects = [];
let activeProjectId = null;
const expandedProjects = new Set(); // IDs de proyectos expandidos


// --- Apertura / cierre del sidebar ---

function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");

    requestAnimationFrame(() => {
        overlay.classList.add("opacity-100");
    });

    // Recargar proyectos al abrir
    setTimeout(() => cargarProyectos(), 150);
}

function closeSidebar() {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    overlay.classList.remove("opacity-100");
}

openBtn?.addEventListener("click", openSidebar);
closeBtn?.addEventListener("click", closeSidebar);
overlay?.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeSidebar();
    }
});


// --- Cargar proyectos desde la API de Electron ---

async function cargarProyectos() {
    try {
        console.log("Cargando proyectos...");

        if (!window.api?.proyectos?.listar) {
            throw new Error("API de proyectos no disponible");
        }

        const proyectos = await window.api.proyectos.listar();

        projects = Array.isArray(proyectos) ? proyectos : [];

        if (projects.length > 0 && !activeProjectId) {
            activeProjectId = projects[0].id_proyecto;
        }

        renderProjects();

        return projects;

    } catch (error) {
        console.error("Error cargando proyectos:", error);

        projects = [];
        renderProjects();

        return [];
    }
}


// --- Obtener actividades de un proyecto ---

async function fetchActivities(projectId) {
    try {
        if (!window.api?.actividades?.listar) {
            throw new Error("API de actividades no disponible");
        }

        const actividades =
            await window.api.actividades.listar(projectId);

        return Array.isArray(actividades)
            ? actividades
            : [];

    } catch (error) {
        console.error(
            `Error cargando actividades del proyecto ${projectId}:`,
            error
        );

        return [];
    }
}


// --- Renderizar la lista de proyectos ---

function renderProjects() {

    projectListEl.innerHTML = "";

    if (projects.length === 0) {

        const emptyLi = document.createElement("li");

        emptyLi.className =
            "text-slate-500 text-sm px-3 py-2 text-center";

        emptyLi.textContent = "No hay proyectos";

        projectListEl.appendChild(emptyLi);

        return;
    }

    projects.forEach((project) => {

        const isActive =
            project.id_proyecto === activeProjectId;

        const isExpanded =
            expandedProjects.has(project.id_proyecto);


        // --- Contenedor del proyecto ---

        const container = document.createElement("li");

        container.className =
            "project-container";


        // --- Cabecera del proyecto ---

        const header = document.createElement("div");

        header.className = [
            "flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors",

            isActive
                ? "bg-[#ba4949]/10 text-[#ba4949] font-semibold border-l-4 border-[#ba4949] pl-2"
                : "text-slate-700 hover:bg-slate-100 border-l-4 border-transparent",

        ].join(" ");

        header.dataset.projectId =
            project.id_proyecto;


        // --- Nombre del proyecto ---

        const nameSpan =
            document.createElement("span");

        nameSpan.className =
            "truncate flex-1";

        nameSpan.textContent =
            project.nombre;


        // --- Icono de expandir/colapsar ---

        const toggleIcon =
            document.createElement("span");

        toggleIcon.className =
            "text-slate-400 text-xs transition-transform duration-200 flex-shrink-0";


        toggleIcon.innerHTML = isExpanded

            // Icono desplegado
            ? `
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            `

            // Icono recogido
            : `
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            `;


        header.appendChild(nameSpan);
        header.appendChild(toggleIcon);


        // --- Lista de actividades ---

        const activityList =
            document.createElement("ul");

        activityList.className =
            "ml-4 mt-1 space-y-0.5 overflow-hidden transition-all duration-200";

        activityList.style.maxHeight =
            isExpanded ? "1000px" : "0";

        activityList.style.opacity =
            isExpanded ? "1" : "0";

        activityList.dataset.projectId =
            project.id_proyecto;


        // --- Evento click en la cabecera ---

        header.addEventListener("click", async (e) => {

            e.stopPropagation();

            // Seleccionar proyecto activo
            selectProject(project.id_proyecto);

            const wasExpanded =
                expandedProjects.has(project.id_proyecto);


            if (wasExpanded) {

                // --- Colapsar ---

                expandedProjects.delete(
                    project.id_proyecto
                );

                renderSingleProject(
                    project.id_proyecto
                );

            } else {

                // --- Expandir y cargar actividades ---

                expandedProjects.add(
                    project.id_proyecto
                );

                const actividades =
                    await fetchActivities(
                        project.id_proyecto
                    );

                renderActivities(
                    project.id_proyecto,
                    actividades,
                    project
                );

                renderSingleProject(
                    project.id_proyecto
                );
            }
        });


        container.appendChild(header);
        container.appendChild(activityList);

        projectListEl.appendChild(container);


        // --- Si está expandido, cargar actividades ---

        if (isExpanded) {

            fetchActivities(
                project.id_proyecto
            ).then((actividades) => {

                renderActivities(
                    project.id_proyecto,
                    actividades,
                    project
                );

            });
        }

    });
}


// --- Renderizar actividades de un proyecto específico ---

function renderActivities(
    projectId,
    actividades,
    project
) {

    const activityList =
        document.querySelector(
            `ul[data-project-id="${projectId}"]`
        );

    if (!activityList) {
        return;
    }

    activityList.innerHTML = "";


    // --- Sin actividades ---

    if (actividades.length === 0) {

        const emptyItem =
            document.createElement("li");

        emptyItem.className =
            "text-xs text-slate-400 px-3 py-1";

        emptyItem.textContent =
            "Sin actividades";

        activityList.appendChild(
            emptyItem
        );

        return;
    }


    // --- Renderizar actividades ---

    actividades.forEach((actividad) => {

        const item =
            document.createElement("li");

        item.className =
            "text-sm text-slate-600 hover:text-slate-800 px-3 py-1 rounded cursor-pointer hover:bg-slate-50 transition-colors";

        item.textContent =
            actividad.nombre ||
            "Actividad sin nombre";


        // --- Evento click en actividad ---

        item.addEventListener("click", (e) => {

            e.stopPropagation();

            console.log(
                "Actividad seleccionada:",
                actividad
            );

            console.log(
                "Proyecto seleccionado:",
                project
            );


            document.dispatchEvent(
                new CustomEvent(
                    "activity:select",
                    {
                        detail: {
                            actividad: actividad,
                            project: project
                        }
                    }
                )
            );

        });


        activityList.appendChild(item);

    });
}


// --- Actualizar solo un proyecto ---

function renderSingleProject(projectId) {

    const container =
        document.querySelector(
            `li.project-container:has([data-project-id="${projectId}"])`
        );

    if (!container) {
        return;
    }


    const header =
        container.querySelector(
            "div[data-project-id]"
        );

    const activityList =
        container.querySelector(
            "ul[data-project-id]"
        );


    const isExpanded =
        expandedProjects.has(projectId);


    // --- Actualizar icono ---

    const icon =
        header.querySelector(
            "span:last-child"
        );


    if (icon) {

        icon.innerHTML = isExpanded

            // Icono desplegado
            ? `
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            `

            // Icono recogido
            : `
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            `;
    }


    // --- Mostrar/ocultar lista ---

    if (activityList) {

        activityList.style.maxHeight =
            isExpanded
                ? "1000px"
                : "0";

        activityList.style.opacity =
            isExpanded
                ? "1"
                : "0";
    }


    // --- Actualizar estilo de activo ---

    const isActive =
        projectId === activeProjectId;


    header.className = [

        "flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors",

        isActive

            ? "bg-[#ba4949]/10 text-[#ba4949] font-semibold border-l-4 border-[#ba4949] pl-2"

            : "text-slate-700 hover:bg-slate-100 border-l-4 border-transparent",

    ].join(" ");
}


// --- Selección de proyecto activo ---

function selectProject(id) {

    if (activeProjectId === id) {
        return;
    }

    activeProjectId = id;


    // Actualizar visualmente todos los proyectos

    document
        .querySelectorAll(
            "div[data-project-id]"
        )
        .forEach((header) => {

            const pid =
                parseInt(
                    header.dataset.projectId
                );

            const isActive =
                pid === activeProjectId;


            header.className = [

                "flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors",

                isActive

                    ? "bg-[#ba4949]/10 text-[#ba4949] font-semibold border-l-4 border-[#ba4949] pl-2"

                    : "text-slate-700 hover:bg-slate-100 border-l-4 border-transparent",

            ].join(" ");

        });


    const project =
        projects.find(
            (p) =>
                p.id_proyecto === id
        );


    document.dispatchEvent(
        new CustomEvent(
            "project:select",
            {
                detail: {
                    project
                }
            }
        )
    );
}


// --- Escuchar eventos de creación/actualización de proyectos ---

document.addEventListener(
    "project:create",
    cargarProyectos
);

document.addEventListener(
    "project:created",
    cargarProyectos
);


// --- Inicialización ---

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        cargarProyectos
    );

} else {

    cargarProyectos();

}


// --- Exportar ---

export {
    openSidebar,
    closeSidebar,
    selectProject,
    projects,
    cargarProyectos,
    renderProjects,
};