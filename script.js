// ==========================================================================
// DATOS TEMPORALES DEL PARQUEO
// ==========================================================================
// Estos datos se utilizan solamente mientras el Backend todavía
// no está conectado.
//
// Cuando existan las APIs, la información deberá venir de la BD.
// ==========================================================================

const datosParqueoIniciales = {

    talanqueraEntrada: "CERRADA",
    talanqueraSalida: "CERRADA",

    espacios: {

        "E1": {
            categoria: "COMPACTO",
            estado: "LIBRE",
            placa: null,
            horaEntrada: null,
            pagado: false
        },

        "E2": {
            categoria: "COMPACTO",
            estado: "LIBRE",
            placa: null,
            horaEntrada: null,
            pagado: false
        },

        "E3": {
            categoria: "RESERVADO",
            estado: "OCUPADO",
            placa: "ABC123",
            horaEntrada: "14:30 hrs",
            pagado: false
        },

        "E4": {
            categoria: "GRANDE",
            estado: "LIBRE",
            placa: null,
            horaEntrada: null,
            pagado: false
        },

        "E5": {
            categoria: "CARGA",
            estado: "LIBRE",
            placa: null,
            horaEntrada: null,
            pagado: false
        },

        "E6": {
            categoria: "MOTO",
            estado: "LIBRE",
            placa: null,
            horaEntrada: null,
            pagado: false
        },

        "E7": {
            categoria: "MOTO",
            estado: "LIBRE",
            placa: null,
            horaEntrada: null,
            pagado: false
        }

    },


    historial: [

        {
            id: 2,
            placa: "M456XYZ",
            espacio: "E5",
            entrada: "Hace 5 hrs",
            salida: "Hace 3 hrs",
            estado: "FINALIZADO",
            monto: "15.00"
        }

    ],


    alarmas: [

        {
            id: 1,
            tipo: "TIEMPO_EXCEDIDO",
            nivel: "ADVERTENCIA",
            espacio: "E3",
            descripcion:
                "Vehículo ABC123 superó las 2 horas continuas.",
            atendida: false
        }

    ]

};


let datosParqueo;

let clienteActualPlaca = null;


// ==========================================================================
// USUARIOS TEMPORALES
// ==========================================================================
// Cuando exista Backend:
//
// GET /api/usuarios
//
// deberá reemplazar estos datos temporales.
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


// ==========================================================================
// VEHÍCULOS TEMPORALES
// ==========================================================================
//
// Esta lista representa temporalmente la tabla "vehiculos" de la BD.
//
// Campos según la estructura que estamos utilizando:
//
// id
// placa
// tipo_vehiculo
// propietario_nombre
// propietario_telefono
// fecha_registro
//
// API BACKEND:
//
// GET /api/vehiculos
//
// deberá reemplazar esta lista cuando se conecte la BD.
// ==========================================================================

let vehiculosTemporales = [

    {
        id: 1,
        placa: "ABC123",
        tipo_vehiculo: "RESERVA",
        propietario_nombre: "Vehículo de prueba",
        propietario_telefono: "55555555",
        fecha_registro: "Demo"
    }

];


// ==========================================================================
// CONFIGURACIÓN DEL BACKEND
// ==========================================================================
//
// Cuando tu compañero tenga las APIs, aquí podrá colocar la dirección.
//
// Ejemplo:
//
// const API_BASE = "http://localhost:3000/api";
//
// Por ahora queda vacío.
// ==========================================================================

const API_BASE = "";


// ==========================================================================
// CARGAR ESTADO DEL PARQUEO
// ==========================================================================
//
// API BACKEND:
//
// En el sistema final esto puede reemplazarse por:
//
// GET /api/parqueo/estado
//
// ==========================================================================

function cargarEstado() {

    const guardado =
        localStorage.getItem("parqueo_estado");


    if (guardado) {

        try {

            datosParqueo =
                JSON.parse(guardado);

            return;

        } catch (error) {

            console.error(
                "No se pudo leer el estado local:",
                error
            );

        }

    }


    datosParqueo =
        JSON.parse(
            JSON.stringify(datosParqueoIniciales)
        );


    guardarEstado();

}


// ==========================================================================
// GUARDAR ESTADO TEMPORAL
// ==========================================================================
//
// Esto es solamente para la demostración.
//
// Cuando exista Backend, las operaciones deberán modificar la BD
// mediante sus endpoints correspondientes.
// ==========================================================================

function guardarEstado() {

    localStorage.setItem(
        "parqueo_estado",
        JSON.stringify(datosParqueo)
    );

}


cargarEstado();


// ==========================================================================
// CARGA PRINCIPAL
// ==========================================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const sesionData =
            sessionStorage.getItem(
                "usuarioLogueado"
            );


        if (!sesionData) {

            window.location.href =
                "Login.html";

            return;

        }


        const usuario =
            JSON.parse(sesionData);


        const labelRol =
            document.getElementById(
                "label-rol-activo"
            );


        // ==============================================================
        // ADMINISTRADOR
        // ==============================================================

        if (usuario.tipo === "ADMIN") {

            document.getElementById(
                "vista-admin"
            ).style.display =
                "block";


            document.getElementById(
                "vista-cliente"
            ).style.display =
                "none";


            if (labelRol) {

                labelRol.innerText =
                    `Rol: ${usuario.username.toUpperCase()}`;

            }


            cargarEstado();

            actualizarInterfazAdmin();

            renderizarUsuarios();

            renderizarVehiculos();


            // ==========================================================
            // API BACKEND
            // ==========================================================
            //
            // Al iniciar la vista administrativa se podrán consultar:
            //
            // GET /api/parqueo/estado
            // GET /api/usuarios
            // GET /api/vehiculos
            //
            // ==========================================================

        }


        // ==============================================================
        // CLIENTE
        // ==============================================================

        else {

            document.getElementById(
                "vista-admin"
            ).style.display =
                "none";


            document.getElementById(
                "vista-cliente"
            ).style.display =
                "block";


            clienteActualPlaca =
                usuario.placa.toUpperCase();


            if (labelRol) {

                labelRol.innerText =
                    `Placa: ${clienteActualPlaca}`;

            }


            cargarEstado();

            cargarDatosCliente(
                clienteActualPlaca
            );


            // ==========================================================
            // API BACKEND
            // ==========================================================
            //
            // Posible consulta:
            //
            // GET /api/registros-acceso/activo?placa=ABC123
            //
            // ==========================================================

        }

    }
);


// ==========================================================================
// CERRAR SESIÓN
// ==========================================================================

function cerrarSesion() {

    sessionStorage.removeItem(
        "usuarioLogueado"
    );


    // API BACKEND:
    //
    // Si posteriormente se utilizan tokens o sesiones reales,
    // aquí se puede invalidar la sesión.


    window.location.href =
        "Login.html";

}


// ==========================================================================
// CAMBIO DE PESTAÑAS DEL ADMINISTRADOR
// ==========================================================================

function cambiarSubpestana(sub) {

    const vistas = {

        operacion:
            "sub-operacion",

        historial:
            "sub-historial",

        alarmas:
            "sub-alarmas",

        usuarios:
            "sub-usuarios",

        vehiculos:
            "sub-vehiculos"

    };


    const botones = {

        operacion:
            "btn-tab-op",

        historial:
            "btn-tab-hist",

        alarmas:
            "btn-tab-alrt",

        usuarios:
            "btn-tab-users",

        vehiculos:
            "btn-tab-vehiculos"

    };


    Object.entries(vistas)
        .forEach(([nombre, id]) => {

            const elemento =
                document.getElementById(id);


            if (elemento) {

                elemento.style.display =
                    nombre === sub
                        ? "block"
                        : "none";

            }

        });


    Object.entries(botones)
        .forEach(([nombre, id]) => {

            const boton =
                document.getElementById(id);


            if (boton) {

                boton.className =
                    `tab-btn ${
                        nombre === sub
                            ? "active"
                            : ""
                    }`;

            }

        });


    // ==============================================================
    // USUARIOS
    // ==============================================================

    if (sub === "usuarios") {

        renderizarUsuarios();


        // API BACKEND:
        //
        // GET /api/usuarios

    }


    // ==============================================================
    // VEHÍCULOS
    // ==============================================================

    if (sub === "vehiculos") {

        renderizarVehiculos();


        // API BACKEND:
        //
        // GET /api/vehiculos

    }

}


// ==========================================================================
// ACTUALIZAR INTERFAZ ADMIN
// ==========================================================================

function actualizarInterfazAdmin() {


    // ======================================================================
    // TALANQUERA DE ENTRADA
    // ======================================================================

    const tEntrada =
        document.getElementById(
            "estado-t-entrada"
        );


    if (tEntrada) {

        tEntrada.innerText =
            datosParqueo.talanqueraEntrada;


        tEntrada.className =
            `badge ${
                datosParqueo.talanqueraEntrada === "ABIERTA"
                    ? "abierta"
                    : "cerrada"
            }`;

    }


    // ======================================================================
    // TALANQUERA DE SALIDA
    // ======================================================================

    const tSalida =
        document.getElementById(
            "estado-t-salida"
        );


    if (tSalida) {

        tSalida.innerText =
            datosParqueo.talanqueraSalida;


        tSalida.className =
            `badge ${
                datosParqueo.talanqueraSalida === "ABIERTA"
                    ? "abierta"
                    : "cerrada"
            }`;

    }


    // ======================================================================
    // POSICIONES DE LOS CUADRITOS DEL MAPA
    // ======================================================================
    //
    // ESTO ES ÚNICAMENTE VISUAL.
    //
    // top mayor  = baja
    // top menor  = sube
    //
    // left mayor = derecha
    // left menor = izquierda
    //
    // Si después quieres mover E2, E3, etc.,
    // ESTE ES EL LUGAR.
    // ======================================================================

    const coordenadasMap = {

        "E1": {
            top: "23.5%",
            left: "14%"
        },

        "E2": {
            top: "39.5%",
            left: "14%"
        },

        "E3": {
            top: "17%",
            left: "52%"
        },

        "E4": {
            top: "15.5%",
            left: "84%"
        },

        "E5": {
            top: "49%",
            left: "86%"
        },

        "E6": {
            top: "43.5%",
            left: "58%"
        },

        "E7": {
            top: "60%",
            left: "58%"
        }

    };


    // ======================================================================
    // DIBUJAR ESPACIOS
    // ======================================================================

    for (
        const codigo in datosParqueo.espacios
    ) {

        const esp =
            datosParqueo.espacios[codigo];


        const elementoSlot =
            document.getElementById(
                `slot-${codigo}`
            );


        if (!elementoSlot) {

            continue;

        }


        if (coordenadasMap[codigo]) {

            elementoSlot.style.position =
                "absolute";


            elementoSlot.style.top =
                coordenadasMap[codigo].top;


            elementoSlot.style.left =
                coordenadasMap[codigo].left;

        }


        elementoSlot.style.zIndex =
            "10";


        elementoSlot.style.padding =
            "5px";


        elementoSlot.style.borderRadius =
            "6px";


        elementoSlot.style.textAlign =
            "center";


        elementoSlot.style.fontSize =
            "11px";


        // ==============================================================
        // ESPACIO LIBRE
        // ==============================================================

        if (esp.estado === "LIBRE") {

            elementoSlot.style.backgroundColor =
                "rgba(16, 185, 129, 0.85)";


            elementoSlot.style.border =
                "2px solid #059669";


            elementoSlot.style.color =
                "#ffffff";


            elementoSlot.innerHTML =
                `
                    <strong>${codigo}</strong>
                    <br>
                    <small>Libre</small>
                `;

        }


        // ==============================================================
        // ESPACIO OCUPADO
        // ==============================================================

        else {

            elementoSlot.style.backgroundColor =
                "rgba(239, 68, 68, 0.85)";


            elementoSlot.style.border =
                "2px solid #dc2626";


            elementoSlot.style.color =
                "#ffffff";


            elementoSlot.innerHTML =
                `
                    <strong>${codigo}</strong>
                    <br>
                    <small>
                        ${esp.placa || "Ocupado"}
                    </small>
                `;

        }

    }


    // ======================================================================
    // VEHÍCULOS ACTUALMENTE DENTRO DEL PARQUEO
    // ======================================================================
    //
    // IMPORTANTE:
    //
    // Esta tabla NO es la misma que la nueva pestaña Vehículos.
    //
    // Esta tabla muestra vehículos que actualmente tienen
    // un espacio ocupado.
    //
    // API BACKEND:
    //
    // GET /api/registros-acceso/activos
    //
    // ======================================================================

    const tabla =
        document.getElementById(
            "tablaClientesAdmin"
        );


    if (tabla) {

        tabla.innerHTML =
            "";


        for (
            const codigo in datosParqueo.espacios
        ) {

            const esp =
                datosParqueo.espacios[codigo];


            if (
                esp.estado === "OCUPADO"
                ||
                esp.estado === "RESERVADO"
            ) {

                const badgePago =
                    esp.pagado

                        ? '<span class="badge pagado">PAGADO</span>'

                        : '<span class="badge pend">PENDIENTE</span>';


                tabla.innerHTML +=
                    `
                        <tr>

                            <td>
                                ${esp.placa || "---"}
                            </td>

                            <td>
                                ${esp.categoria}
                            </td>

                            <td>
                                ${codigo}
                            </td>

                            <td>
                                ${badgePago}
                            </td>

                        </tr>
                    `;

            }

        }

    }


    // ======================================================================
    // HISTORIAL
    // ======================================================================
    //
    // API BACKEND:
    //
    // GET /api/registros-acceso/historial
    //
    // ======================================================================

    const tablaHistorial =
        document.getElementById(
            "tablaHistorialBD"
        );


    if (tablaHistorial) {

        tablaHistorial.innerHTML =
            "";


        datosParqueo.historial
            .forEach(h => {

                tablaHistorial.innerHTML +=
                    `
                        <tr>

                            <td>
                                #${h.id}
                            </td>

                            <td>
                                ${h.placa}
                            </td>

                            <td>
                                ${h.espacio}
                            </td>

                            <td>
                                ${h.entrada}
                            </td>

                            <td>
                                ${h.salida}
                            </td>

                            <td>
                                <span class="badge pagado">
                                    ${h.estado}
                                </span>
                            </td>

                            <td>
                                $${h.monto}
                            </td>

                        </tr>
                    `;

            });

    }


    // ======================================================================
    // ALARMAS
    // ======================================================================
    //
    // API BACKEND:
    //
    // GET /api/alarmas
    //
    // ======================================================================

    const tablaAlarmas =
        document.getElementById(
            "tablaAlarmasBD"
        );


    if (tablaAlarmas) {

        tablaAlarmas.innerHTML =
            "";


        let noAtendidas =
            0;


        datosParqueo.alarmas
            .forEach(a => {


                if (!a.atendida) {

                    noAtendidas++;

                }


                tablaAlarmas.innerHTML +=
                    `
                        <tr>

                            <td>
                                ${a.tipo}
                            </td>

                            <td>

                                <span class="badge pend">
                                    ${a.nivel}
                                </span>

                            </td>

                            <td>
                                ${a.espacio}
                            </td>

                            <td>
                                ${a.descripcion}
                            </td>

                            <td>

                                <button
                                    class="btn-secondary"
                                    onclick="atenderAlarma(${a.id})">

                                    Resolver

                                </button>

                            </td>

                        </tr>
                    `;

            });


        const badgeAlarmas =
            document.getElementById(
                "badge-count-alarmas"
            );


        if (badgeAlarmas) {

            badgeAlarmas.innerText =
                noAtendidas;

        }

    }

}


// ==========================================================================
// REGISTRO MANUAL DE INGRESO
// ==========================================================================
//
// OJO:
//
// REGISTRAR VEHÍCULO y REGISTRAR INGRESO son cosas diferentes.
//
// Esta parte significa:
//
// "El vehículo está entrando al parqueo".
//
// API BACKEND:
//
// POST /api/registros-acceso
//
// El Backend deberá relacionar:
// - vehiculo_id
// - espacio_id
// - usuario_id
// - fecha_entrada
// - estado
//
// ==========================================================================

const formAdminRegistro =
    document.getElementById(
        "formAdminRegistro"
    );


if (formAdminRegistro) {

    formAdminRegistro.addEventListener(
        "submit",
        function (e) {

            e.preventDefault();


            cargarEstado();


            const tipoSeleccionado =
                document.getElementById(
                    "tipoVehiculo"
                ).value.toUpperCase();


            const placa =
                document.getElementById(
                    "placaAdmin"
                ).value.toUpperCase();


            let espacioEncontrado =
                null;


            // ==========================================================
            // BUSCAR ESPACIO DE LA CATEGORÍA
            // ==========================================================

            for (
                const codigo in datosParqueo.espacios
            ) {

                const esp =
                    datosParqueo.espacios[codigo];


                if (
                    esp.estado === "LIBRE"
                    &&
                    (
                        esp.categoria === tipoSeleccionado
                        ||
                        (
                            tipoSeleccionado === "RESERVADO"
                            &&
                            codigo === "E3"
                        )
                    )
                ) {

                    espacioEncontrado =
                        codigo;

                    break;

                }

            }


            // ==========================================================
            // SI NO ENCUENTRA DE ESA CATEGORÍA
            // BUSCAR CUALQUIER ESPACIO LIBRE
            // ==========================================================

            if (!espacioEncontrado) {

                for (
                    const codigo in datosParqueo.espacios
                ) {

                    if (
                        datosParqueo
                            .espacios[codigo]
                            .estado === "LIBRE"
                    ) {

                        espacioEncontrado =
                            codigo;

                        break;

                    }

                }

            }


            if (!espacioEncontrado) {

                alert(
                    "No hay espacios libres disponibles en el parqueo."
                );

                return;

            }


            // ==========================================================
            // SIMULACIÓN LOCAL DEL INGRESO
            // ==========================================================

            datosParqueo
                .espacios[espacioEncontrado]
                .estado =
                    "OCUPADO";


            datosParqueo
                .espacios[espacioEncontrado]
                .placa =
                    placa;


            datosParqueo
                .espacios[espacioEncontrado]
                .horaEntrada =
                    new Date()
                        .toLocaleTimeString(
                            [],
                            {
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        );


            datosParqueo
                .espacios[espacioEncontrado]
                .pagado =
                    false;


            datosParqueo
                .talanqueraEntrada =
                    "ABIERTA";


            guardarEstado();

            actualizarInterfazAdmin();


            // ==========================================================
            // SIMULAR CIERRE DE TALANQUERA
            // ==========================================================

            setTimeout(
                () => {

                    cargarEstado();


                    datosParqueo
                        .talanqueraEntrada =
                            "CERRADA";


                    guardarEstado();

                    actualizarInterfazAdmin();

                },
                4000
            );


            alert(
                `Vehículo ${placa} asignado a ${espacioEncontrado}. Talanquera abierta.`
            );


            formAdminRegistro.reset();

        }
    );

}


// ==========================================================================
// ATENDER ALARMA
// ==========================================================================
//
// API BACKEND:
//
// PATCH /api/alarmas/{id}
//
// Backend deberá actualizar:
//
// atendida = true
//
// y registrar usuario_atendio_id.
// ==========================================================================

function atenderAlarma(id) {

    cargarEstado();


    const alarma =
        datosParqueo.alarmas.find(
            x => x.id === id
        );


    if (alarma) {

        alarma.atendida =
            true;


        guardarEstado();

        actualizarInterfazAdmin();

    }

}


// ==========================================================================
// MOSTRAR USUARIOS
// ==========================================================================
//
// API BACKEND:
//
// GET /api/usuarios
//
// ==========================================================================

function renderizarUsuarios() {

    const tabla =
        document.getElementById(
            "tablaUsuariosAdmin"
        );


    if (!tabla) {

        return;

    }


    tabla.innerHTML =
        "";


    usuariosTemporales
        .forEach(usuario => {

            tabla.innerHTML +=
                `
                    <tr>

                        <td>
                            ${usuario.id}
                        </td>

                        <td>
                            ${usuario.username}
                        </td>

                        <td>
                            ${usuario.email}
                        </td>

                        <td>
                            ${usuario.nombre_completo}
                        </td>

                        <td>
                            ${usuario.rol}
                        </td>

                        <td>
                            ${
                                usuario.activo
                                    ? "Sí"
                                    : "No"
                            }
                        </td>

                        <td>
                            ${usuario.fecha_creacion}
                        </td>

                    </tr>
                `;

        });

}


// ==========================================================================
// CREAR NUEVO USUARIO
// ==========================================================================
//
// API BACKEND:
//
// POST /api/usuarios
//
// Enviar:
//
// {
//     username,
//     email,
//     password,
//     nombre_completo,
//     rol,
//     activo
// }
//
// IMPORTANTE:
//
// password_hash deberá generarlo el BACKEND.
// ==========================================================================

const formNuevoUsuario =
    document.getElementById(
        "formNuevoUsuario"
    );


if (formNuevoUsuario) {

    formNuevoUsuario.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const nuevoUsuario = {

                username:
                    document
                        .getElementById(
                            "nuevoUsername"
                        )
                        .value
                        .trim(),

                email:
                    document
                        .getElementById(
                            "nuevoEmail"
                        )
                        .value
                        .trim(),

                password:
                    document
                        .getElementById(
                            "nuevoPassword"
                        )
                        .value,

                nombre_completo:
                    document
                        .getElementById(
                            "nuevoNombreCompleto"
                        )
                        .value
                        .trim(),

                rol:
                    document
                        .getElementById(
                            "nuevoRol"
                        )
                        .value,

                activo:
                    document
                        .getElementById(
                            "nuevoActivo"
                        )
                        .value === "true"

            };


            const mensaje =
                document.getElementById(
                    "msgNuevoUsuario"
                );


            // ==========================================================
            // API BACKEND
            // ==========================================================
            //
            // FUTURO:
            //
            // const respuesta = await fetch(
            //     `${API_BASE}/usuarios`,
            //     {
            //         method: "POST",
            //         headers: {
            //             "Content-Type": "application/json"
            //         },
            //         body: JSON.stringify(nuevoUsuario)
            //     }
            // );
            //
            // Después:
            //
            // GET /api/usuarios
            //
            // para volver a cargar la tabla.
            // ==========================================================


            // ==========================================================
            // SIMULACIÓN TEMPORAL
            // ==========================================================

            usuariosTemporales.push({

                id:
                    usuariosTemporales.length + 1,

                username:
                    nuevoUsuario.username,

                email:
                    nuevoUsuario.email,

                nombre_completo:
                    nuevoUsuario.nombre_completo,

                rol:
                    nuevoUsuario.rol,

                activo:
                    nuevoUsuario.activo,

                fecha_creacion:
                    new Date()
                        .toLocaleString()

            });


            renderizarUsuarios();


            mensaje.innerText =
                "Usuario agregado en modo demostración. Falta enviarlo a la API/BD.";


            mensaje.style.color =
                "#16a34a";


            formNuevoUsuario.reset();

        }
    );

}


// ==========================================================================
// MOSTRAR VEHÍCULOS REGISTRADOS
// ==========================================================================
//
// OJO:
//
// Estos son TODOS los vehículos registrados en el sistema.
//
// NO significa que estén actualmente dentro del parqueo.
//
// API BACKEND:
//
// GET /api/vehiculos
//
// Deberá consultar la tabla:
//
// vehiculos
//
// ==========================================================================

function renderizarVehiculos() {

    const tabla =
        document.getElementById(
            "tablaVehiculosAdmin"
        );


    if (!tabla) {

        return;

    }


    tabla.innerHTML =
        "";


    vehiculosTemporales
        .forEach(vehiculo => {

            tabla.innerHTML +=
                `
                    <tr>

                        <td>
                            ${vehiculo.id}
                        </td>

                        <td>
                            ${vehiculo.placa}
                        </td>

                        <td>
                            ${vehiculo.tipo_vehiculo}
                        </td>

                        <td>
                            ${vehiculo.propietario_nombre}
                        </td>

                        <td>
                            ${vehiculo.propietario_telefono}
                        </td>

                        <td>
                            ${vehiculo.fecha_registro}
                        </td>

                    </tr>
                `;

        });

}


// ==========================================================================
// REGISTRAR NUEVO VEHÍCULO
// ==========================================================================
//
// ESTA PARTE CORRESPONDE CONCEPTUALMENTE A:
//
// REGISTRAR(tipo,PLACA)
//
// DEL MÓDULO DE AUTÓMATAS.
//
// Ejemplo:
//
// REGISTRAR(compacto,ABC123)
//
// API BACKEND:
//
// POST /api/vehiculos
//
// El Frontend enviará:
//
// {
//     placa: "ABC123",
//     tipo_vehiculo: "COMPACTO",
//     propietario_nombre: "Juan Pérez",
//     propietario_telefono: "55555555"
// }
//
// Backend deberá:
//
// 1. Validar placa.
// 2. Verificar que no esté registrada.
// 3. Crear registro en tabla vehiculos.
// 4. Generar fecha_registro.
// 5. Devolver vehículo creado.
//
// ==========================================================================

const formNuevoVehiculo =
    document.getElementById(
        "formNuevoVehiculo"
    );


if (formNuevoVehiculo) {

    formNuevoVehiculo.addEventListener(
        "submit",
        async function (e) {

            e.preventDefault();


            const placa =
                document
                    .getElementById(
                        "nuevaPlacaVehiculo"
                    )
                    .value
                    .trim()
                    .toUpperCase();


            const tipo =
                document
                    .getElementById(
                        "nuevoTipoVehiculo"
                    )
                    .value;


            const propietario =
                document
                    .getElementById(
                        "nuevoPropietarioVehiculo"
                    )
                    .value
                    .trim();


            const telefono =
                document
                    .getElementById(
                        "nuevoTelefonoVehiculo"
                    )
                    .value
                    .trim();


            const mensaje =
                document.getElementById(
                    "msgNuevoVehiculo"
                );


            // ==========================================================
            // VALIDAR FORMATO DE PLACA
            // ==========================================================
            //
            // El documento de Autómatas define:
            //
            // PLACA → [A-Z]{3}[0-9]{3}
            //
            // ==========================================================

            const regexPlaca =
                /^[A-Z]{3}[0-9]{3}$/;


            if (!regexPlaca.test(placa)) {

                mensaje.innerText =
                    "La placa debe tener formato ABC123.";


                mensaje.style.color =
                    "#dc2626";


                return;

            }


            // ==========================================================
            // EVITAR PLACAS DUPLICADAS EN LA SIMULACIÓN
            // ==========================================================

            const yaExiste =
                vehiculosTemporales.some(
                    vehiculo =>
                        vehiculo.placa === placa
                );


            if (yaExiste) {

                mensaje.innerText =
                    "Ese vehículo ya está registrado.";


                mensaje.style.color =
                    "#dc2626";


                return;

            }


            const nuevoVehiculo = {

                placa:
                    placa,

                tipo_vehiculo:
                    tipo,

                propietario_nombre:
                    propietario,

                propietario_telefono:
                    telefono

            };


            // ==========================================================
            // API BACKEND - REGISTRAR VEHÍCULO
            // ==========================================================
            //
            // Cuando exista la API, reemplazar la simulación por:
            //
            /*
            try {

                const respuesta =
                    await fetch(
                        `${API_BASE}/vehiculos`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    nuevoVehiculo
                                )
                        }
                    );


                if (!respuesta.ok) {

                    throw new Error(
                        "No se pudo registrar el vehículo."
                    );

                }


                const vehiculoCreado =
                    await respuesta.json();


                mensaje.innerText =
                    "Vehículo registrado correctamente.";


                mensaje.style.color =
                    "#16a34a";


                formNuevoVehiculo.reset();


                // Después consultar nuevamente:
                //
                // GET /api/vehiculos
                //
                // para actualizar la tabla.


            } catch (error) {

                mensaje.innerText =
                    error.message;


                mensaje.style.color =
                    "#dc2626";

            }


            return;
            */
            // ==========================================================


            // ==========================================================
            // SIMULACIÓN TEMPORAL SIN BACKEND
            // ==========================================================

            vehiculosTemporales.push({

                id:
                    vehiculosTemporales.length + 1,

                placa:
                    nuevoVehiculo.placa,

                tipo_vehiculo:
                    nuevoVehiculo.tipo_vehiculo,

                propietario_nombre:
                    nuevoVehiculo.propietario_nombre,

                propietario_telefono:
                    nuevoVehiculo.propietario_telefono,

                fecha_registro:
                    new Date()
                        .toLocaleString()

            });


            renderizarVehiculos();


            mensaje.innerText =
                "Vehículo registrado en modo demostración. Falta enviarlo a la API/BD.";


            mensaje.style.color =
                "#16a34a";


            formNuevoVehiculo.reset();

        }
    );

}


// ==========================================================================
// CARGAR INFORMACIÓN DEL CLIENTE
// ==========================================================================
//
// API BACKEND:
//
// GET /api/registros-acceso/activo?placa=ABC123
//
// ==========================================================================

function cargarDatosCliente(
    placaBuscada
) {

    cargarEstado();


    let encontradoCodigo =
        null;


    for (
        const codigo in datosParqueo.espacios
    ) {

        if (
            datosParqueo
                .espacios[codigo]
                .placa === placaBuscada
        ) {

            encontradoCodigo =
                codigo;

            break;

        }

    }


    if (!encontradoCodigo) {

        document.getElementById(
            "lblPlaca"
        ).innerText =
            placaBuscada;


        document.getElementById(
            "lblEspacio"
        ).innerText =
            "Sin espacio asignado o vehículo ya retirado";


        document.getElementById(
            "lblEntrada"
        ).innerText =
            "---";


        document.getElementById(
            "lblTiempo"
        ).innerText =
            "---";


        document.getElementById(
            "lblEstadoPago"
        ).innerHTML =
            '<span class="badge pend">Sin Registro Activo</span>';


        document.getElementById(
            "btnPagar"
        ).style.display =
            "none";


        return;

    }


    const datosEspacio =
        datosParqueo
            .espacios[encontradoCodigo];


    document.getElementById(
        "lblPlaca"
    ).innerText =
        placaBuscada;


    document.getElementById(
        "lblEspacio"
    ).innerText =
        `${encontradoCodigo} (${datosEspacio.categoria})`;


    document.getElementById(
        "lblEntrada"
    ).innerText =
        datosEspacio.horaEntrada
        || "Reciente";


    document.getElementById(
        "lblTiempo"
    ).innerText =
        "En curso";


    const lblPago =
        document.getElementById(
            "lblEstadoPago"
        );


    if (datosEspacio.pagado) {

        lblPago.innerHTML =
            '<span class="badge pagado">Pagado - Salida Autorizada</span>';


        document.getElementById(
            "btnPagar"
        ).style.display =
            "none";

    }

    else {

        lblPago.innerHTML =
            '<span class="badge pend">Pendiente de Pago</span>';


        document.getElementById(
            "btnPagar"
        ).style.display =
            "inline-block";

    }

}


// ==========================================================================
// REALIZAR PAGO
// ==========================================================================
//
// API BACKEND:
//
// POST /api/pagos
//
// El Backend deberá:
//
// 1. Encontrar el registro activo.
// 2. Registrar/actualizar el pago.
// 3. Actualizar monto_total.
// 4. Confirmar que la salida está autorizada.
// 5. Actualizar la talanquera.
//
// La BD deberá ser quien determine el estado real.
// ==========================================================================

async function simularPago() {


    if (!clienteActualPlaca) {

        return;

    }


    cargarEstado();


    let codigoEspacio =
        null;


    for (
        const codigo in datosParqueo.espacios
    ) {

        if (
            datosParqueo
                .espacios[codigo]
                .placa === clienteActualPlaca
        ) {

            codigoEspacio =
                codigo;

            break;

        }

    }


    if (!codigoEspacio) {

        alert(
            "No se encontró un vehículo activo con esta placa."
        );

        return;

    }


    // ======================================================================
    // API BACKEND - PAGO FUTURO
    // ======================================================================
    //
    // Ejemplo:
    //
    /*
    const respuesta =
        await fetch(
            `${API_BASE}/pagos`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        placa:
                            clienteActualPlaca
                    })
            }
        );


    const resultado =
        await respuesta.json();


    if (resultado.salida_autorizada) {

        // Backend confirmó el pago.
        // Refrescar estado del parqueo.

    }


    return;
    */
    // ======================================================================


    // ======================================================================
    // SIMULACIÓN TEMPORAL DEL PAGO
    // ======================================================================

    const vehiculoPlaca =
        datosParqueo
            .espacios[codigoEspacio]
            .placa;


    const categoriaVehiculo =
        datosParqueo
            .espacios[codigoEspacio]
            .categoria;


    const horaEntradaVehiculo =
        datosParqueo
            .espacios[codigoEspacio]
            .horaEntrada;


    datosParqueo
        .espacios[codigoEspacio]
        .pagado =
            true;


    datosParqueo
        .talanqueraSalida =
            "ABIERTA";


    guardarEstado();


    const lblPago =
        document.getElementById(
            "lblEstadoPago"
        );


    const btnPagar =
        document.getElementById(
            "btnPagar"
        );


    const resSalida =
        document.getElementById(
            "lblResultadoSalida"
        );


    if (lblPago) {

        lblPago.innerHTML =
            '<span class="badge pagado">Pagado - Salida Autorizada</span>';

    }


    if (btnPagar) {

        btnPagar.style.display =
            "none";

    }


    if (resSalida) {

        resSalida.innerHTML =
            "¡Pago exitoso! Talanquera de salida abierta.";


        resSalida.style.color =
            "#22c55e";

    }


    // ======================================================================
    // SIMULAR SALIDA
    // ======================================================================
    //
    // API BACKEND:
    //
    // Esta acción corresponde conceptualmente a:
    //
    // AUTORIZAR_SALIDA(PLACA)
    //
    // y después:
    //
    // SALIDA(PLACA)
    //
    // El Backend deberá actualizar fecha_salida,
    // registro_acceso, espacio y talanquera.
    // ======================================================================

    setTimeout(
        () => {


            cargarEstado();


            if (
                datosParqueo
                    .espacios[codigoEspacio]
                    .placa !== vehiculoPlaca
            ) {

                return;

            }


            datosParqueo
                .historial
                .unshift({

                    id:
                        Math.floor(
                            Math.random() * 900
                        ) + 100,

                    placa:
                        vehiculoPlaca,

                    espacio:
                        codigoEspacio,

                    entrada:
                        horaEntradaVehiculo
                        || "Hace un momento",

                    salida:
                        new Date()
                            .toLocaleTimeString(
                                [],
                                {
                                    hour:
                                        "2-digit",

                                    minute:
                                        "2-digit"
                                }
                            ),

                    estado:
                        "FINALIZADO",

                    monto:
                        "20.00"

                });


            datosParqueo
                .espacios[codigoEspacio] =
                {

                    categoria:
                        categoriaVehiculo,

                    estado:
                        "LIBRE",

                    placa:
                        null,

                    horaEntrada:
                        null,

                    pagado:
                        false

                };


            datosParqueo
                .talanqueraSalida =
                    "CERRADA";


            guardarEstado();


            if (resSalida) {

                resSalida.innerHTML =
                    "Salida completada. Espacio liberado.";


                resSalida.style.color =
                    "#2563eb";

            }

        },
        5000
    );

}


// ==========================================================================
// SINCRONIZACIÓN ENTRE PESTAÑAS
// ==========================================================================
//
// SOLO PARA LA DEMOSTRACIÓN ACTUAL.
//
// API BACKEND:
//
// Después puede reemplazarse por:
//
// GET /api/parqueo/estado
//
// o:
//
// WebSockets / Socket.IO
//
// ==========================================================================

window.addEventListener(
    "storage",
    event => {


        if (
            event.key !== "parqueo_estado"
            ||
            !event.newValue
        ) {

            return;

        }


        try {

            datosParqueo =
                JSON.parse(
                    event.newValue
                );


            const vistaAdmin =
                document.getElementById(
                    "vista-admin"
                );


            const vistaCliente =
                document.getElementById(
                    "vista-cliente"
                );


            if (
                vistaAdmin
                &&
                vistaAdmin.style.display !==
                    "none"
            ) {

                actualizarInterfazAdmin();

            }


            if (
                vistaCliente
                &&
                vistaCliente.style.display !==
                    "none"
                &&
                clienteActualPlaca
            ) {

                cargarDatosCliente(
                    clienteActualPlaca
                );

            }


        } catch (error) {

            console.error(
                "Error sincronizando el parqueo:",
                error
            );

        }

    }
);


// ==========================================================================
// AUTO REFRESCO DEL ADMIN
// ==========================================================================
//
// API BACKEND:
//
// Aquí después puede hacerse:
//
// GET /api/parqueo/estado
//
// cada cierto tiempo.
//
// ==========================================================================

setInterval(
    () => {


        const vistaAdmin =
            document.getElementById(
                "vista-admin"
            );


        if (
            vistaAdmin
            &&
            vistaAdmin.style.display !==
                "none"
        ) {

            cargarEstado();

            actualizarInterfazAdmin();

        }

    },
    1000
);