// js/sidebar.js
// Lógica del menú lateral: lista de proyectos con actividades desplegables.
// Al desplegar un proyecto, se recargan sus actividades desde la base de datos.

import { confirmar } from "./confirm-dialog.js";
import { currentSession } from "./counter.js";   // [1]

window.addEventListener("focus", () => {
    console.log("WINDOW FOCUS");
});

window.addEventListener("blur", () => {
    console.log("WINDOW BLUR");
});

document.addEventListener("focusin", (e) => {
    console.log("FOCUS IN:", e.target);
});

document.addEventListener("focusout", (e) => {
    console.log("FOCUS OUT:", e.target);
});

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

// --- Iconos SVG reutilizados ---
const ICON_CHEVRON_DOWN = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
`;

const ICON_CHEVRON_RIGHT = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
    </svg>
`;

const ICON_TRASH = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
    </svg>
`;

const ICON_TRASH_SM = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" />
    </svg>
`;


// --- Apertura / cierre del sidebar ---

function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");

    requestAnimationFrame(() => {
        overlay.classList.add("opacity-100");
    });

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


// --- Helpers de estado de sesión ---                              // [2]

/**
 * ¿Hay una sesión activa en este momento?
 * Usa `timerStamp` porque es el indicador más fiable:
 * se asigna justo cuando arranca el setInterval y se limpia al pararlo.
 */
function haySesionActiva() {
    return currentSession.timerStamp != null;
}

/**
 * ¿La sesión activa (si existe) pertenece a esta actividad?
 */
function esActividadEnCurso(actividadId) {
    return haySesionActiva() &&
        currentSession.activityId === actividadId;
}


// --- Feedback visual (toast) ---

function mostrarFeedback(mensaje, tipo = "success") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-md text-sm text-white shadow-lg z-50 ${
        tipo === "success" ? "bg-emerald-600" : "bg-red-600"
    }`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}


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

    const sesionActiva = haySesionActiva();                       // [3]

    projects.forEach((project) => {

        const isActive =
            project.id_proyecto === activeProjectId;

        const isExpanded =
            expandedProjects.has(project.id_proyecto);


        const container = document.createElement("li");

        container.className = "project-container";


        const header = document.createElement("div");

        header.className = [
            "group flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors",

            isActive
                ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary pl-2"
                : "text-slate-700 hover:bg-slate-100 border-l-4 border-transparent",

        ].join(" ");

        header.dataset.projectId = project.id_proyecto;


        const nameSpan = document.createElement("span");

        nameSpan.className = "truncate flex-1";
        nameSpan.textContent = project.nombre;


        const toggleIcon = document.createElement("span");

        toggleIcon.className =
            "text-slate-400 text-xs transition-transform duration-200 flex-shrink-0";

        toggleIcon.innerHTML = isExpanded
            ? ICON_CHEVRON_DOWN
            : ICON_CHEVRON_RIGHT;


        const deleteProjectBtn = document.createElement("button");

        deleteProjectBtn.type = "button";

        // [3] Estado visual del botón según sesión activa
        if (sesionActiva) {
            deleteProjectBtn.disabled = true;
            // Visible siempre (no opacity-0) pero apagado y no clickeable.
            deleteProjectBtn.className =
                "opacity-40 text-slate-300 cursor-not-allowed rounded p-1 transition-all flex-shrink-0";
            deleteProjectBtn.title = "Detén la sesión para eliminar";
        } else {
            deleteProjectBtn.disabled = false;
            deleteProjectBtn.className =
                "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-all flex-shrink-0";
            deleteProjectBtn.title = "Eliminar proyecto";
        }

        deleteProjectBtn.innerHTML = ICON_TRASH;

        deleteProjectBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            eliminarProyectoHandler(project);
        });


        header.appendChild(nameSpan);
        header.appendChild(toggleIcon);
        header.appendChild(deleteProjectBtn);


        const activityList = document.createElement("ul");

        activityList.className =
            "ml-4 mt-1 space-y-0.5 overflow-hidden transition-all duration-200";

        activityList.style.maxHeight = isExpanded ? "1000px" : "0";
        activityList.style.opacity = isExpanded ? "1" : "0";
        activityList.dataset.projectId = project.id_proyecto;


        header.addEventListener("click", async (e) => {

            e.stopPropagation();

            if (e.target.closest("button")) {
                return;
            }

            selectProject(project.id_proyecto);

            const wasExpanded =
                expandedProjects.has(project.id_proyecto);


            if (wasExpanded) {

                expandedProjects.delete(project.id_proyecto);
                renderSingleProject(project.id_proyecto);

            } else {

                expandedProjects.add(project.id_proyecto);

                const actividades =
                    await fetchActivities(project.id_proyecto);

                renderActivities(
                    project.id_proyecto,
                    actividades,
                    project
                );

                renderSingleProject(project.id_proyecto);
            }
        });


        container.appendChild(header);
        container.appendChild(activityList);

        projectListEl.appendChild(container);


        if (isExpanded) {

            fetchActivities(project.id_proyecto).then((actividades) => {

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

function renderActivities(projectId, actividades, project) {

    const activityList =
        document.querySelector(`ul[data-project-id="${projectId}"]`);

    if (!activityList) {
        return;
    }

    activityList.innerHTML = "";


    if (actividades.length === 0) {

        const emptyItem = document.createElement("li");

        emptyItem.className = "text-xs text-slate-400 px-3 py-1";
        emptyItem.textContent = "Sin actividades";

        activityList.appendChild(emptyItem);

        return;
    }


    actividades.forEach((actividad) => {

        const item = document.createElement("li");

        item.className =
            "group flex items-center justify-between gap-1 text-sm text-slate-600 hover:text-slate-800 px-3 py-1 rounded cursor-pointer hover:bg-slate-50 transition-colors";


        const nameSpan = document.createElement("span");

        nameSpan.className = "truncate flex-1";
        nameSpan.textContent =
            actividad.nombre || "Actividad sin nombre";

        item.appendChild(nameSpan);


        const deleteActBtn = document.createElement("button");

        deleteActBtn.type = "button";

        // [4] Solo se bloquea si ES la actividad en curso
        const enCurso = esActividadEnCurso(actividad.id_actividad);

        if (enCurso) {
            deleteActBtn.disabled = true;
            deleteActBtn.className =
                "opacity-40 text-slate-300 cursor-not-allowed rounded p-1 transition-all flex-shrink-0";
            deleteActBtn.title = "Actividad en curso";
        } else {
            deleteActBtn.disabled = false;
            deleteActBtn.className =
                "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-all flex-shrink-0";
            deleteActBtn.title = "Eliminar actividad";
        }

        deleteActBtn.innerHTML = ICON_TRASH_SM;

        deleteActBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            eliminarActividadHandler(actividad, projectId);
        });

        item.appendChild(deleteActBtn);


        item.addEventListener("click", (e) => {

            e.stopPropagation();

            if (e.target.closest("button")) {
                return;
            }

            console.log("Actividad seleccionada:", actividad);
            console.log("Proyecto seleccionado:", project);

            document.dispatchEvent(
                new CustomEvent("activity:select", {
                    detail: {
                        actividad: actividad,
                        project: project
                    }
                })
            );
        });


        activityList.appendChild(item);
    });
}


// --- Actualizar solo un proyecto ---

function renderSingleProject(projectId) {

    const container = document.querySelector(
        `li.project-container:has([data-project-id="${projectId}"])`
    );

    if (!container) {
        return;
    }

    const header = container.querySelector("div[data-project-id]");
    const activityList = container.querySelector("ul[data-project-id]");

    const isExpanded = expandedProjects.has(projectId);


    const icon = header.querySelector("span:last-of-type");

    if (icon) {
        icon.innerHTML = isExpanded
            ? ICON_CHEVRON_DOWN
            : ICON_CHEVRON_RIGHT;
    }


    if (activityList) {
        activityList.style.maxHeight = isExpanded ? "1000px" : "0";
        activityList.style.opacity = isExpanded ? "1" : "0";
    }


    const isActive = projectId === activeProjectId;

    header.className = [
        "group flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors",

        isActive
            ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary pl-2"
            : "text-slate-700 hover:bg-slate-100 border-l-4 border-transparent",

    ].join(" ");
}


// --- Eliminar proyecto ---

async function eliminarProyectoHandler(project) {

    // [5] Guard: no permitir borrar con sesión activa
    if (haySesionActiva()) {
        mostrarFeedback(
            "Detén la sesión en curso antes de eliminar proyectos",
            "error"
        );
        return;
    }

    const confirmado = await confirmar({
        titulo: "Eliminar proyecto",
        mensaje: `¿Eliminar el proyecto "${project.nombre}"? Se eliminarán también sus actividades.`,
        textoConfirmar: "Eliminar",
        textoCancelar: "Cancelar",
        peligro: true,
    });

    if (!confirmado) {
        return;
    }

    try {
        if (!window.api?.proyectos?.eliminar) {
            throw new Error("API de proyectos no disponible");
        }

        const res = await window.api.proyectos.eliminar(
            project.id_proyecto
        );

        if (!res?.eliminado) {
            throw new Error("El proyecto no pudo eliminarse");
        }

        projects = projects.filter(
            (p) => p.id_proyecto !== project.id_proyecto
        );

        expandedProjects.delete(project.id_proyecto);

        if (activeProjectId === project.id_proyecto) {
            activeProjectId = projects[0]?.id_proyecto ?? null;
        }

        renderProjects();

        mostrarFeedback(
            `Proyecto "${project.nombre}" eliminado`,
            "success"
        );

        document.dispatchEvent(
            new CustomEvent("project:deleted", {
                detail: { project }
            })
        );

    } catch (error) {
        console.error("Error eliminando proyecto:", error);
        mostrarFeedback("Error al eliminar el proyecto", "error");
    }
}


// --- Eliminar actividad ---

async function eliminarActividadHandler(actividad, projectId) {

    // [6] Guard: no permitir borrar la actividad que está corriendo
    if (esActividadEnCurso(actividad.id_actividad)) {
        mostrarFeedback(
            "No puedes eliminar la actividad que está en curso. Detén el timer primero.",
            "error"
        );
        return;
    }

    const confirmado = await confirmar({
        titulo: "Eliminar actividad",
        mensaje: `¿Eliminar la actividad "${actividad.nombre}"?`,
        textoConfirmar: "Eliminar",
        textoCancelar: "Cancelar",
        peligro: true,
    });

    if (!confirmado) {
        return;
    }

    try {
        if (!window.api?.actividades?.eliminar) {
            throw new Error("API de actividades no disponible");
        }

        const res = await window.api.actividades.eliminar(
            actividad.id_actividad
        );

        if (!res?.eliminado) {
            throw new Error("La actividad no pudo eliminarse");
        }

        const actividadesActualizadas =
            await fetchActivities(projectId);

        const project =
            projects.find((p) => p.id_proyecto === projectId);

        renderActivities(
            projectId,
            actividadesActualizadas,
            project
        );

        mostrarFeedback(
            `Actividad "${actividad.nombre}" eliminada`,
            "success"
        );

        document.dispatchEvent(
            new CustomEvent("activity:deleted", {
                detail: { actividad, projectId }
            })
        );

    } catch (error) {
        console.error("Error eliminando actividad:", error);
        mostrarFeedback("Error al eliminar la actividad", "error");
    }
}


// --- Selección de proyecto activo ---

function selectProject(id) {

    if (activeProjectId === id) {
        return;
    }

    activeProjectId = id;

    document
        .querySelectorAll("div[data-project-id]")
        .forEach((header) => {

            const pid = parseInt(header.dataset.projectId);
            const isActive = pid === activeProjectId;

            header.className = [
                "group flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors",

                isActive
                    ? "bg-primary/10 text-primary font-semibold border-l-4 border-primary pl-2"
                    : "text-slate-700 hover:bg-slate-100 border-l-4 border-transparent",

            ].join(" ");
        });


    const project = projects.find((p) => p.id_proyecto === id);

    document.dispatchEvent(
        new CustomEvent("project:select", {
            detail: { project }
        })
    );
}


// --- Re-render al cambiar el estado de la sesión ---              // [7]

document.addEventListener("session:state-change", () => {
    renderProjects();
});


// --- Inicialización ---

if (document.readyState === "loading") {

    document.addEventListener("DOMContentLoaded", cargarProyectos);

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