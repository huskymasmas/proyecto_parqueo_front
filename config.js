// ==========================================================================
// CONFIGURACIÓN Y UTILIDADES DE API (compartido por Login.html e index.html)
// ==========================================================================
//
// Todo lo que cambia entre entornos (IP del servidor, claves) está AQUÍ.
//
// IMPORTANTE (HTTPS):
//   Si esta página se publica con https:// (GitHub Pages, Netlify, etc.) el
//   navegador BLOQUEA las llamadas a una API http:// (mixed content).
//   Para producción hay que poner la API detrás de HTTPS y cambiar API_BASE.
// ==========================================================================

const API_BASE = "http://3.145.86.203:8000/api";

// La versión actual del backend NO exige X-Web-Key ni X-Pago-Key
// (/api/manual/pendiente ya ni siquiera está enrutado: urls.py lo tiene
// comentado; todo lo del cajón Manual se hace ahora con REGISTRAR(...,manual)
// por /api/comando). Si en el futuro el backend vuelve a exigir una clave,
// se agrega aquí y en apiFetch (config.js) con el mismo patrón de antes.

const API_TIMEOUT_MS = 10000;
const REFRESCO_MS = 4000;   // cada cuánto se vuelve a consultar el parqueo


// ==========================================================================
// TAGS RFID FIJOS (según la tabla de asignación)
// ==========================================================================
// El tag 3 es dinámico: su placa nace en la página (autómata).

const TAGS_RFID = [
    { tag: 1, uid: "04 55 A6 05 2D 41 89", placa: "P101CMP", tipo: "COMPACTO",  cajon: 1 },
    { tag: 2, uid: "04 25 F1 05 2D 41 89", placa: "P102CMP", tipo: "COMPACTO",  cajon: 2 },
    { tag: 3, uid: "04 75 98 02 2D 41 89", placa: null,      tipo: "MANUAL",    cajon: 3 },
    { tag: 4, uid: "04 35 E5 02 2D 41 89", placa: "P401CRG", tipo: "CARGA",     cajon: 4 },
    { tag: 5, uid: "04 65 A6 05 2D 41 89", placa: "P501RSV", tipo: "RESERVADO", cajon: 5 },
    { tag: 6, uid: "04 35 F1 05 2D 41 89", placa: "P601GRD", tipo: "GRANDE",    cajon: 6 },
    { tag: 7, uid: "04 E5 73 08 2D 41 89", placa: "M701MOT", tipo: "MOTO",      cajon: 7 }
];

function tagPorPlaca(placa) {
    return TAGS_RFID.find(t => t.placa === placa) || null;
}


// ==========================================================================
// ERROR DE API
// ==========================================================================

class ApiError extends Error {
    constructor(mensaje, status = 0, data = null) {
        super(mensaje);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}


// ==========================================================================
// apiFetch(ruta, { method, body })
// ==========================================================================
// - Devuelve el JSON si la respuesta es 2xx y no trae ok:false.
// - Lanza ApiError con un mensaje legible en cualquier otro caso
//   (sin conexión, timeout, 4xx/5xx, JSON inválido, ok:false).

async function apiFetch(ruta, { method = "GET", body = null } = {}) {

    const headers = { "Accept": "application/json" };

    if (body !== null) {
        headers["Content-Type"] = "application/json";
    }

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), API_TIMEOUT_MS);

    let respuesta;

    try {

        respuesta = await fetch(`${API_BASE}${ruta}`, {
            method,
            headers,
            body: body !== null ? JSON.stringify(body) : undefined,
            signal: controlador.signal
        });

    } catch (error) {

        const mixto =
            window.location.protocol === "https:"
            && API_BASE.startsWith("http:");

        throw new ApiError(
            mixto
                ? "El navegador bloqueó la conexión: la página usa HTTPS pero la API usa HTTP."
                : "No se pudo conectar con el servidor. Revise la conexión o la dirección de la API."
        );

    } finally {

        clearTimeout(temporizador);

    }

    let datos = null;

    try {
        datos = await respuesta.json();
    } catch (error) {
        datos = null;
    }

    if (!respuesta.ok || (datos && datos.ok === false)) {

        throw new ApiError(
            (datos && (datos.error || datos.mensaje || datos.detail))
                || `Error ${respuesta.status} del servidor.`,
            respuesta.status,
            datos
        );

    }

    return datos;

}


// ==========================================================================
// UTILIDADES COMUNES
// ==========================================================================

// Evita inyectar HTML con datos que vienen del servidor.
function esc(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Convierte "CAJON_3", "E3", 3, "3" -> 3  (o null si no hay número)
function numeroCajon(valor) {
    const m = String(valor ?? "").match(/(\d+)/);
    return m ? Number(m[1]) : null;
}

// La lista de espacios/ocupados puede venir como arreglo o dentro de un objeto.
function comoLista(datos) {
    if (Array.isArray(datos)) return datos;
    if (datos && typeof datos === "object") {
        for (const clave of ["resultado", "results", "data", "items", "espacios", "ocupados", "historial"]) {
            if (Array.isArray(datos[clave])) return datos[clave];
        }
    }
    return [];
}

// Consulta los vehículos que están dentro del parqueo ahora mismo.
async function consultarOcupados() {
    return comoLista(await apiFetch("/espacios/ocupados"));
}

function formatearFecha(valor) {
    if (!valor) return "---";
    const f = new Date(valor);
    if (isNaN(f.getTime())) return String(valor);
    return f.toLocaleString("es-GT", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function formatearMinutos(min) {
    if (min === null || min === undefined || isNaN(min)) return "---";
    min = Math.max(0, Math.floor(min));
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    try {
        localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
    } catch (e) { /* almacenamiento no disponible */ }
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        if (localStorage.getItem("darkMode") === "true") {
            document.body.classList.add("dark-mode");
        }
    } catch (e) { /* almacenamiento no disponible */ }
});
