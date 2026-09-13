// js/confirm-dialog.js
// Módulo reutilizable de confirmación (reemplazo nativo de window.confirm).
// Devuelve una Promise<boolean>.

const ICON_WARNING = `
    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
`;


/**
 * Muestra un modal de confirmación.
 *
 * @param {Object}   [opciones]
 * @param {string}   [opciones.titulo="Confirmar acción"]
 * @param {string}   [opciones.mensaje=""]
 * @param {string}   [opciones.textoConfirmar="Confirmar"]
 * @param {string}   [opciones.textoCancelar="Cancelar"]
 * @param {boolean}  [opciones.peligro=true]     - true → botón rojo, false → botón verde
 * @returns {Promise<boolean>}  true si confirma, false si cancela
 */
export function confirmar({
    titulo = "Confirmar acción",
    mensaje = "",
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar",
    peligro = true,
} = {}) {
    return new Promise((resolve) => {

        // Backdrop — z-index altísimo para quedar por encima del sidebar, overlay y toasts
        const backdrop = document.createElement("div");
        backdrop.className =
            "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm opacity-0 transition-opacity duration-150";

        // Tarjeta compacta
        const card = document.createElement("div");
        card.className =
            "bg-white rounded-lg shadow-2xl w-full max-w-xs mx-4 overflow-hidden transform scale-95 opacity-0 transition-all duration-150";
        card.setAttribute("role", "dialog");
        card.setAttribute("aria-modal", "true");

        // Header con icono
        const header = document.createElement("div");
        header.className = "flex items-start gap-2.5 p-3.5";

        const iconWrap = document.createElement("div");
        iconWrap.className = peligro
            ? "flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4"
            : "flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4";
        iconWrap.innerHTML = ICON_WARNING;

        const textWrap = document.createElement("div");
        textWrap.className = "flex-1 min-w-0";

        const titleEl = document.createElement("h3");
        titleEl.className = "text-sm font-semibold text-slate-800";
        titleEl.textContent = titulo;

        const msgEl = document.createElement("p");
        msgEl.className = "mt-0.5 text-xs text-slate-600 break-words leading-snug";
        msgEl.textContent = mensaje;

        textWrap.appendChild(titleEl);
        textWrap.appendChild(msgEl);
        header.appendChild(iconWrap);
        header.appendChild(textWrap);

        // Footer con botones
        const footer = document.createElement("div");
        footer.className =
            "flex justify-end gap-1.5 px-3.5 py-2.5 bg-slate-50 border-t border-slate-100";

        const btnCancelar = document.createElement("button");
        btnCancelar.type = "button";
        btnCancelar.className =
            "px-2.5 py-1 text-xs rounded-md text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors";
        btnCancelar.textContent = textoCancelar;

        const btnConfirmar = document.createElement("button");
        btnConfirmar.type = "button";
        btnConfirmar.className = peligro
            ? "px-2.5 py-1 text-xs rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
            : "px-2.5 py-1 text-xs rounded-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors";
        btnConfirmar.textContent = textoConfirmar;

        footer.appendChild(btnCancelar);
        footer.appendChild(btnConfirmar);

        card.appendChild(header);
        card.appendChild(footer);
        backdrop.appendChild(card);
        document.body.appendChild(backdrop);

        // Animación de entrada
        requestAnimationFrame(() => {
            backdrop.classList.remove("opacity-0");
            card.classList.remove("scale-95", "opacity-0");
        });

        let cerrado = false;

        function cerrar(resultado) {
            if (cerrado) return;
            cerrado = true;

            backdrop.classList.add("opacity-0");
            card.classList.add("scale-95", "opacity-0");

            document.removeEventListener("keydown", onKeyDown);

            setTimeout(() => {
                backdrop.remove();
                resolve(resultado);
            }, 150);
        }

        function onKeyDown(e) {
            if (e.key === "Escape") {
                e.stopPropagation();
                cerrar(false);
            } else if (e.key === "Enter") {
                e.stopPropagation();
                cerrar(true);
            }
        }

        btnCancelar.addEventListener("click", () => cerrar(false));
        btnConfirmar.addEventListener("click", () => cerrar(true));

        backdrop.addEventListener("click", (e) => {
            if (e.target === backdrop) cerrar(false);
        });

        document.addEventListener("keydown", onKeyDown);

        requestAnimationFrame(() => btnConfirmar.focus());
    });
}