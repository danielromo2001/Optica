document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los botones
    const btnGuardar = document.getElementById("btnGuardar");
    const btnBuscar = document.getElementById("btnBuscar");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const btnEliminar = document.getElementById("btnEliminar");

    // Validar que los botones existan
    if (!btnGuardar || !btnBuscar || !btnLimpiar || !btnEliminar) {
        console.error("Error: No se encontraron los botones necesarios");
        return;
    }

    // Función para limpiar los campos del formulario
    const limpiarCampos = () => {
        document.querySelectorAll("input, select, textarea").forEach((element) => {
            element.value = ""; // Limpia el valor de cada campo
        });
    };

    // Función para desbloquear campos en caso de errores
    const desbloquearCampos = () => {
        document.querySelectorAll("input, select, textarea").forEach((element) => {
            element.blur(); // Elimina el foco del elemento activo
        });
        setTimeout(() => {
            document.body.style.display = "none";
            document.body.offsetHeight; // Forzar reflujo
            document.body.style.display = "";
        }, 0);
    };

    // Evento para guardar datos
    btnGuardar.addEventListener("click", (event) => {
        event.preventDefault();

        const fecha = document.getElementById("fecha").value;
        const entidad = document.getElementById("entidad").value;
        const nombre = document.getElementById("nombre").value;
        const documento = document.getElementById("documento").value;
        const edad = document.getElementById("edad").value;
        const telefono = document.getElementById("telefono").value;
        const od = document.getElementById("od").value;
        const oi = document.getElementById("oi").value;
        const adicion = document.getElementById("adicion").value; 
        const avcc_od = document.getElementById("avcc-od").value; 
        const avcc_oi = document.getElementById("avcc-oi").value; 
        const dp = document.getElementById("dp").value;
        const color = document.getElementById("color").value;
        const tipo = document.getElementById("tipo").value;
        const filtro = document.getElementById("filtro").value;
        const uso = document.getElementById("uso").value;
        const control = document.getElementById("control").value;
        const observaciones = document.getElementById("observaciones").value;
        const distanciaNasopupilarOD = document.getElementById("distancia-nasopupilar-od").value;
        const distanciaNasopupilarOI = document.getElementById("distancia-nasopupilar-oi").value;

        if (!fecha || !nombre || !documento) {
            alert("Por favor, completa todos los campos obligatorios.");
            desbloquearCampos(); // Desbloquear campos después de la alerta
            return;
        }

        const data = { fecha, entidad, nombre, documento, edad, telefono, od, oi, adicion, avcc_od, avcc_oi, dp, color, tipo, filtro, uso, control, observaciones, distanciaNasopupilarOD, distanciaNasopupilarOI };

        window.api.validarDocumento(documento, (existe) => {
            if (existe) {
                if (confirm("El documento ya existe. ¿Deseas actualizar los datos?")) {
                    window.api.actualizarConsulta(data, (response) => {
                        if (response.success) {
                            alert("Consulta actualizada exitosamente.");
                            window.api.generarPDF(data).then((pdfResponse) => {
                                if (pdfResponse.success) {
                                    alert(`PDF guardado exitosamente en: ${pdfResponse.path}`);
                                } else {
                                    alert("Error al generar el PDF.");
                                    desbloquearCampos(); // Desbloquear campos después de la alerta
                                }
                            });
                            limpiarCampos();
                        } else {
                            alert("Error al actualizar la consulta.");
                            desbloquearCampos(); // Desbloquear campos después de la alerta
                        }
                    });
                }
            } else {
                console.log("Enviando datos al proceso principal:", data);
                window.api.sendConsulta(data);
                window.api.generarPDF(data).then((pdfResponse) => {
                    if (pdfResponse.success) {
                        alert(`PDF guardado exitosamente en: ${pdfResponse.path}`);
                    } else {
                        alert("Error al generar el PDF.");
                        desbloquearCampos(); // Desbloquear campos después de la alerta
                    }
                });
                limpiarCampos();
            }
        });
    });

    // Evento para buscar datos
    btnBuscar.addEventListener("click", () => {
        const documento = document.getElementById("documento").value;

        if (!documento) {
            alert("Por favor, ingresa un documento para buscar.");
            desbloquearCampos(); // Desbloquear campos después de la alerta
            return;
        }

        window.api.buscarConsulta(documento, (data) => {
            if (!data) {
                alert("No se encontraron datos para el documento ingresado.");
                desbloquearCampos(); // Desbloquear campos después de la alerta
                return;
            }

            // Llenar todos los campos del formulario con los datos obtenidos
            document.getElementById("fecha").value = data.fecha || "";
            document.getElementById("entidad").value = data.entidad || "Natural";
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
            document.getElementById("color").value = data.color || "";
            document.getElementById("tipo").value = data.tipo || "";
            document.getElementById("filtro").value = data.filtro || "";
            document.getElementById("uso").value = data.uso || "";
            document.getElementById("control").value = data.control || "";
            document.getElementById("observaciones").value = data.observaciones || "";
            document.getElementById("distancia-nasopupilar-od").value = data.distanciaNasopupilarOD || "";
            document.getElementById("distancia-nasopupilar-oi").value = data.distanciaNasopupilarOI || "";
        });
    });

    // Evento para limpiar los campos
    btnLimpiar.addEventListener("click", limpiarCampos);

    // Evento para eliminar un paciente
    btnEliminar.addEventListener("click", () => {
        const documento = document.getElementById("documento").value;

        if (!documento) {
            alert("Por favor, ingresa un documento para eliminar.");
            desbloquearCampos(); // Desbloquear campos después de la alerta
            return;
        }

        if (confirm("¿Estás seguro de que deseas eliminar este paciente?")) {
            window.api.eliminarConsulta(documento, (response) => {
                if (response.success) {
                    alert("Paciente eliminado exitosamente.");
                    limpiarCampos();
                } else {
                    alert("Error al eliminar el paciente.");
                    desbloquearCampos(); // Desbloquear campos después de la alerta
                }
            });
        }
    });

    // Escucha el evento de confirmación de guardado
    window.api.onConsultaGuardada((response) => {
        if (response.success) {
            alert("Consulta guardada exitosamente con ID: " + response.id);
        } else {
            alert("Error al guardar la consulta.");
            desbloquearCampos();
        }
    });
});
