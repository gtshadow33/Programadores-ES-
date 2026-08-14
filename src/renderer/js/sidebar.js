// js/sidebar.js
// Lógica visual/interacción del menú lateral de proyectos.
// De momento trabaja con datos mock; la carga/creación/edición real
// contra el backend se conectará en una tarea posterior (ver eventos
// personalizados emitidos más abajo: "project:select", "project:create",
// "project:edit").

// --- Datos mock (sustituir por fetch al backend en la siguiente tarea) ---
let projects = [
    { id: "p1", name: "Proyecto A" },
    { id: "p2", name: "Proyecto B" },
    { id: "p3", name: "Personal" },
];

let activeProjectId = projects[0]?.id ?? null;

// --- Referencias DOM ---
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebar-overlay");
const openBtn = document.getElementById("sidebar-open");
const closeBtn = document.getElementById("sidebar-close");
const projectListEl = document.getElementById("project-list");
const newProjectBtn = document.getElementById("new-project-btn");

// --- Apertura / cierre del sidebar ---
function openSidebar() {
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    // pequeño delay para permitir la transición de opacidad del overlay
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

// --- Render de la lista de proyectos ---
function renderProjects() {
    projectListEl.innerHTML = "";

    projects.forEach((project) => {
        const isActive = project.id === activeProjectId;

        const li = document.createElement("li");
        li.className = "group";

        const row = document.createElement("div");
        row.className = [
            "flex items-center justify-between gap-2 px-3 py-2.5 rounded-md cursor-pointer transition-colors",
            isActive
                ? "bg-[#ba4949]/10 text-[#ba4949] font-semibold border-l-4 border-[#ba4949] pl-2"
                : "text-slate-700 hover:bg-slate-100 border-l-4 border-transparent",
        ].join(" ");
        row.dataset.projectId = project.id;

        const name = document.createElement("span");
        name.className = "truncate";
        name.textContent = project.name;
        name.addEventListener("click", () => selectProject(project.id));

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.setAttribute("aria-label", `Configuración de ${project.name}`);
        editBtn.className = [
            "shrink-0 rounded-md p-1 text-slate-400 hover:text-[#ba4949] hover:bg-white cursor-pointer transition-opacity",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        ].join(" ");
        editBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                stroke="currentColor" class="size-4">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
        `;
        editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            selectProject(project.id);
            openProjectSettings(project.id);
        });

        row.appendChild(name);
        row.appendChild(editBtn);
        li.appendChild(row);
        projectListEl.appendChild(li);
    });
}

// --- Selección de proyecto ---
function selectProject(id) {
    if (activeProjectId === id) return;
    activeProjectId = id;
    renderProjects();

    const project = projects.find((p) => p.id === id);
    document.dispatchEvent(
        new CustomEvent("project:select", { detail: { project } })
    );
}

// --- Crear proyecto (placeholder visual, sin backend todavía) ---
function createProject() {
    const name = window.prompt("Nombre del nuevo proyecto:");
    if (!name || !name.trim()) return;

    const newProject = { id: `p${Date.now()}`, name: name.trim() };
    projects.push(newProject);
    renderProjects();

    document.dispatchEvent(
        new CustomEvent("project:create", { detail: { project: newProject } })
    );

    selectProject(newProject.id);
}

newProjectBtn?.addEventListener("click", createProject);

// --- Configuración de un proyecto (placeholder, sin backend todavía) ---
function openProjectSettings(id) {
    const project = projects.find((p) => p.id === id);
    document.dispatchEvent(
        new CustomEvent("project:edit", { detail: { project } })
    );
    // TODO: sustituir por apertura real del panel/modal de configuración
    console.log("Abrir configuración de:", project?.name);
}

// --- Inicialización ---
renderProjects();

export { openSidebar, closeSidebar, selectProject, createProject, projects };