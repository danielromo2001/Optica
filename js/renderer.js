document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formulario");
    const btnGuardar = document.getElementById("btnGuardar");
    const btnBuscar = document.getElementById("btnBuscar");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const btnEliminar = document.getElementById("btnEliminar");

    if (!formulario || !btnGuardar || !btnBuscar || !btnLimpiar || !btnEliminar) {
        console.error("Error: No se encontraron los elementos necesarios");
        return;
    }

    // Lee todos los campos del formulario y los devuelve como un objeto.
    const leerFormulario = () => ({
        fecha: document.getElementById("fecha").value,
        entidad: document.getElementById("entidad").value,
        nombre: document.getElementById("nombre").value,
        documento: document.getElementById("documento").value,
        edad: document.getElementById("edad").value,
        telefono: document.getElementById("telefono").value,
        od: document.getElementById("od").value,
        oi: document.getElementById("oi").value,
        adicion: document.getElementById("adicion").value,
        avcc_od: document.getElementById("avcc-od").value,
        avcc_oi: document.getElementById("avcc-oi").value,
        dp: document.getElementById("dp").value,
        altura: document.getElementById("altura").value,
        tipo: document.getElementById("tipo").value,
        filtro: document.getElementById("filtro").value,
        uso: document.getElementById("uso").value,
        control: document.getElementById("control").value,
        observaciones: document.getElementById("observaciones").value,
        distanciaNasopupilarOD: document.getElementById("distancia-nasopupilar-od").value,
        distanciaNasopupilarOI: document.getElementById("distancia-nasopupilar-oi").value
    });

    // form.reset() vuelve a los valores por defecto del HTML (incluido el select).
    const limpiarCampos = () => formulario.reset();

    const bloquearBoton = (bloqueado) => {
        btnGuardar.disabled = bloqueado;
        btnGuardar.textContent = bloqueado ? "Guardando..." : "Guardar";
    };

    // Guarda el paciente y, solo si el guardado fue correcto, genera el PDF.
    const guardarPaciente = async () => {
        const data = leerFormulario();

        if (!data.fecha || !data.nombre || !data.documento) {
            alert("Por favor, completa fecha, nombre y documento.");
            return;
        }

        bloquearBoton(true);
        try {
            const validacion = await window.api.validarDocumento(data.documento);
            if (!validacion || !validacion.success) {
                alert(`No se pudo comprobar el documento.\n${validacion?.error || "Error desconocido"}`);
                return;
            }

            const existe = validacion.existe;
            if (existe && !confirm("El documento ya existe. ¿Deseas actualizar los datos?")) {
                return;
            }

            const resultado = existe
                ? await window.api.actualizarConsulta(data)
                : await window.api.guardarConsulta(data);

            if (!resultado || !resultado.success) {
                alert(`No se pudieron guardar los datos.\n${resultado?.error || "Error desconocido"}`);
                return;
            }

            const pdf = await window.api.generarPDF(data);
            if (pdf && pdf.success) {
                alert(`Datos guardados y PDF generado en:\n${pdf.path}`);
                limpiarCampos();
            } else {
                // Los datos sí se guardaron: no se limpian para poder reintentar el PDF.
                alert(`Datos guardados, pero no se pudo generar el PDF.\n${pdf?.error || ""}`);
            }
        } catch (error) {
            console.error("Error inesperado al guardar:", error);
            alert("Ocurrió un error inesperado al guardar los datos.");
        } finally {
            bloquearBoton(false);
        }
    };

    // preventDefault en submit evita que pulsar Enter recargue la aplicación.
    formulario.addEventListener("submit", (event) => {
        event.preventDefault();
        guardarPaciente();
    });

    btnBuscar.addEventListener("click", async () => {
        const documento = document.getElementById("documento").value;

        if (!documento) {
            alert("Por favor, ingresa un documento para buscar.");
            return;
        }

        try {
            const resultado = await window.api.buscarConsulta(documento);
            if (!resultado || !resultado.success) {
                alert(`No se pudo buscar el paciente.\n${resultado?.error || "Error desconocido"}`);
                return;
            }

            const data = resultado.paciente;
            if (!data) {
                alert("No se encontraron datos para el documento ingresado.");
                return;
            }

            document.getElementById("fecha").value = data.fecha || "";
            document.getElementById("entidad").value = data.entidad || "Particular";
            document.getElementById("nombre").value = data.nombre || "";
            document.getElementById("documento").value = data.documento || "";
            document.getElementById("edad").value = data.edad || "";
            document.getElementById("telefono").value = data.telefono || "";
            document.getElementById("od").value = data.od || "";
            document.getElementById("oi").value = data.oi || "";
            document.getElementById("adicion").value = data.adicion || "";
            document.getElementById("avcc-od").value = data.avcc_od || "";
            document.getElementById("avcc-oi").value = data.avcc_oi || "";
            document.getElementById("dp").value = data.dp || "";
            document.getElementById("altura").value = data.altura || "";
            document.getElementById("tipo").value = data.tipo || "";
            document.getElementById("filtro").value = data.filtro || "";
            document.getElementById("uso").value = data.uso || "";
            document.getElementById("control").value = data.control || "";
            document.getElementById("observaciones").value = data.observaciones || "";
            document.getElementById("distancia-nasopupilar-od").value = data.distanciaNasopupilarOD || "";
            document.getElementById("distancia-nasopupilar-oi").value = data.distanciaNasopupilarOI || "";
        } catch (error) {
            console.error("Error al buscar:", error);
            alert("Ocurrió un error inesperado al buscar el paciente.");
        }
    });

    btnLimpiar.addEventListener("click", limpiarCampos);

    btnEliminar.addEventListener("click", async () => {
        const documento = document.getElementById("documento").value;

        if (!documento) {
            alert("Por favor, ingresa un documento para eliminar.");
            return;
        }

        if (!confirm("¿Estás seguro de que deseas eliminar este paciente?")) {
            return;
        }

        try {
            const resultado = await window.api.eliminarConsulta(documento);
            if (resultado && resultado.success) {
                alert("Paciente eliminado exitosamente.");
                limpiarCampos();
            } else {
                alert(`No se pudo eliminar el paciente.\n${resultado?.error || "Error desconocido"}`);
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("Ocurrió un error inesperado al eliminar el paciente.");
        }
    });
});
