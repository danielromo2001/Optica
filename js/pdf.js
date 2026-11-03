const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const AZUL = '#1770D5';
const OSCURO = '#171919';

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

function generarPDF(data, documentsPath) {
    const folderPath = path.join(documentsPath, 'Pacientes Optica');
    const pdfPath = path.join(folderPath, `Paciente_${sanitizeFileName(data.documento)}.pdf`);

    try {
        fs.mkdirSync(folderPath, { recursive: true });
    } catch (err) {
        console.error('Error al crear la carpeta de PDFs:', err.message);
        return Promise.resolve({ success: false, error: err.message });
    }

    return new Promise((resolve) => {
        try {
            const doc = new PDFDocument({ size: [612, 468], margin: 20 }); // 21.6 cm x 16.5 cm
            const writeStream = fs.createWriteStream(pdfPath);
            doc.pipe(writeStream);

            // Encabezado con logo y título
            const logoPath = path.join(__dirname, '../images/logo.png');
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 20, 20, { width: 50 });
            }
            doc.fontSize(14).fillColor(AZUL).text('FASHION VISION E Y C ÓPTICA, C.A.', 80, 20, { align: 'center' });
            doc.fontSize(10).fillColor(OSCURO).text('Calle 14 No. 11-26. Barrio Delicias (Centro)', { align: 'center' });
            doc.text('Villanueva, La Guajira', { align: 'center' });
            doc.moveDown(1);

            doc.fontSize(12).fillColor(AZUL).font('Helvetica-Bold').text('INFORMACIÓN DEL PACIENTE', { underline: true });
            doc.moveDown(0.5);

            doc.fontSize(10).fillColor(OSCURO).font('Helvetica-Bold');
            const infoPaciente = [
                `Fecha: ${data.fecha || ''}                Entidad: ${data.entidad || ''}        Nombre: ${data.nombre || ''}`,
                `Documento: ${data.documento || ''}        Edad: ${data.edad || ''}                     Teléfono: ${data.telefono || ''}`
            ];
            infoPaciente.forEach((line) => doc.text(line, { align: 'left' }));
            doc.moveDown(1);

            doc.fontSize(14).fillColor(AZUL).text('FÓRMULA DE LENTES', { align: 'center', underline: true });
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const columnLeft = 50;
            const columnCenter = 250;
            const columnRight = 450;

            doc.fontSize(10).fillColor(AZUL);
            doc.text('Campo', columnLeft, tableTop);
            doc.text('OD', columnCenter, tableTop);
            doc.text('OI', columnRight, tableTop);
            doc.moveTo(columnLeft, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            const filas = [
                ['RX Definitiva', data.od, data.oi],
                ['ADD', data.adicion, ''],
                ['AVCC', data.avcc_od, data.avcc_oi],
                ['Distancia Nasopupilar', data.distanciaNasopupilarOD, data.distanciaNasopupilarOI],
                ['D. Pupilar', data.dp, '-'],
                ['Altura', data.altura, '-'],
                ['Tipo', data.tipo, '-'],
                ['Filtro', data.filtro, '-'],
                ['Uso', data.uso, '-'],
                ['Control', data.control, '-']
            ];

            doc.fontSize(10).fillColor(OSCURO);
            filas.forEach((fila, index) => {
                const y = tableTop + 20 + index * 20;
                doc.font('Helvetica-Bold').text(fila[0], columnLeft, y);
                doc.font('Helvetica').text(fila[1] || '', columnCenter, y);
                doc.text(fila[2] || '', columnRight, y);
            });

            // Footer con contactos
            const footerY = doc.page.height - 50;
            const whatsappLogoPath = path.join(__dirname, '../images/whatsapp.png');
            const instagramLogoPath = path.join(__dirname, '../images/instagram.png');

            if (fs.existsSync(whatsappLogoPath)) {
                doc.image(whatsappLogoPath, 20, footerY, { width: 20 });
            }
            doc.fontSize(10).fillColor(OSCURO).text('3175373586 / 3114551504', 50, footerY);

            if (fs.existsSync(instagramLogoPath)) {
                doc.image(instagramLogoPath, 300, footerY, { width: 20 });
            }
            doc.fontSize(10).fillColor(OSCURO).text('optica_eyc / elena_escudero_optica', 330, footerY);

            writeStream.on('finish', () => {
                console.log('PDF generado en:', pdfPath);
                resolve({ success: true, path: pdfPath });
            });
            writeStream.on('error', (err) => {
                console.error('Error al generar el PDF:', err.message);
                resolve({ success: false, error: err.message });
            });
            doc.on('error', (err) => {
                console.error('Error al generar el PDF:', err.message);
                resolve({ success: false, error: err.message });
            });

            doc.end();
        } catch (err) {
            console.error('Error al generar el PDF:', err.message);
            resolve({ success: false, error: err.message });
        }
    });
}

module.exports = { generarPDF, sanitizeFileName };
