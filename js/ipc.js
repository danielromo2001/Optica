const { ipcMain, app, dialog, BrowserWindow } = require('electron');
const path = require('path');
const db = require('./db');
const pacientes = require('./pacientes');
const { generarPDF } = require('./pdf');
const { respaldar, nombreRespaldo } = require('./respaldo');

// Envoltorio único para todos los canales: captura cualquier excepción y la
// convierte en una respuesta uniforme. Así el renderer nunca recibe un rechazo
// sin explicación.
function registrarCanal(canal, manejador) {
    ipcMain.handle(canal, async (event, ...args) => {
        try {
            return await manejador(...args);
        } catch (error) {
            const mensaje = error.validacion
                ? error.message
                : 'No se pudo completar la operación. Inténtalo de nuevo.';
            console.error(`[IPC ${canal}]`, error.message);
            return { success: false, error: mensaje };
        }
    });
}

function registrarHandlers() {
    registrarCanal('guardar-consulta', async (data) => {
        const resultado = await pacientes.guardar(data);
        return { success: true, ...resultado };
    });

    registrarCanal('actualizar-consulta', async (data) => {
        const resultado = await pacientes.actualizar(data);
        return { success: true, ...resultado };
    });

    registrarCanal('validar-documento', async (documento) => ({
        success: true,
        existe: await pacientes.existe(documento)
    }));

    registrarCanal('buscar-consulta', async (documento) => ({
        success: true,
        paciente: await pacientes.buscar(documento)
    }));

    registrarCanal('listar-pacientes', async (filtros = {}) => {
        const esFecha = (valor) => typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor);
        const texto = typeof filtros.texto === 'string' ? filtros.texto.slice(0, 80) : '';

        const filas = await pacientes.listar({
            texto,
            desde: esFecha(filtros.desde) ? filtros.desde : '',
            hasta: esFecha(filtros.hasta) ? filtros.hasta : ''
        });

        return { success: true, pacientes: filas, total: filas.length };
    });

    registrarCanal('eliminar-consulta', async (documento) => {
        const resultado = await pacientes.eliminar(documento);
        return { success: true, ...resultado };
    });

    registrarCanal('generar-pdf', (data) => generarPDF(data, app.getPath('documents')));

    // Respaldo manual de la BD con un diálogo nativo "Guardar como".
    registrarCanal('respaldar-datos', async () => {
        const ventana = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        const opciones = {
            title: 'Guardar respaldo de la base de datos',
            defaultPath: path.join(app.getPath('documents'), nombreRespaldo()),
            filters: [{ name: 'Base de datos SQLite', extensions: ['db'] }]
        };

        const { canceled, filePath } = ventana
            ? await dialog.showSaveDialog(ventana, opciones)
            : await dialog.showSaveDialog(opciones);

        if (canceled || !filePath) {
            return { success: true, cancelado: true };
        }

        return { success: true, ...(await respaldar(db, filePath)) };
    });
}

module.exports = { registrarHandlers };
