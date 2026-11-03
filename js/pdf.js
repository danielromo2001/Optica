const path = require('path');
const fs = require('fs');
const { construirHTML, cargarImagenes, TAMANO_MEDIA_CARTA, DISENO_POR_DEFECTO } = require('./formula');
const { crearVentanaOculta, cargarHTML } = require('./pagina');

// El documento se usa como nombre de archivo: hay que limpiar caracteres
// reservados de Windows y evitar rutas relativas.
function sanitizeFileName(value) {
    const cleaned = String(value || '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/^\.+/, '')
        .replace(/\.+$/, '')
        .trim();
    return cleaned.slice(0, 60) || 'sin_documento';
}

// Genera la fórmula en PDF a tamaño media carta horizontal usando el motor de
// impresión de Chromium. Al ser el mismo HTML que se imprime, el papel y el
// archivo salen idénticos.
async function generarPDF(data, documentsPath, { diseno = DISENO_POR_DEFECTO } = {}) {
    const folderPath = path.join(documentsPath, 'Pacientes Optica');
    const pdfPath = path.join(folderPath, `Paciente_${sanitizeFileName(data.documento)}.pdf`);

    try {
        fs.mkdirSync(folderPath, { recursive: true });
    } catch (error) {
        console.error('Error al crear la carpeta de PDFs:', error.message);
        return { success: false, error: error.message };
    }

    const html = construirHTML(data, { imagenes: cargarImagenes(), diseno });
    const ventana = crearVentanaOculta();

    try {
        await cargarHTML(ventana, html);
        const pdf = await ventana.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            pageSize: TAMANO_MEDIA_CARTA,
            margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });

        fs.writeFileSync(pdfPath, pdf);
        console.log('PDF generado en:', pdfPath);
        return { success: true, path: pdfPath };
    } catch (error) {
        console.error('Error al generar el PDF:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (!ventana.isDestroyed()) ventana.destroy();
    }
}

module.exports = { generarPDF, sanitizeFileName };
