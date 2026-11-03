const { construirHTML, cargarImagenes, TAMANO_MEDIA_CARTA, DISENO_POR_DEFECTO } = require('./formula');
const { crearVentanaOculta, cargarHTML } = require('./pagina');

const ESPERA_SILENCIOSA = 30000;
const ESPERA_DIALOGO = 120000;

function imprimir(ventana, opciones, espera) {
    return new Promise((resolve) => {
        let terminado = false;
        let temporizador = null;

        const finalizar = (resultado) => {
            if (terminado) return;
            terminado = true;
            if (temporizador) clearTimeout(temporizador);
            resolve(resultado);
        };

        temporizador = setTimeout(
            () => finalizar({ success: false, error: 'La impresora no respondió a tiempo.' }),
            espera
        );

        try {
            ventana.webContents.print(opciones, (success, failureReason) => {
                finalizar({ success, error: success ? null : (failureReason || 'No se pudo imprimir.') });
            });
        } catch (error) {
            finalizar({ success: false, error: error.message });
        }
    });
}

async function impresoraPredeterminada(ventana) {
    try {
        const impresoras = await ventana.webContents.getPrintersAsync();
        return impresoras.find((impresora) => impresora.isDefault) || impresoras[0] || null;
    } catch {
        return null;
    }
}

// Opciones del trabajo de impresión. El tamaño va en micras y con el ancho
// mayor que el alto: media carta horizontal (215,9 x 139,7 mm).
function opcionesImpresion({ silencioso = true, impresora = null } = {}) {
    const opciones = {
        printBackground: true,
        pageSize: TAMANO_MEDIA_CARTA,
        margins: { marginType: 'none' },
        scaleFactor: 100,
        silent: silencioso
    };
    if (impresora) opciones.deviceName = impresora;
    return opciones;
}

// Imprime la fórmula directamente en la impresora predeterminada a tamaño media
// carta y sin diálogos. Si el sistema no puede imprimir en silencio, cae al
// diálogo de impresión de Windows para que el usuario elija impresora.
// `impresora` permite forzar una impresora concreta (pruebas o preferencia).
// `respaldoDialogo` desactiva el diálogo de Windows cuando la impresión
// silenciosa falla (útil en pruebas automatizadas).
async function imprimirFormula(data, {
    diseno = DISENO_POR_DEFECTO,
    silencioso = true,
    impresora: nombreImpresora = null,
    respaldoDialogo = true
} = {}) {
    const html = construirHTML(data, { imagenes: cargarImagenes(), diseno });
    const ventana = crearVentanaOculta();

    try {
        await cargarHTML(ventana, html);

        const impresora = nombreImpresora
            ? { name: nombreImpresora }
            : await impresoraPredeterminada(ventana);
        if (!impresora) {
            return { success: false, error: 'No hay ninguna impresora instalada o disponible.' };
        }

        const opciones = opcionesImpresion({ silencioso, impresora: nombreImpresora });

        const directa = await imprimir(ventana, opciones, ESPERA_SILENCIOSA);

        if (directa.success) {
            return { success: true, impresora: impresora.name, dialogo: false };
        }

        if (silencioso && respaldoDialogo) {
            // Silencioso falló (controlador, permisos...): se ofrece el diálogo.
            const dialogo = await imprimir(
                ventana,
                { ...opciones, silent: false },
                ESPERA_DIALOGO
            );

            if (dialogo.success) {
                return { success: true, impresora: impresora.name, dialogo: true };
            }

            const cancelado = /cancel/i.test(dialogo.error || '');
            return {
                success: false,
                cancelado,
                error: cancelado ? null : (dialogo.error || directa.error || 'No se pudo imprimir.')
            };
        }

        return { success: false, error: directa.error };
    } catch (error) {
        console.error('Error al imprimir la fórmula:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (!ventana.isDestroyed()) ventana.destroy();
    }
}

module.exports = { imprimirFormula, opcionesImpresion };
