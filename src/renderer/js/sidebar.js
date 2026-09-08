// js/sidebar.js
// Lógica visual/interacción del menú lateral de proyectos.
// Solo lista proyectos desde la base de datos.

// --- Referencias DOM ---
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebar-overlay");
const openBtn = document.getElementById("sidebar-open");
const closeBtn = document.getElementById("sidebar-close");
const projectListEl = document.getElementById("project-list");

// --- Estado ---
let projects = [];
let activeProjectId = null;

// --- Apertura / cierre del sidebar ---
function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    requestAnimationFrame(() => overlay.classList.add("opacity-100"));
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
    if (e.key === "Escape") closeSidebar();
});

// --- Cargar proyectos desde el backend usando la API de Electron ---
async function cargarProyectos() {
    try {
        console.log('Cargando proyectos...');
        
        if (!window.api || !window.api.proyectos || !window.api.proyectos.listar) {
            throw new Error('API de proyectos no disponible');
        }
        
        const proyectos = await window.api.proyectos.listar();
        console.log('Proyectos recibidos:', proyectos);
        
        if (Array.isArray(proyectos)) {
            projects = proyectos;
        } else {
            projects = [];
        }
        
        if (projects.length > 0 && !activeProjectId) {
            activeProjectId = projects[0].id_proyecto;
        }
        
        renderProjects();
        return projects;
    } catch (error) {
        console.error('Error cargando proyectos:', error);
        projects = [];
        renderProjects();
        return [];
    }
}

// --- Render de la lista de proyectos ---
function renderProjects() {
    projectListEl.innerHTML = "";

    if (projects.length === 0) {
        const emptyLi = document.createElement("li");
        emptyLi.className = "text-slate-500 text-sm px-3 py-2 text-center";
        emptyLi.textContent = "No hay proyectos";
        projectListEl.appendChild(emptyLi);
        return;
    }

    projects.forEach((project) => {
        const isActive = project.id_proyecto === activeProjectId;

        const li = document.createElement("li");
        li.className = "group";

        const row = document.createElement("div");
        row.className = [
            "flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors",
            isActive
                ? "bg-[#ba4949]/10 text-[#ba4949] font-semibold border-l-4 border-[#ba4949] pl-2"
                : "text-slate-700 hover:bg-slate-100 border-l-4 border-transparent",
        ].join(" ");
        row.dataset.projectId = project.id_proyecto;

        const name = document.createElement("span");
        name.className = "truncate";
        name.textContent = project.nombre;
        name.addEventListener("click", () => selectProject(project.id_proyecto));

        row.appendChild(name);
        li.appendChild(row);
        projectListEl.appendChild(li);
    });
}

// --- Selección de proyecto ---
function selectProject(id) {
    if (activeProjectId === id) return;
    activeProjectId = id;
    renderProjects();

    const project = projects.find((p) => p.id_proyecto === id);
    document.dispatchEvent(
        new CustomEvent("project:select", { detail: { project } })
    );
}

// --- Inicialización ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargarProyectos);
} else {
    cargarProyectos();
}

// --- Exportar funciones necesarias ---
export { 
    openSidebar, 
    closeSidebar, 
    selectProject, 
    projects,
    cargarProyectos,
    renderProjects
};