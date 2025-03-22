const { app, BrowserWindow, ipcMain } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');

let mainWindow;

// Ruta de la base de datos
const dbPath = path.join(__dirname, '../db/optica.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos', err);
    } else {
        console.log('Conectado a la base de datos SQLite');
        // Crear tabla si no existe
        db.run(`CREATE TABLE IF NOT EXISTS pacientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT,
            entidad TEXT,
            nombre TEXT,
            documento TEXT,
            edad INTEGER,
            telefono TEXT,
            od TEXT,
            oi TEXT,
            adicion TEXT,
            avcc_od TEXT,
            avcc_oi TEXT,
            dp TEXT,
            color TEXT,
            tipo TEXT,
            filtro TEXT,
            uso TEXT,
            control TEXT,
            observaciones TEXT,
            distanciaNasopupilarOD TEXT,
            distanciaNasopupilarOI TEXT
        )`);
    }
});

// Crear la ventana principal
app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1042,
        height: 640,
        webPreferences: {
            preload: path.join(__dirname, "../js/preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, "../app/index.html"));
});

// Manejo de eventos IPC
ipcMain.on('guardar-consulta', (event, data) => {
    console.log("Recibido en main.js:", data); // Verificar que los datos llegan aquí

    // Verificar que todos los campos tengan valores
    console.log("Campos recibidos:", JSON.stringify(data, null, 2));

    const sql = `INSERT INTO pacientes (fecha, entidad, nombre, documento, edad, telefono, od, oi, adicion, avcc_od, avcc_oi, dp, color, tipo, filtro, uso, control, observaciones, distanciaNasopupilarOD, distanciaNasopupilarOI)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [data.fecha, data.entidad, data.nombre, data.documento, data.edad, data.telefono, data.od, data.oi, data.adicion, data.avcc_od, data.avcc_oi, data.dp, data.color, data.tipo, data.filtro, data.uso, data.control, data.observaciones, data.distanciaNasopupilarOD, data.distanciaNasopupilarOI];

    console.log("Ejecutando consulta SQL:", sql);
    console.log("Parámetros:", params);

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error al guardar la consulta:', err.message); // Agregar mensaje de error más claro
            event.reply('consulta-guardada', { success: false, error: err.message });
        } else {
            console.log('Consulta guardada correctamente con ID:', this.lastID);
            event.reply('consulta-guardada', { success: true, id: this.lastID });
        }
    });
});

ipcMain.handle('actualizar-consulta', async (event, data) => {
    return new Promise((resolve) => {
        const sql = `UPDATE pacientes SET fecha = ?, entidad = ?, nombre = ?, edad = ?, telefono = ?, od = ?, oi = ?, adicion = ?, avcc_od = ?, avcc_oi = ?, dp = ?, color = ?, tipo = ?, filtro = ?, uso = ?, control = ?, observaciones = ?, distanciaNasopupilarOD = ?, distanciaNasopupilarOI = ? WHERE documento = ?`;
        const params = [data.fecha, data.entidad, data.nombre, data.edad, data.telefono, data.od, data.oi, data.adicion, data.avcc_od, data.avcc_oi, data.dp, data.color, data.tipo, data.filtro, data.uso, data.control, data.observaciones, data.distanciaNasopupilarOD, data.distanciaNasopupilarOI, data.documento];

        db.run(sql, params, function (err) {
            if (err) {
                console.error("Error al actualizar la consulta:", err.message);
                resolve({ success: false, error: err.message });
            } else {
                console.log("Consulta actualizada correctamente.");
                resolve({ success: true });
            }
        });
    });
});

ipcMain.handle('validar-documento', async (event, documento) => {
    return new Promise((resolve) => {
        const sql = `SELECT COUNT(*) AS count FROM pacientes WHERE documento = ?`;
        db.get(sql, [documento], (err, row) => {
            if (err) {
                console.error("Error al validar documento:", err.message);
                resolve(false);
            } else {
                resolve(row.count > 0);
            }
        });
    });
});

ipcMain.handle('buscar-consulta', async (event, documento) => {
    return new Promise((resolve) => {
        const sql = `SELECT * FROM pacientes WHERE documento = ?`;
        db.get(sql, [documento], (err, row) => {
            if (err) {
                console.error("Error al buscar consulta:", err.message);
                resolve(null);
            } else {
                resolve(row);
            }
        });
    });
});

ipcMain.handle('eliminar-consulta', async (event, documento) => {
    return new Promise((resolve) => {
        const sql = `DELETE FROM pacientes WHERE documento = ?`;
        db.run(sql, [documento], function (err) {
            if (err) {
                console.error("Error al eliminar el paciente:", err.message);
                resolve({ success: false, error: err.message });
            } else {
                console.log("Paciente eliminado correctamente.");
                resolve({ success: true });
            }
        });
    });
});

ipcMain.handle('generar-pdf', async (event, data) => {
    const documentsPath = app.getPath('documents');
    const folderPath = path.join(documentsPath, 'Pacientes Optica');

    // Crear la carpeta si no existe
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }

    const pdfPath = path.join(folderPath, `Paciente_${data.documento}.pdf`);
    const doc = new PDFDocument({ size: [612, 468], margin: 20 }); // Tamaño personalizado: 21.6 cm x 16.5 cm

    return new Promise((resolve) => {
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        // Encabezado con logo y título
        const logoPath = path.join(__dirname, "../images/logo.png");
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 20, 20, { width: 50 });
        }
        doc.fontSize(14).fillColor('#1770D5').text("FASHION VISION E Y C ÓPTICA, C.A.", 80, 20, { align: "center" });
        doc.fontSize(10).fillColor('#171919').text("Calle 14 No. 11-26. Barrio Delicias (Centro)", { align: "center" });
        doc.text("Villanueva, La Guajira", { align: "center" });
        doc.moveDown(1);

        // Título para la información del paciente
        doc.fontSize(12).fillColor('#1770D5').font('Helvetica-Bold').text("INFORMACIÓN DEL PACIENTE", { underline: true });
        doc.moveDown(0.5);

        // Información del paciente (en filas de tres campos)
        doc.fontSize(10).fillColor('#171919').font('Helvetica-Bold');
        const infoPaciente = [
            `Fecha: ${data.fecha || ""}                Entidad: ${data.entidad || ""}        Nombre: ${data.nombre || ""}`,
            `Documento: ${data.documento || ""}        Edad: ${data.edad || ""}                     Teléfono: ${data.telefono || ""}`
        ];
        infoPaciente.forEach((line) => {
            doc.text(line, { align: "left" });
        });
        doc.moveDown(1);

        // Título centralizado para la fórmula
        doc.fontSize(14).fillColor('#1770D5').text("FÓRMULA DE LENTES", { align: "center", underline: true });
        doc.moveDown(0.5);

        // Tabla de datos
        const tableTop = doc.y;
        const columnLeft = 50;
        const columnCenter = 250;
        const columnRight = 450;

        // Encabezados de la tabla
        doc.fontSize(10).fillColor('#1770D5');
        doc.text("Campo", columnLeft, tableTop);
        doc.text("OD", columnCenter, tableTop);
        doc.text("OI", columnRight, tableTop);

        // Línea separadora
        doc.moveTo(columnLeft, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // RX Definitiva
        doc.fontSize(10).fillColor('#171919');
        doc.font('Helvetica-Bold').text("RX Definitiva", columnLeft, tableTop + 20); // Campo en negrita
        doc.font('Helvetica').text(data.od || "", columnCenter, tableTop + 20);
        doc.text(data.oi || "", columnRight, tableTop + 20);

        // ADD (adición) en la misma tabla
        doc.font('Helvetica-Bold').text("ADD", columnLeft, tableTop + 40); // Campo en negrita
        doc.font('Helvetica').text(data.adicion || "", columnCenter, tableTop + 40);

        // AVCC
        doc.font('Helvetica-Bold').text("AVCC", columnLeft, tableTop + 60); // Campo en negrita
        doc.font('Helvetica').text(data.avcc_od || "", columnCenter, tableTop + 60);
        doc.text(data.avcc_oi || "", columnRight, tableTop + 60);

        // Distancia Nasopupilar
        doc.font('Helvetica-Bold').text("Distancia Nasopupilar", columnLeft, tableTop + 80); // Campo en negrita
        doc.font('Helvetica').text(data.distanciaNasopupilarOD || "", columnCenter, tableTop + 80);
        doc.text(data.distanciaNasopupilarOI || "", columnRight, tableTop + 80);

        // Otros Datos
        doc.font('Helvetica-Bold').text("D. Pupilar", columnLeft, tableTop + 100); // Campo en negrita
        doc.font('Helvetica').text(data.dp || "", columnCenter, tableTop + 100);
        doc.text("-", columnRight, tableTop + 100);

        doc.font('Helvetica-Bold').text("Color", columnLeft, tableTop + 120); // Campo en negrita
        doc.font('Helvetica').text(data.color || "", columnCenter, tableTop + 120);
        doc.text("-", columnRight, tableTop + 120);

        doc.font('Helvetica-Bold').text("Tipo", columnLeft, tableTop + 140); // Campo en negrita
        doc.font('Helvetica').text(data.tipo || "", columnCenter, tableTop + 140);
        doc.text("-", columnRight, tableTop + 140);

        doc.font('Helvetica-Bold').text("Filtro", columnLeft, tableTop + 160); // Campo en negrita
        doc.font('Helvetica').text(data.filtro || "", columnCenter, tableTop + 160);
        doc.text("-", columnRight, tableTop + 160);

        doc.font('Helvetica-Bold').text("Uso", columnLeft, tableTop + 180); // Campo en negrita
        doc.font('Helvetica').text(data.uso || "", columnCenter, tableTop + 180);
        doc.text("-", columnRight, tableTop + 180);

        doc.font('Helvetica-Bold').text("Control", columnLeft, tableTop + 200); // Campo en negrita
        doc.font('Helvetica').text(data.control || "", columnCenter, tableTop + 200);
        doc.text("-", columnRight, tableTop + 200);

        // Footer con contactos (uno al lado del otro)
        const footerY = doc.page.height - 50;
        const whatsappLogoPath = path.join(__dirname, "../images/whatsapp.png");
        const instagramLogoPath = path.join(__dirname, "../images/instagram.png");

        if (fs.existsSync(whatsappLogoPath)) {
            doc.image(whatsappLogoPath, 20, footerY, { width: 20 });
        }
        doc.fontSize(10).fillColor('#171919').text("3175373586 / 3114551504", 50, footerY);

        if (fs.existsSync(instagramLogoPath)) {
            doc.image(instagramLogoPath, 300, footerY, { width: 20 });
        }
        doc.fontSize(10).fillColor('#171919').text("optica_eyc / elena_escudero_optica", 330, footerY);

        // Finalizar el documento
        doc.end();

        writeStream.on('finish', () => {
            console.log(`PDF generado en: ${pdfPath}`);
            resolve({ success: true, path: pdfPath });
        });

        writeStream.on('error', (err) => {
            console.error("Error al generar el PDF:", err.message);
            resolve({ success: false, error: err.message });
        });
    });
});
