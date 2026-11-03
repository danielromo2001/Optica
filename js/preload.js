const { contextBridge, ipcRenderer } = require("electron");

// Todas las operaciones devuelven promesas: el renderer puede usar async/await
// y manejar los errores con try/catch.
contextBridge.exposeInMainWorld("api", {
    guardarConsulta: (data) => ipcRenderer.invoke("guardar-consulta", data),
    actualizarConsulta: (data) => ipcRenderer.invoke("actualizar-consulta", data),
    validarDocumento: (documento) => ipcRenderer.invoke("validar-documento", documento),
    buscarConsulta: (documento) => ipcRenderer.invoke("buscar-consulta", documento),
    listarPacientes: (filtros) => ipcRenderer.invoke("listar-pacientes", filtros),
    eliminarConsulta: (documento) => ipcRenderer.invoke("eliminar-consulta", documento),
    generarPDF: (data) => ipcRenderer.invoke("generar-pdf", data)
});
