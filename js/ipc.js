const { ipcMain, app } = require('electron');
const pacientes = require('./pacientes');
const { generarPDF } = require('./pdf');

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
}

module.exports = { registrarHandlers };
