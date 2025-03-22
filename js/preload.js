const { contextBridge, ipcRenderer } = require("electron");

// Exponer funciones seguras al renderer
contextBridge.exposeInMainWorld("api", {
    sendConsulta: (data) => ipcRenderer.send("guardar-consulta", data), // Enviar datos para guardar
    onConsultaGuardada: (callback) => ipcRenderer.on("consulta-guardada", (event, response) => callback(response)), // Escuchar confirmación de guardado
    validarDocumento: (documento, callback) => ipcRenderer.invoke("validar-documento", documento).then(callback), // Validar si un documento ya existe
    buscarConsulta: (documento, callback) => ipcRenderer.invoke("buscar-consulta", documento).then(callback), // Buscar datos por documento
    actualizarConsulta: (data, callback) => ipcRenderer.invoke("actualizar-consulta", data).then(callback), // Actualizar datos existentes
    eliminarConsulta: (documento, callback) => ipcRenderer.invoke("eliminar-consulta", documento).then(callback), // Eliminar un registro
    generarPDF: (data) => ipcRenderer.invoke("generar-pdf", data) // Generar un PDF con los datos
});
