document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    const formulario = $("formulario");
    const mensaje = $("mensaje");
    const modoEdicion = $("modo-edicion");
    const btnGuardar = $("btnGuardar");
    const btnBuscar = $("btnBuscar");
    const btnLimpiar = $("btnLimpiar");
    const btnEliminar = $("btnEliminar");

    const tabs = document.querySelectorAll(".tab");
    const vistaFormulario = $("vista-formulario");
    const vistaLista = $("vista-lista");

    const filtroTexto = $("filtro-texto");
    const filtroDesde = $("filtro-desde");
    const filtroHasta = $("filtro-hasta");
    const btnFiltrar = $("btnFiltrar");
    const btnLimpiarFiltros = $("btnLimpiarFiltros");
    const listaResumen = $("lista-resumen");
    const tablaCuerpo = $("tabla-cuerpo");
    const listaVacio = $("lista-vacio");
    const btnRespaldo = $("btnRespaldo");
    const listaMensaje = $("lista-mensaje");

    let documentoEnEdicion = null;
    let temporizadorBusqueda = null;

    // ------------------------------------------------------------------
    // Mensajes
    // ------------------------------------------------------------------

    const mostrarMensaje = (texto, tipo = "info") => {
        mensaje.textContent = texto;
        mensaje.className = `mensaje ${tipo}`;
        mensaje.hidden = false;
    };

    const ocultarMensaje = () => {
        mensaje.hidden = true;
        mensaje.textContent = "";
    };

    const mostrarMensajeLista = (texto, tipo = "info") => {
        listaMensaje.textContent = texto;
        listaMensaje.className = `mensaje ${tipo}`;
        listaMensaje.hidden = false;
    };

    const ocultarMensajeLista = () => {
        listaMensaje.hidden = true;
        listaMensaje.textContent = "";
    };

    // ------------------------------------------------------------------
    // Formulario
    // ------------------------------------------------------------------

    const leerFormulario = () => ({
        fecha: $("fecha").value,
        entidad: $("entidad").value,
        nombre: $("nombre").value,
        documento: $("documento").value,
        edad: $("edad").value,
        telefono: $("telefono").value,
        od: $("od").value,
        oi: $("oi").value,
        adicion: $("adicion").value,
        avcc_od: $("avcc-od").value,
        avcc_oi: $("avcc-oi").value,
        dp: $("dp").value,
        altura: $("altura").value,
        tipo: $("tipo").value,
        filtro: $("filtro").value,
        uso: $("uso").value,
        control: $("control").value,
        observaciones: $("observaciones").value,
        distanciaNasopupilarOD: $("distancia-nasopupilar-od").value,
        distanciaNasopupilarOI: $("distancia-nasopupilar-oi").value
    });

    const rellenarFormulario = (data) => {
        $("fecha").value = data.fecha || "";
        $("entidad").value = data.entidad || "Particular";
        $("nombre").value = data.nombre || "";
        $("documento").value = data.documento || "";
        $("edad").value = data.edad ?? "";
        $("telefono").value = data.telefono || "";
        $("od").value = data.od || "";
        $("oi").value = data.oi || "";
        $("adicion").value = data.adicion || "";
        $("avcc-od").value = data.avcc_od || "";
        $("avcc-oi").value = data.avcc_oi || "";
        $("dp").value = data.dp || "";
        $("altura").value = data.altura || "";
        $("tipo").value = data.tipo || "";
        $("filtro").value = data.filtro || "";
        $("uso").value = data.uso || "";
        $("control").value = data.control || "";
        $("observaciones").value = data.observaciones || "";
        $("distancia-nasopupilar-od").value = data.distanciaNasopupilarOD || "";
        $("distancia-nasopupilar-oi").value = data.distanciaNasopupilarOI || "";
    };

    const limpiarFormulario = () => {
        formulario.reset();
        documentoEnEdicion = null;
        modoEdicion.hidden = true;
        ocultarMensaje();
    };

    const marcarEnEdicion = (data) => {
        documentoEnEdicion = data.documento;
        modoEdicion.textContent = `Editando a ${data.nombre} (${data.documento}).`;
        modoEdicion.hidden = false;
    };

    const bloquearBoton = (bloqueado) => {
        btnGuardar.disabled = bloqueado;
        btnGuardar.textContent = bloqueado ? "Guardando..." : "Guardar";
    };

    // ------------------------------------------------------------------
    // Vistas (pestañas)
    // ------------------------------------------------------------------

    const mostrarVista = (nombre) => {
        const esFormulario = nombre === "formulario";

        vistaFormulario.hidden = !esFormulario;
        vistaLista.hidden = esFormulario;

        tabs.forEach((tab) => {
            const activo = tab.dataset.vista === nombre;
            tab.classList.toggle("activo", activo);
            tab.setAttribute("aria-selected", String(activo));
        });

        if (esFormulario) {
            $("documento").focus();
        } else {
            cargarLista();
            filtroTexto.focus();
        }
    };

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => mostrarVista(tab.dataset.vista));
    });

    // ------------------------------------------------------------------
    // Guardar
    // ------------------------------------------------------------------

    const guardarPaciente = async () => {
        const data = leerFormulario();

        if (!data.fecha || !data.nombre || !data.documento) {
            mostrarMensaje("Completa fecha, nombre y documento.", "error");
            return;
        }

        bloquearBoton(true);
        ocultarMensaje();

        try {
            const validacion = await window.api.validarDocumento(data.documento);
            if (!validacion || !validacion.success) {
                mostrarMensaje(validacion?.error || "No se pudo comprobar el documento.", "error");
                return;
            }

            const existe = validacion.existe;
            const esElMismoPaciente = documentoEnEdicion !== null
                && documentoEnEdicion === data.documento;

            if (existe && !esElMismoPaciente
                && !confirm("El documento ya existe. ¿Deseas actualizar los datos?")) {
                return;
            }

            const resultado = existe
                ? await window.api.actualizarConsulta(data)
                : await window.api.guardarConsulta(data);

            if (!resultado || !resultado.success) {
                mostrarMensaje(resultado?.error || "No se pudieron guardar los datos.", "error");
                return;
            }

            const pdf = await window.api.generarPDF(data);
            limpiarFormulario();

            if (pdf && pdf.success) {
                mostrarMensaje(`Paciente guardado. PDF: ${pdf.path}`, "exito");
            } else {
                mostrarMensaje(`Paciente guardado, pero el PDF falló: ${pdf?.error || "error desconocido"}`, "error");
            }
        } catch (error) {
            console.error("Error al guardar:", error);
            mostrarMensaje("Ocurrió un error inesperado al guardar.", "error");
        } finally {
            bloquearBoton(false);
        }
    };

    formulario.addEventListener("submit", (event) => {
        event.preventDefault();
        guardarPaciente();
    });

    // ------------------------------------------------------------------
    // Buscar por documento y eliminar desde el formulario
    // ------------------------------------------------------------------

    btnBuscar.addEventListener("click", async () => {
        const documento = $("documento").value.trim();

        if (!documento) {
            mostrarMensaje("Ingresa un documento para buscar.", "error");
            return;
        }

        try {
            const resultado = await window.api.buscarConsulta(documento);
            if (!resultado || !resultado.success) {
                mostrarMensaje(resultado?.error || "No se pudo buscar el paciente.", "error");
                return;
            }
            if (!resultado.paciente) {
                mostrarMensaje("No se encontró ningún paciente con ese documento.", "error");
                return;
            }

            rellenarFormulario(resultado.paciente);
            marcarEnEdicion(resultado.paciente);
            mostrarMensaje("Paciente cargado. Puedes editarlo y guardar los cambios.", "info");
        } catch (error) {
            console.error("Error al buscar:", error);
            mostrarMensaje("Ocurrió un error inesperado al buscar.", "error");
        }
    });

    btnLimpiar.addEventListener("click", limpiarFormulario);

    const eliminarPaciente = async (documento) => {
        if (!documento) {
            mostrarMensaje("No hay un paciente seleccionado para eliminar.", "error");
            return;
        }

        if (!confirm(`¿Eliminar el paciente con documento ${documento}?`)) {
            return;
        }

        try {
            const resultado = await window.api.eliminarConsulta(documento);
            if (resultado && resultado.success) {
                limpiarFormulario();
                mostrarMensaje("Paciente eliminado.", "exito");
                if (!vistaLista.hidden) cargarLista();
            } else {
                mostrarMensaje(resultado?.error || "No se pudo eliminar el paciente.", "error");
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            mostrarMensaje("Ocurrió un error inesperado al eliminar.", "error");
        }
    };

    btnEliminar.addEventListener("click", () => eliminarPaciente($("documento").value.trim()));

    // ------------------------------------------------------------------
    // Listado de pacientes
    // ------------------------------------------------------------------

    const formatearFecha = (fecha) => {
        if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha || "";
        const [anio, mes, dia] = fecha.split("-");
        return `${dia}/${mes}/${anio}`;
    };

    const crearCelda = (texto) => {
        const celda = document.createElement("td");
        celda.textContent = texto;
        return celda;
    };

    const abrirPaciente = async (documento) => {
        try {
            const resultado = await window.api.buscarConsulta(documento);
            if (!resultado || !resultado.success || !resultado.paciente) {
                mostrarMensaje("No se pudo cargar el paciente.", "error");
                return;
            }

            rellenarFormulario(resultado.paciente);
            marcarEnEdicion(resultado.paciente);
            mostrarVista("formulario");
            mostrarMensaje("Paciente cargado. Puedes editarlo y guardar los cambios.", "info");
        } catch (error) {
            console.error("Error al abrir paciente:", error);
            mostrarMensaje("Ocurrió un error inesperado al abrir el paciente.", "error");
        }
    };

    const pintarFilas = (pacientes) => {
        tablaCuerpo.textContent = "";

        pacientes.forEach((paciente) => {
            const fila = document.createElement("tr");
            fila.dataset.documento = paciente.documento;

            fila.appendChild(crearCelda(paciente.documento));
            fila.appendChild(crearCelda(paciente.nombre));
            fila.appendChild(crearCelda(formatearFecha(paciente.fecha)));
            fila.appendChild(crearCelda(paciente.telefono || "—"));
            fila.appendChild(crearCelda(paciente.altura || "—"));

            const acciones = document.createElement("td");
            acciones.className = "acciones";

            const abrir = document.createElement("button");
            abrir.type = "button";
            abrir.textContent = "Abrir";
            abrir.className = "boton-secundario";
            abrir.addEventListener("click", (event) => {
                event.stopPropagation();
                abrirPaciente(paciente.documento);
            });

            const borrar = document.createElement("button");
            borrar.type = "button";
            borrar.textContent = "Eliminar";
            borrar.className = "boton-peligro";
            borrar.addEventListener("click", (event) => {
                event.stopPropagation();
                eliminarPaciente(paciente.documento);
            });

            acciones.appendChild(abrir);
            acciones.appendChild(borrar);
            fila.appendChild(acciones);

            fila.addEventListener("click", () => abrirPaciente(paciente.documento));
            tablaCuerpo.appendChild(fila);
        });
    };

    async function cargarLista() {
        const filtros = {
            texto: filtroTexto.value.trim(),
            desde: filtroDesde.value,
            hasta: filtroHasta.value
        };

        listaResumen.textContent = "Cargando...";

        try {
            const resultado = await window.api.listarPacientes(filtros);
            if (!resultado || !resultado.success) {
                listaResumen.textContent = "";
                mostrarMensaje(resultado?.error || "No se pudo cargar el listado.", "error");
                return;
            }

            const pacientes = resultado.pacientes || [];
            pintarFilas(pacientes);

            listaVacio.hidden = pacientes.length > 0;
            listaResumen.textContent = pacientes.length === 1
                ? "1 paciente"
                : `${pacientes.length} pacientes`;
        } catch (error) {
            console.error("Error al listar:", error);
            listaResumen.textContent = "";
            mostrarMensaje("Ocurrió un error inesperado al cargar el listado.", "error");
        }
    }

    filtroTexto.addEventListener("input", () => {
        clearTimeout(temporizadorBusqueda);
        temporizadorBusqueda = setTimeout(cargarLista, 350);
    });

    filtroTexto.addEventListener("search", cargarLista);
    filtroDesde.addEventListener("change", cargarLista);
    filtroHasta.addEventListener("change", cargarLista);
    btnFiltrar.addEventListener("click", cargarLista);

    btnLimpiarFiltros.addEventListener("click", () => {
        filtroTexto.value = "";
        filtroDesde.value = "";
        filtroHasta.value = "";
        ocultarMensajeLista();
        cargarLista();
        filtroTexto.focus();
    });

    // ------------------------------------------------------------------
    // Respaldo de la base de datos
    // ------------------------------------------------------------------

    btnRespaldo.addEventListener("click", async () => {
        btnRespaldo.disabled = true;
        ocultarMensajeLista();

        try {
            const resultado = await window.api.respaldarDatos();

            if (!resultado || !resultado.success) {
                mostrarMensajeLista(resultado?.error || "No se pudo crear el respaldo.", "error");
                return;
            }
            if (resultado.cancelado) return;

            mostrarMensajeLista(`Respaldo guardado en ${resultado.path}`, "exito");
        } catch (error) {
            console.error("Error al respaldar:", error);
            mostrarMensajeLista("Ocurrió un error inesperado al crear el respaldo.", "error");
        } finally {
            btnRespaldo.disabled = false;
        }
    });

    // ------------------------------------------------------------------
    // Atajos de teclado
    // ------------------------------------------------------------------

    document.addEventListener("keydown", (event) => {
        const conModificador = event.ctrlKey || event.metaKey;

        if (conModificador && event.key.toLowerCase() === "s") {
            event.preventDefault();
            if (!vistaFormulario.hidden) guardarPaciente();
        }

        if (conModificador && event.key.toLowerCase() === "f") {
            event.preventDefault();
            mostrarVista("lista");
        }
    });

    // Primera carga: fecha de hoy y vista de formulario.
    $("fecha").value = new Date().toISOString().slice(0, 10);
});
