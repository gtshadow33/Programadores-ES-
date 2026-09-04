# Programadores-ES

**Aplicación de escritorio** para gestionar proyectos, actividades y tiempo de trabajo con cronómetro integrado.

Stack: **Electron** + **Node.js** + **SQLite** + **Tailwind CSS**

---

##  Quick Start

### Requisitos
- Node.js 16+ (incluye npm)

### Setup
```bash
git clone https://github.com/gtshadow33/Programadores-ES-.git
cd Programadores-ES-
npm install
npm run dev
```

**DB se crea automáticamente** en `src/programadores_es.db` al iniciar.

---

## 📖 Documentación

| Doc | Para |
|-----|------|

| **[Base de Datos](../main/documentacion/back/baseDatos.md)** | Esquema, tablas, relaciones, ciclo vida sesiones |

---

##  Features

-  **Proyectos** — crear, listar, editar (nombre, tarifa/hora, moneda, notas)
-  **Actividades** — tareas dentro de proyectos (Pendiente → En progreso → Pausada → Finalizada)
-  **Cronómetro** — pausar/reanudar sesiones, acumular tiempo automático
-  **SQLite local** — datos en tu máquina, sin servidores
-  **UI moderna** — Tailwind CSS, responsive
-  **Validaciones** — claves foráneas, restricciones CHECK, atomicidad con transacciones

---

##  Arquitectura

```
Electron (Main)
    ├─ Inicializa DB (SQLite + WAL + Foreign Keys)
    ├─ Expone canales IPC (ipcMain.handle)
    └─ Ejecuta lógica de negocio (repository.js)
         ↓
    Repository (CRUD queries)
         ↓
    SQLite (programadores_es.db)

Renderer (UI)
    ├─ HTML + Tailwind CSS
    ├─ Invocar handlers IPC (window.electron.invoke)
    └─ Actualizar DOM, cronómetro en vivo
```

### Carpetas clave

```
src/
├─ main/
│  ├─ main.js              # Punto entrada, IPC handlers
│  └─ database/
│     ├─ db.js             # Inicialización DB, schema
│     └─ repository.js     # Queries de negocio
├─ renderer/
│  ├─ index.html
│  ├─ js/                  # Lógica UI (cronómetro, listados, sidebar)
│  └─ css/                 # Tailwind (input.css → styles.css)
└─ preload/
   └─ preload.js           # Context isolation, seguridad

test/
└─ db.test.js              # Tests de DB (Jest)

documentacion/
└─ back/
   └─ baseDatos.md         # Esquema detallado
```

---

##  Flujo de Datos

```
Usuario clickea botón (Renderer)
    ↓
window.electron.invoke("canal", datos)
    ↓
Main (ipcMain.handle) recibe, llama repository.js
    ↓
Repository ejecuta query en SQLite (transacción si es necesario)
    ↓
Renderer recibe resultado/error, actualiza UI
```

**Canales principales:**
- `proyectos:*` — crear, listar, obtener, actualizar, eliminar
- `actividades:*` — idem
- `sesiones:*` — iniciar, pausar, reanudar, finalizar, listar



---

## 💾 Modelo de Datos

**Jerarquía:** Moneda → Proyecto → Actividad → Sesión (1:N)

| Tabla | Propósito |
|-------|-----------|
| `Monedas` | Catálogo divisas (EUR, USD, etc.) |
| `Proyectos` | Proyectos con tarifa/hora y moneda |
| `Actividades` | Tareas con estado (Pendiente/En progreso/Pausada/Finalizada) |
| `Sesiones` | Intervalos de cronómetro (inicio, fin, duracion_segundos) |

**Validaciones:**
- FK obligatorias (foreign_keys ON)
- `Proyectos.nombre` UNIQUE
- `Actividades.estado` CHECK (solo valores permitidos)
- `Proyectos.precio_hora >= 0` CHECK

Para detalles, ver [Base de Datos](../main/documentacion/back/baseDatos.md).

---

## ⌚ Ciclo de Vida: Actividad + Sesión

```
Actividad: Pendiente
    ↓ (usuario clickea "Iniciar")
Abre sesión (inicio = now, fin = NULL)
    ↓ Actividad → "En progreso"
    ├─ (usuario pausa)
    │  └─ Cierra sesión, suma duracion a tiempo_total_segundos
    │     Actividad → "Pausada"
    │
    └─ (usuario reanuda)
       └─ Abre nueva sesión (independiente)
          Actividad → "En progreso" (de nuevo)

(Usuario finaliza)
    ↓
Si hay sesión abierta → cerrarla
Recalcular tiempo_total desde cero (validación defensiva)
Actividad → "Finalizada"
```

---

##  Scripts

```bash
npm run dev              # Lanzar app (abre DevTools)
npm start                # Alias de dev
npm run css:build        # Compilar Tailwind una vez
npm run css:watch        # Compilar Tailwind en watch mode (desarrollo)
npm test                 # Correr tests (Jest)
```

---

##  Testing

**Cobertura:** BD (transacciones, FK, validaciones)

```bash
npm test
```

Tests usan `fs.mkdtempSync()` para aislamiento total (DB temporal por test).

No hay tests de UI/IPC — se valida con QA manual (botones en app).

---

##  Desarrollo

### Cambiar schema DB
1. Edita `src/main/database/db.js` (CREATE TABLE IF NOT EXISTS)
2. Borra `src/programadores_es.db`
3. Reinicia app (`npm run dev`)

### Cambiar CSS
```bash
npm run css:watch    # En terminal separada mientras desarrollas
```

### Cambiar UI
Edita archivos en `src/renderer/js/` (lógica) e `index.html` (estructura).

### Agregar nuevo handler IPC
1. Añade función en `repository.js`
2. Registra en `main.js`: `registrarHandler("entidad:operacion", repo.funcion);`
3. Invocar desde renderer: `window.electron.invoke("entidad:operacion", args)`

---

##  Debugging

### Renderer (DevTools, F12)
- Console, Network, Elements
- Abre automático en `npm run dev` (comentar línea en main.js si molesta)

### Main (Terminal)
```
Logs desde repository.js aparecen en terminal de `npm run dev`, no en DevTools.
Usa console.log en repository.js para debuggear queries.
```

### DB
```javascript
// Interactivo en Node.js:
const Database = require("better-sqlite3");
const db = new Database("src/programadores_es.db");
db.prepare("SELECT * FROM Actividades").all();
```

---

##  Notas Importantes

- **Sin `ON DELETE CASCADE` (en versiones viejas):** borrar un proyecto con actividades falla por FK (protección contra borrados accidentales). Versión actual lo tiene.
- **`tiempo_total_segundos` desnormalizado:** se sincroniza a mano en `pausarSesion()` y `finalizarActividad()`. No edites sesiones manualmente sin pasar por estos métodos.
- **Context isolation:** renderer no accede a Node.js APIs directo. Usa IPC para todo (DB, filesystem, sistema).

---

##  Dependencias

### Runtime
- `better-sqlite3` — BD síncrona, performance
- `electron` — aplicación de escritorio multiplataforma

### Dev
- `@tailwindcss/cli` — compilador CSS
- `tailwindcss` — framework utilidades CSS
- `jest` — testing

---

##  Licencia

ISC







**Happy coding! **
