// ==========================================================================
// PARQUEO INTELIGENTE - UMG  |  LÓGICA DEL FRONT (conectada a la API)
// ==========================================================================
//
// Requiere config.js cargado ANTES (API_BASE, apiFetch, TAGS_RFID, esc, ...).
//
// ENDPOINTS QUE USA ESTE ARCHIVO
//   GET  /api/espacios            -> mapa (7 cajones y su estado)
//   GET  /api/espacios/ocupados   -> vehículos dentro / login del cliente
//   GET  /api/historial           -> pestaña Historial
//   POST /api/comando             -> autómata: REGISTRAR(placa, tipo) y
//                                     REGISTRAR(placa, manual) -> esta última
//                                     crea el vehículo Y deja la solicitud
//                                     pendiente del cajón 3 en un solo paso
//                                     (/api/manual/pendiente ya no existe)
//   POST /api/rfid/comando        -> ASIGNAR(...)/SALIDA(...) desde "Registro
//                                     Manual de Ingreso" y "Salida Manual"
//   POST /api/pago/confirmar      -> botón "Realizar Pago" del cliente
//   GET  /api/alarmas             -> pestaña Centro de Alarmas
//   POST /api/alarma/silenciar    -> botón "Callar alarma"  { placa }
//   POST /api/login               -> (en Login.html) acceso del personal
//
// LO QUE SIGUE SIN API (queda local / demostración)
//   - Pestaña Usuarios (el API solo tiene login; no lista ni crea usuarios)
// ==========================================================================


// ==========================================================================
// ESTADO EN MEMORIA (se llena con lo que responde la API)
// ==========================================================================

const CATEGORIAS = {
    1: "COMPACTO", 2: "COMPACTO", 3: "MANUAL", 4: "CARGA",
    5: "RESERVADO", 6: "GRANDE", 7: "MOTO"
};

function crearEstadoVacio() {

    const espacios = {};

    for (let n = 1; n <= 7; n++) {
        espacios[`E${n}`] = {
            categoria: CATEGORIAS[n],
            estado: "LIBRE",
            placa: null,
            horaEntrada: null,
            pagado: false,
            fantasma: false     // OCUPADO en la BD pero sin registro activo
        };
    }

    return {
        espacios: espacios,
        historial: [],
        alarmas: []        // viene de GET /api/alarmas
    };

}

let datosParqueo = crearEstadoVacio();
let ocupadosActuales = [];
let clienteActualPlaca = null;
let clienteOcupadoActual = null;     // registro activo del cliente (o null)
let clienteEstuvoDentro = false;
let refrescando = false;

const REGEX_PLACA = /^[A-Z0-9]{5,10}$/;


// ==========================================================================
// PAGOS CONFIRMADOS DESDE ESTE NAVEGADOR
// ==========================================================================
// El backend no expone una consulta de "¿ya pagó?", así que se recuerda aquí
// cuál fue la estancia pagada. Si el backend devuelve un campo `pago`
// PAGADO/AUTORIZADO, ese valor tiene prioridad.

function leerPagos() {
    try {
        return JSON.parse(localStorage.getItem("parqueo_pagos") || "{}");
    } catch (e) {
        return {};
    }
}

function guardarPagos(pagos) {
    try {
        localStorage.setItem("parqueo_pagos", JSON.stringify(pagos));
    } catch (e) { /* almacenamiento no disponible */ }
}

function llaveEstancia(o) {
    return String(o.registro_id ?? o.fecha_entrada ?? "");
}

function estaPagado(o) {

    const pagoServidor = String(o.pago ?? "").toUpperCase();

    if (["PAGADO", "AUTORIZADO", "AUTORIZADA"].includes(pagoServidor)) {
        return true;
    }

    const pagos = leerPagos();
    const placa = String(o.placa).toUpperCase();

    return pagos[placa] !== undefined && pagos[placa] === llaveEstancia(o);

}

// Borra pagos de vehículos que ya salieron (para que no afecten otra visita).
function limpiarPagosObsoletos(ocupados) {

    const pagos = leerPagos();
    const dentro = new Set(ocupados.map(o => String(o.placa).toUpperCase()));
    let cambio = false;

    for (const placa of Object.keys(pagos)) {
        if (!dentro.has(placa)) {
            delete pagos[placa];
            cambio = true;
        }
    }

    if (cambio) guardarPagos(pagos);

}


// ==========================================================================
// AVISO DE ERROR DE CONEXIÓN
// ==========================================================================

function mostrarErrorConexion(mensaje) {

    let banner = document.getElementById("bannerConexion");

    if (!mensaje) {
        if (banner) banner.remove();
        return;
    }

    if (!banner) {

        banner = document.createElement("div");
        banner.id = "bannerConexion";
        banner.setAttribute("role", "alert");
        banner.style.cssText =
            "background:#fef2f2;color:#991b1b;border:1px solid #fca5a5;" +
            "padding:10px 14px;margin:10px 0;border-radius:8px;font-size:14px;";

        const main = document.querySelector("main") || document.body;
        main.insertBefore(banner, main.firstChild);

    }

    banner.textContent = mensaje;

}


// ==========================================================================
// CARGA PRINCIPAL
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {

    let sesionData = null;

    try {
        sesionData = sessionStorage.getItem("usuarioLogueado");
    } catch (e) { /* sin sessionStorage */ }

    if (!sesionData) {
        window.location.href = "Login.html";
        return;
    }

    let usuario;

    try {
        usuario = JSON.parse(sesionData);
    } catch (e) {
        window.location.href = "Login.html";
        return;
    }

    const labelRol = document.getElementById("label-rol-activo");

    // ----------------------------------------------------------------------
    // ADMINISTRADOR
    // ----------------------------------------------------------------------

    if (usuario.tipo === "ADMIN") {

        document.getElementById("vista-admin").style.display = "block";
        document.getElementById("vista-cliente").style.display = "none";

        if (labelRol) {
            labelRol.innerText = `Rol: ${String(usuario.username).toUpperCase()}`;
        }

        actualizarInterfazAdmin();
        renderizarUsuarios();
        renderizarVehiculos();

        refrescarAdmin();
        setInterval(() => {
            if (!document.hidden) refrescarAdmin();
        }, REFRESCO_MS);

    }

    // ----------------------------------------------------------------------
    // CLIENTE
    // ----------------------------------------------------------------------

    else {

        document.getElementById("vista-admin").style.display = "none";
        document.getElementById("vista-cliente").style.display = "block";

        clienteActualPlaca = String(usuario.placa || "").toUpperCase();

        if (labelRol) {
            labelRol.innerText = `Placa: ${clienteActualPlaca}`;
        }

        cargarDatosCliente(clienteActualPlaca);
        setInterval(() => {
            if (!document.hidden) cargarDatosCliente(clienteActualPlaca);
        }, REFRESCO_MS);

    }

});


// ==========================================================================
// CERRAR SESIÓN
// ==========================================================================

function cerrarSesion() {

    try {
        sessionStorage.removeItem("usuarioLogueado");
    } catch (e) { /* sin sessionStorage */ }

    window.location.href = "Login.html";

}


// ==========================================================================
// CAMBIO DE PESTAÑAS DEL ADMINISTRADOR
// ==========================================================================

function cambiarSubpestana(sub) {

    const vistas = {
        operacion: "sub-operacion",
        historial: "sub-historial",
        alarmas: "sub-alarmas",
        usuarios: "sub-usuarios",
        vehiculos: "sub-vehiculos"
    };

    const botones = {
        operacion: "btn-tab-op",
        historial: "btn-tab-hist",
        alarmas: "btn-tab-alrt",
        usuarios: "btn-tab-users",
        vehiculos: "btn-tab-vehiculos"
    };

    Object.entries(vistas).forEach(([nombre, id]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.style.display = nombre === sub ? "block" : "none";
        }
    });

    Object.entries(botones).forEach(([nombre, id]) => {
        const boton = document.getElementById(id);
        if (boton) {
            boton.className = `tab-btn ${nombre === sub ? "active" : ""}`;
        }
    });

    if (sub === "usuarios") renderizarUsuarios();
    if (sub === "vehiculos") renderizarVehiculos();
    if (sub === "historial") refrescarAdmin();

}


// ==========================================================================
// REFRESCAR DATOS DEL ADMIN DESDE LA API
// ==========================================================================

function normalizarCategoria(valor, cajon) {

    const t = String(valor ?? "").toLowerCase();

    const mapa = {
        compacto: "COMPACTO", manual: "MANUAL", carga: "CARGA",
        reserva: "RESERVADO", reservado: "RESERVADO",
        grande: "GRANDE", moto: "MOTO"
    };

    return mapa[t] || CATEGORIAS[cajon];

}

async function refrescarAdmin() {

    if (refrescando) return;
    refrescando = true;

    try {

        const [rEsp, rOcu, rHist, rAlr] = await Promise.allSettled([
            apiFetch("/espacios"),
            consultarOcupados(),
            apiFetch("/historial?limit=50"),
            apiFetch("/alarmas")
        ]);

        // Si fallan los dos datos principales, se avisa y se deja lo último visto.
        if (rEsp.status === "rejected" && rOcu.status === "rejected") {
            mostrarErrorConexion(rEsp.reason.message);
            return;
        }

        mostrarErrorConexion(null);

        const nuevo = crearEstadoVacio();
        nuevo.alarmas = datosParqueo.alarmas;
        nuevo.historial = datosParqueo.historial;

        // ---- Espacios (mapa) ----
        if (rEsp.status === "fulfilled") {

            comoLista(rEsp.value).forEach(item => {

                const n = numeroCajon(item.codigo ?? item.espacio ?? item.cajon);
                const slot = nuevo.espacios[`E${n}`];

                if (!slot) return;

                slot.categoria = normalizarCategoria(
                    item.categoria ?? item.tipo, n
                );

                const estado = String(item.estado ?? "LIBRE").toUpperCase();
                slot.estado = estado === "LIBRE" ? "LIBRE" : "OCUPADO";

                const placa = item.placa ?? item.vehiculo_placa;
                if (placa && slot.estado !== "LIBRE") {
                    slot.placa = String(placa).toUpperCase();
                }

            });

        }

        // ---- Ocupados (placa, hora de entrada y pago de cada cajón) ----
        if (rOcu.status === "fulfilled") {

            ocupadosActuales = rOcu.value;
            limpiarPagosObsoletos(ocupadosActuales);

            ocupadosActuales.forEach(o => {

                const n = numeroCajon(o.espacio ?? o.codigo ?? o.cajon);
                const slot = nuevo.espacios[`E${n}`];

                if (!slot) return;

                slot.estado = "OCUPADO";
                slot.placa = String(o.placa).toUpperCase();
                slot.horaEntrada = formatearFecha(o.fecha_entrada);
                slot.pagado = estaPagado(o);

            });

            // Cajón que la tabla `espacios` marca OCUPADO pero que no tiene
            // ningún registro activo (ni placa): quedó "pegado" en la BD.
            for (const codigo in nuevo.espacios) {
                const s = nuevo.espacios[codigo];
                s.fantasma = s.estado !== "LIBRE" && !s.placa;
            }

        }

        // ---- Historial ----
        if (rHist.status === "fulfilled") {

            nuevo.historial = comoLista(rHist.value).map(h => ({
                id: h.registro_id ?? h.id,
                placa: h.placa,
                espacio: `E${numeroCajon(h.espacio ?? h.codigo) ?? "?"}`,
                entrada: formatearFecha(h.fecha_entrada),
                salida: formatearFecha(h.fecha_salida),
                estado: h.estado ?? "FINALIZADO",
                monto: Number(h.monto_total ?? 0).toFixed(2)
            }));

        }

        // ---- Alarmas ----
        if (rAlr.status === "fulfilled") {
            nuevo.alarmas = comoLista(rAlr.value);
        }

        datosParqueo = nuevo;
        actualizarInterfazAdmin();

        const tabVeh = document.getElementById("sub-vehiculos");
        if (tabVeh && tabVeh.style.display !== "none") renderizarVehiculos();

    } catch (error) {

        console.error("Error refrescando el parqueo:", error);
        mostrarErrorConexion(error.message);

    } finally {

        refrescando = false;

    }

}


// ==========================================================================
// ACTUALIZAR INTERFAZ ADMIN
// ==========================================================================

function actualizarInterfazAdmin() {

    // ---------------- Posiciones de los cuadritos del mapa ----------------
    // ESTO ES ÚNICAMENTE VISUAL. top mayor = baja, left mayor = derecha.

    const coordenadasMap = {
        "E1": { top: "39.5%", left: "14%" },
        "E2": { top: "23.5%", left: "14%" },
        "E3": { top: "17%",   left: "52%" },
        "E4": { top: "15.5%", left: "84%" },
        "E5": { top: "49%",   left: "86%" },
        "E6": { top: "43.5%", left: "58%" },
        "E7": { top: "60%",   left: "58%" }
    };

    // ---------------- Dibujar espacios ----------------

    for (const codigo in datosParqueo.espacios) {

        const esp = datosParqueo.espacios[codigo];
        const slot = document.getElementById(`slot-${codigo}`);

        if (!slot) continue;

        if (coordenadasMap[codigo]) {
            slot.style.position = "absolute";
            slot.style.top = coordenadasMap[codigo].top;
            slot.style.left = coordenadasMap[codigo].left;
        }

        slot.style.zIndex = "10";
        slot.style.padding = "5px";
        slot.style.borderRadius = "6px";
        slot.style.textAlign = "center";
        slot.style.fontSize = "11px";
        slot.style.color = "#ffffff";
        slot.title = `${codigo} · ${esp.categoria}`;

        if (esp.estado === "LIBRE") {

            slot.style.backgroundColor = "rgba(16, 185, 129, 0.85)";
            slot.style.border = "2px solid #059669";
            slot.innerHTML = `<strong>${codigo}</strong><br><small>Libre</small>`;

        } else if (esp.fantasma) {

            slot.style.backgroundColor = "rgba(245, 158, 11, 0.9)";
            slot.style.border = "2px dashed #b45309";
            slot.title = `${codigo}: figura ocupado en la BD pero no tiene vehículo (registro activo)`;
            slot.innerHTML = `<strong>${codigo}</strong><br><small>Sin registro</small>`;

        } else {

            slot.style.backgroundColor = "rgba(239, 68, 68, 0.85)";
            slot.style.border = "2px solid #dc2626";
            slot.innerHTML =
                `<strong>${codigo}</strong><br><small>${esc(esp.placa || "Ocupado")}</small>`;

        }

    }

    // ---------------- Vehículos actualmente dentro ----------------

    const tabla = document.getElementById("tablaClientesAdmin");

    if (tabla) {

        let filas = "";

        for (const codigo in datosParqueo.espacios) {

            const esp = datosParqueo.espacios[codigo];

            if (esp.estado === "LIBRE" || esp.fantasma) continue;

            const badgePago = esp.pagado
                ? '<span class="badge pagado">PAGADO</span>'
                : '<span class="badge pend">PENDIENTE</span>';

            filas += `
                <tr>
                    <td>${esc(esp.placa || "---")}</td>
                    <td>${esc(esp.categoria)}</td>
                    <td>${codigo}</td>
                    <td>${badgePago}</td>
                </tr>`;

        }

        tabla.innerHTML = filas;

    }

    // ---------------- Aviso de cajones inconsistentes ----------------

    const fantasmas = Object.keys(datosParqueo.espacios)
        .filter(c => datosParqueo.espacios[c].fantasma);

    const tarjetaMapa = document.querySelector(".map-card");

    if (tarjetaMapa) {

        let aviso = document.getElementById("avisoInconsistencias");

        if (!aviso) {
            aviso = document.createElement("p");
            aviso.id = "avisoInconsistencias";
            aviso.style.cssText =
                "margin:10px 0 0;padding:8px 12px;border-radius:8px;font-size:13px;" +
                "background:#fffbeb;color:#92400e;border:1px solid #fcd34d;";
            tarjetaMapa.appendChild(aviso);
        }

        aviso.style.display = fantasmas.length ? "block" : "none";
        aviso.textContent =
            `⚠️ ${fantasmas.join(", ")} figura(n) como OCUPADO en la base de datos pero sin ` +
            "vehículo con registro activo (quedó pegado). Hay que liberarlo en la BD.";

    }

    // ---------------- Lista de vehículos para "Salida Manual" ----------------

    const selSalida = document.getElementById("placaSalidaAdmin");

    if (selSalida) {

        const placas = Object.keys(datosParqueo.espacios)
            .map(c => datosParqueo.espacios[c])
            .filter(e => e.estado !== "LIBRE" && e.placa)
            .map(e => e.placa);

        const firma = placas.join("|");

        // Solo se reconstruye si cambió la lista (así no se cierra el desplegable).
        if (selSalida.dataset.lista !== firma) {

            const elegida = selSalida.value;
            selSalida.dataset.lista = firma;

            selSalida.innerHTML = placas.length
                ? placas.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join("")
                : '<option value="">No hay vehículos dentro</option>';

            if (placas.includes(elegida)) selSalida.value = elegida;

        }

    }

    // ---------------- Historial (viene de la BD) ----------------

    const tablaHistorial = document.getElementById("tablaHistorialBD");

    if (tablaHistorial) {

        tablaHistorial.innerHTML = datosParqueo.historial.length
            ? datosParqueo.historial.map(h => `
                <tr>
                    <td>#${esc(h.id)}</td>
                    <td>${esc(h.placa)}</td>
                    <td>${esc(h.espacio)}</td>
                    <td>${esc(h.entrada)}</td>
                    <td>${esc(h.salida)}</td>
                    <td><span class="badge pagado">${esc(h.estado)}</span></td>
                    <td>$${esc(h.monto)}</td>
                </tr>`).join("")
            : '<tr><td colspan="7">Aún no hay salidas registradas.</td></tr>';

    }

    // ---------------- Alarmas (vienen de GET /api/alarmas) ----------------

    const tablaAlarmas = document.getElementById("tablaAlarmasBD");

    if (tablaAlarmas) {

        const activas = datosParqueo.alarmas.filter(a => a.estado === "ACTIVA");
        const silenciadas = datosParqueo.alarmas
            .filter(a => a.estado !== "ACTIVA")
            .slice(0, 20);                      // solo las 20 más recientes

        const fila = a => {

            const activa = a.estado === "ACTIVA";

            return `
                <tr>
                    <td>${esc(a.placa)}</td>
                    <td>E${esc(a.cajon)}</td>
                    <td>${esc(String(a.motivo ?? "").replace(/_/g, " "))}</td>
                    <td>${esc(formatearFecha(a.fecha_activacion))}</td>
                    <td><span class="badge ${activa ? "pend" : "pagado"}">${esc(a.estado)}</span></td>
                    <td>${activa
                        ? `<button class="btn-secondary"
                                   onclick="silenciarAlarma('${esc(a.placa)}', this)">
                               Callar alarma
                           </button>`
                        : "---"}
                    </td>
                </tr>`;

        };

        const todas = [...activas, ...silenciadas];

        tablaAlarmas.innerHTML = todas.length
            ? todas.map(fila).join("")
            : '<tr><td colspan="6">No hay alarmas registradas.</td></tr>';

        const badgeAlarmas = document.getElementById("badge-count-alarmas");
        if (badgeAlarmas) badgeAlarmas.innerText = activas.length;

    }

}


// ==========================================================================
// FUNCIONES DE COMANDO (autómata y RFID)
// ==========================================================================

function enviarComandoAutomata(texto) {
    return apiFetch("/comando", { method: "POST", body: { comando: texto } });
}

function enviarComandoRfid(texto) {
    return apiFetch("/rfid/comando", { method: "POST", body: { comando: texto } });
}

function vehiculoYaRegistrado(error) {
    return error.status === 409 && /ya registrado/i.test(error.message);
}

// Autómata: REGISTRAR(PLACA, manual) por /api/comando.
// En el backend actual ESTO HACE LAS DOS COSAS EN UN SOLO PASO:
//   1. Crea el vehículo en vehiculosnuevos.
//   2. Deja una solicitud PENDIENTE en solicitudes_manualnuevo para el cajón 3.
// (El endpoint viejo /api/manual/pendiente ya no existe: está comentado en urls.py).
//
// Reglas del backend a tener en cuenta:
//   - Solo puede haber UNA solicitud PENDIENTE en todo el sistema a la vez.
//   - Si la placa ya estaba registrada, REGISTRAR falla con 409 "Vehículo ya
//     registrado" y NO crea una solicitud nueva (no hay forma de volver a
//     poner en cola una placa manual ya usada mientras no se reactive
//     /api/manual/pendiente en el backend).
//
// Devuelve true si se creó una solicitud nueva, false si la placa ya existía
// (en ese caso puede que ya tenga una solicitud pendiente o ya asignada de
// un intento anterior; se intenta igual el ASIGNAR(MANUAL) después).
async function prepararVehiculoManual(placa) {

    try {

        await enviarComandoAutomata(`REGISTRAR(${placa}, manual)`);

        try {
            localStorage.setItem("parqueo_placa_manual", placa);
        } catch (e) { /* almacenamiento no disponible */ }

        return true;

    } catch (error) {

        if (vehiculoYaRegistrado(error)) return false;

        if (error.status === 409) {
            throw new ApiError(
                `${error.message} Solo puede haber una solicitud del cajón Manual ` +
                "pendiente a la vez en todo el sistema; espere a que se asigne o salga " +
                "la que está en curso."
            );
        }

        throw error;

    }

}


// ==========================================================================
// REGISTRO MANUAL DE INGRESO (simula la lectura del RFID en la entrada)
// ==========================================================================
// Fijos:  ASIGNAR(PLACA)   -> el backend ocupa el cajón de esa placa.
// Manual: REGISTRAR(placa, manual) [crea vehículo + solicitud pendiente]
//         y después ASIGNAR(MANUAL) -> ocupa el cajón 3 con esa solicitud.

const formAdminRegistro = document.getElementById("formAdminRegistro");

if (formAdminRegistro) {

    formAdminRegistro.addEventListener("submit", async function (e) {

        e.preventDefault();

        const boton = formAdminRegistro.querySelector("button[type=submit]");
        const tipo = document.getElementById("tipoVehiculo").value.toUpperCase();
        const placa = document.getElementById("placaAdmin").value.trim().toUpperCase();

        if (!REGEX_PLACA.test(placa)) {
            alert("Placa inválida. Use solo letras y números (5 a 10 caracteres).");
            return;
        }

        boton.disabled = true;

        try {

            let comando;
            let extra = "";

            if (tipo === "MANUAL") {

                const creado = await prepararVehiculoManual(placa);
                comando = "ASIGNAR(MANUAL)";
                extra = creado
                    ? " (vehículo manual creado y solicitud enviada)"
                    : " (la placa ya estaba registrada; se intenta asignar con la solicitud existente)";

            } else {

                const tag = tagPorPlaca(placa);

                if (!tag) {
                    throw new ApiError(
                        `La placa ${placa} no tiene un tag asignado. ` +
                        `Placas fijas: ${TAGS_RFID.filter(t => t.placa).map(t => t.placa).join(", ")}.`
                    );
                }

                if (tag.tipo !== tipo) {
                    throw new ApiError(
                        `La placa ${placa} corresponde a ${tag.tipo} (cajón ${tag.cajon}), no a ${tipo}.`
                    );
                }

                comando = `ASIGNAR(${placa})`;

            }

            const r = await enviarComandoRfid(comando);

            await refrescarAdmin();

            alert(
                `${r.mensaje || "Entrada autorizada"}: ${placa} → cajón ${r.cajon ?? "?"}.` +
                extra
            );

            formAdminRegistro.reset();

        } catch (error) {

            alert(`No se pudo registrar el ingreso: ${error.message}`);

        } finally {

            boton.disabled = false;

        }

    });

}


// ==========================================================================
// SALIDA MANUAL (simula la lectura del RFID en la salida)
// ==========================================================================
// 1. Si no hay pago registrado, pide confirmación y manda POST /pago/confirmar
//    (el backend solo deja salir a quien tenga una autorización).
// 2. Manda SALIDA(PLACA) para los fijos o SALIDA(MANUAL) para el cajón 3.

async function darSalidaManual(placa) {

    const o = ocupadosActuales.find(
        x => String(x.placa).toUpperCase() === placa
    );

    if (!o) {
        throw new ApiError(`${placa} no tiene un registro activo en el parqueo.`);
    }

    const tag = tagPorPlaca(placa);

    // Una placa que no es de los 6 tags fijos solo puede salir por el cajón 3.
    if (!tag && numeroCajon(o.espacio ?? o.codigo ?? o.cajon) !== 3) {
        throw new ApiError(`${placa} no es un vehículo fijo ni está en el cajón 3.`);
    }

    if (!estaPagado(o)) {

        const seguir = confirm(
            `${placa} no tiene un pago registrado desde esta página.\n\n` +
            "¿Autorizar el pago y dar salida de todos modos?"
        );

        if (!seguir) return null;

        await apiFetch("/pago/confirmar", { method: "POST", body: { placa } });

    }

    const r = await enviarComandoRfid(`SALIDA(${tag ? placa : "MANUAL"})`);

    await refrescarAdmin();

    return r;

}

const formAdminSalida = document.getElementById("formAdminSalida");

if (formAdminSalida) {

    formAdminSalida.addEventListener("submit", async function (e) {

        e.preventDefault();

        const boton = formAdminSalida.querySelector("button[type=submit]");
        const placa = document.getElementById("placaSalidaAdmin").value;

        if (!placa) {
            alert("No hay vehículos dentro del parqueo.");
            return;
        }

        boton.disabled = true;

        try {

            const r = await darSalidaManual(placa);

            if (r) alert(`${r.mensaje || "Salida autorizada"}: ${placa}.`);

        } catch (error) {

            alert(`No se pudo dar la salida: ${error.message}`);

        } finally {

            boton.disabled = false;

        }

    });

}


// ==========================================================================
// CALLAR ALARMA  ->  POST /api/alarma/silenciar  { placa }
// ==========================================================================
// Al silenciar, el ESP32 lo detecta por su polling a /api/alarma/estado
// y apaga el buzzer.

async function silenciarAlarma(placa, boton) {

    if (boton) boton.disabled = true;

    try {

        await apiFetch("/alarma/silenciar", {
            method: "POST",
            body: { placa: String(placa).toUpperCase() }
        });

        await refrescarAdmin();

    } catch (error) {

        if (boton) boton.disabled = false;

        alert(`No se pudo callar la alarma: ${error.message}`);

        // Si ya estaba silenciada (404), se refresca para reflejar el estado real.
        if (error.status === 404) refrescarAdmin();

    }

}


// ==========================================================================
// USUARIOS (demostración: la BD nueva no tiene tabla de usuarios)
// ==========================================================================

let usuariosTemporales = [
    {
        id: 1,
        username: "admin",
        email: "admin@umg.edu.gt",
        nombre_completo: "Administrador",
        rol: "ADMIN",
        activo: true,
        fecha_creacion: "Demo"
    }
];

function renderizarUsuarios() {

    const tabla = document.getElementById("tablaUsuariosAdmin");
    if (!tabla) return;

    tabla.innerHTML = usuariosTemporales.map(u => `
        <tr>
            <td>${esc(u.id)}</td>
            <td>${esc(u.username)}</td>
            <td>${esc(u.email)}</td>
            <td>${esc(u.nombre_completo)}</td>
            <td>${esc(u.rol)}</td>
            <td>${u.activo ? "Sí" : "No"}</td>
            <td>${esc(u.fecha_creacion)}</td>
        </tr>`).join("");

}

const formNuevoUsuario = document.getElementById("formNuevoUsuario");

if (formNuevoUsuario) {

    formNuevoUsuario.addEventListener("submit", function (e) {

        e.preventDefault();

        const nuevo = {
            id: usuariosTemporales.length + 1,
            username: document.getElementById("nuevoUsername").value.trim(),
            email: document.getElementById("nuevoEmail").value.trim(),
            nombre_completo: document.getElementById("nuevoNombreCompleto").value.trim(),
            rol: document.getElementById("nuevoRol").value,
            activo: document.getElementById("nuevoActivo").value === "true",
            fecha_creacion: new Date().toLocaleString()
        };

        usuariosTemporales.push(nuevo);
        renderizarUsuarios();

        const mensaje = document.getElementById("msgNuevoUsuario");
        mensaje.innerText =
            "Usuario agregado en modo demostración (no existe API de usuarios).";
        mensaje.style.color = "#16a34a";

        formNuevoUsuario.reset();

    });

}


// ==========================================================================
// VEHÍCULOS (los 6 tags fijos + el tag 3 manual)
// ==========================================================================

function renderizarVehiculos() {

    const tabla = document.getElementById("tablaVehiculosAdmin");
    if (!tabla) return;

    let placaManualGuardada = null;

    try {
        placaManualGuardada = localStorage.getItem("parqueo_placa_manual");
    } catch (e) { /* almacenamiento no disponible */ }

    tabla.innerHTML = TAGS_RFID.map(t => {

        const slot = datosParqueo.espacios[`E${t.cajon}`];

        let placa = t.placa;

        if (t.tag === 3) {
            placa = (slot && slot.placa) || placaManualGuardada || "(dinámica)";
        }

        // En parqueo = el cajón está ocupado en la BD (con o sin registro activo).
        const adentro = slot && slot.estado !== "LIBRE";
        const sinRegistro = adentro && slot.fantasma;

        const badge = !adentro
            ? '<span class="badge pagado">Fuera</span>'
            : sinRegistro
                ? '<span class="badge pend">Ocupado sin registro</span>'
                : '<span class="badge pend">En parqueo</span>';

        return `
            <tr>
                <td>${t.tag}</td>
                <td>${esc(placa)}</td>
                <td>${esc(t.tipo)}</td>
                <td>${esc(t.uid)}</td>
                <td>E${t.cajon}</td>
                <td>${badge}</td>
            </tr>`;

    }).join("");

}

// "Agregar Nuevo Vehículo" = comando REGISTRAR del autómata.
const formNuevoVehiculo = document.getElementById("formNuevoVehiculo");

if (formNuevoVehiculo) {

    formNuevoVehiculo.addEventListener("submit", async function (e) {

        e.preventDefault();

        const boton = formNuevoVehiculo.querySelector("button[type=submit]");
        const mensaje = document.getElementById("msgNuevoVehiculo");

        const placa = document.getElementById("nuevaPlacaVehiculo").value.trim().toUpperCase();
        const tipo = document.getElementById("nuevoTipoVehiculo").value.toLowerCase();

        const pintar = (texto, ok) => {
            mensaje.innerText = texto;
            mensaje.style.color = ok ? "#16a34a" : "#dc2626";
        };

        if (!REGEX_PLACA.test(placa)) {
            pintar("La placa debe tener 5 a 10 letras o números (ej: 789XY).", false);
            return;
        }

        boton.disabled = true;
        pintar("Enviando al autómata...", true);

        try {

            if (tipo === "manual") {

                const creado = await prepararVehiculoManual(placa);

                pintar(
                    creado
                        ? `Vehículo manual ${placa} creado. Cajón 3 solicitado: pase el TAG 3 ` +
                          "por el lector de entrada (o use Registro Manual de Ingreso)."
                        : `La placa ${placa} ya estaba registrada. Si no tiene una solicitud ` +
                          "pendiente o asignada de antes, el backend actual no permite volver " +
                          "a ponerla en cola (use una placa nueva).",
                    true
                );

            } else {

                await enviarComandoAutomata(`REGISTRAR(${placa}, ${tipo})`);
                pintar(`Vehículo ${placa} registrado correctamente.`, true);

            }

            formNuevoVehiculo.reset();
            renderizarVehiculos();

        } catch (error) {

            pintar(error.message, false);

        } finally {

            boton.disabled = false;

        }

    });

}


// ==========================================================================
// PORTAL DEL CLIENTE
// ==========================================================================

function ponerTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.innerText = texto;
}

async function cargarDatosCliente(placaBuscada) {

    const lblPago = document.getElementById("lblEstadoPago");
    const btnPagar = document.getElementById("btnPagar");
    const resSalida = document.getElementById("lblResultadoSalida");

    ponerTexto("lblPlaca", placaBuscada);

    let ocupados;

    try {

        ocupados = await consultarOcupados();
        mostrarErrorConexion(null);

    } catch (error) {

        mostrarErrorConexion(error.message);
        return;

    }

    limpiarPagosObsoletos(ocupados);

    const o = ocupados.find(x => String(x.placa).toUpperCase() === placaBuscada);

    // ----------------------------------------------------------------------
    // NO ESTÁ EN EL PARQUEO
    // ----------------------------------------------------------------------

    if (!o) {

        const salioPagado = clienteEstuvoDentro;

        clienteOcupadoActual = null;
        clienteEstuvoDentro = false;

        ponerTexto(
            "lblEspacio",
            salioPagado ? "Vehículo ya retirado" : "El vehículo no se encuentra en el parqueo"
        );
        ponerTexto("lblEntrada", "---");
        ponerTexto("lblTiempo", "---");

        lblPago.innerHTML = salioPagado
            ? '<span class="badge pagado">Salida completada</span>'
            : '<span class="badge pend">No se encuentra en parqueo</span>';

        btnPagar.style.display = "none";

        if (salioPagado && resSalida) {
            resSalida.innerText = "Salida completada. ¡Gracias por su visita!";
            resSalida.style.color = "#2563eb";
        }

        return;

    }

    // ----------------------------------------------------------------------
    // SÍ ESTÁ EN EL PARQUEO
    // ----------------------------------------------------------------------

    clienteOcupadoActual = o;
    clienteEstuvoDentro = true;

    const n = numeroCajon(o.espacio ?? o.codigo ?? o.cajon);
    const tag = TAGS_RFID.find(t => t.cajon === n);

    let minutos = o.minutos_transcurridos;

    if ((minutos === undefined || minutos === null) && o.fecha_entrada) {
        minutos = (Date.now() - new Date(o.fecha_entrada).getTime()) / 60000;
    }

    let tiempo = formatearMinutos(minutos);

    if (o.monto_estimado !== undefined && o.monto_estimado !== null) {
        tiempo += ` · monto estimado $${Number(o.monto_estimado).toFixed(2)}`;
    }

    ponerTexto(
        "lblEspacio",
        `E${n ?? "?"} (${tag ? tag.tipo : String(o.tipo ?? "").toUpperCase()})`
    );
    ponerTexto("lblEntrada", formatearFecha(o.fecha_entrada));
    ponerTexto("lblTiempo", tiempo);

    if (estaPagado(o)) {

        lblPago.innerHTML =
            '<span class="badge pagado">Pagado - Salida Autorizada</span>';

        btnPagar.style.display = "none";

        if (resSalida && !resSalida.innerText) {
            resSalida.innerText = "Pago registrado. Pase su TAG por el lector de salida.";
            resSalida.style.color = "#22c55e";
        }

    } else {

        lblPago.innerHTML = '<span class="badge pend">Pendiente de Pago</span>';
        btnPagar.style.display = "inline-block";
        btnPagar.disabled = false;

    }

}


// ==========================================================================
// REALIZAR PAGO  ->  POST /api/pago/confirmar  { placa }
// ==========================================================================
// El backend NO cobra dinero: solo registra la autorización de salida.
// Después el cliente pasa su TAG por el lector de salida (ESP32).

async function realizarPago() {

    if (!clienteActualPlaca) return;

    const btnPagar = document.getElementById("btnPagar");
    const resSalida = document.getElementById("lblResultadoSalida");

    if (!clienteOcupadoActual) {
        alert("El vehículo no se encuentra en el parqueo.");
        return;
    }

    btnPagar.disabled = true;

    try {

        const r = await apiFetch("/pago/confirmar", {
            method: "POST",
            body: { placa: clienteActualPlaca }
        });

        const pagos = leerPagos();
        pagos[clienteActualPlaca] = llaveEstancia(clienteOcupadoActual);
        guardarPagos(pagos);

        if (resSalida) {
            resSalida.innerText =
                (r && r.mensaje ? r.mensaje + " " : "Pago registrado. ") +
                "Pase su TAG por el lector de salida.";
            resSalida.style.color = "#22c55e";
        }

        await cargarDatosCliente(clienteActualPlaca);

    } catch (error) {

        btnPagar.disabled = false;

        if (resSalida) {
            resSalida.innerText = `No se pudo registrar el pago: ${error.message}`;
            resSalida.style.color = "#dc2626";
        }

    }

}
