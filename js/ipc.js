const { ipcMain, app, dialog, BrowserWindow } = require('electron');
const path = require('path');
const db = require('./db');
const pacientes = require('./pacientes');
const { generarPDF } = require('./pdf');
const { imprimirFormula } = require('./impresion');
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

// Importa la base de datos de una instalación anterior (o un respaldo).
// `ventana` permite mostrarlo como diálogo modal de la ventana principal; se
// usa tanto desde el botón «Importar datos» como en el primer arranque.
async function importarBase(ventana = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]) {
    const opciones = {
        title: 'Importar base de datos',
        buttonLabel: 'Importar',
        properties: ['openFile'],
        filters: [
            { name: 'Base de datos SQLite', extensions: ['db'] },
            { name: 'Todos los archivos', extensions: ['*'] }
        ]
    };

    const apertura = ventana
        ? await dialog.showOpenDialog(ventana, opciones)
        : await dialog.showOpenDialog(opciones);

    if (apertura.canceled || !apertura.filePaths.length) {
        return { success: true, cancelado: true };
    }

    const mensaje = {
        type: 'warning',
        title: 'Importar base de datos',
        message: '¿Reemplazar los datos actuales por los del archivo?',
        detail: 'Antes de importar se guardará una copia de la base actual en la carpeta de datos. '
            + 'Los pacientes que no estén en el archivo importado dejarán de aparecer.',
        buttons: ['Cancelar', 'Reemplazar datos'],
        defaultId: 1,
        cancelId: 0,
        noLink: true
    };

    const confirmacion = ventana
        ? await dialog.showMessageBox(ventana, mensaje)
        : await dialog.showMessageBox(mensaje);

    if (confirmacion.response !== 1) {
        return { success: true, cancelado: true };
    }

    return { success: true, ...(await db.reemplazarBase(apertura.filePaths[0])) };
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

    // Impresión directa a la impresora predeterminada, tamaño media carta.
    registrarCanal('imprimir-formula', (data) => imprimirFormula(data));

    // Importa la base de datos de una instalación anterior (o un respaldo).
    registrarCanal('importar-datos', () => importarBase());

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

module.exports = { registrarHandlers, importarBase };
