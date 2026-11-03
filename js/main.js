const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');

let mainWindow;
let db;
let dbReady = null;

const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Base de datos
// ---------------------------------------------------------------------------

// La BD debe vivir en el directorio de datos del usuario: el directorio de la
// aplicación es de solo lectura cuando está empaquetada (asar).
function getUserDbPath() {
    const userDataDir = app.getPath('userData');
    fs.mkdirSync(userDataDir, { recursive: true });
    return path.join(userDataDir, 'optica.db');
}

function getLegacyDbPath() {
    return path.join(__dirname, '../db/optica.db');
}

// Copia la BD de versiones anteriores (dentro de la carpeta db/) la primera vez.
function copyLegacyDatabaseIfNeeded(targetPath) {
    const legacyPath = getLegacyDbPath();
    if (!fs.existsSync(targetPath) && fs.existsSync(legacyPath)) {
        fs.copyFileSync(legacyPath, targetPath);
        console.log('Base de datos migrada desde la instalación anterior.');
    }
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(getUserDbPath(), (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function migrateDatabase() {
    await run(`CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT,
        entidad TEXT,
        nombre TEXT,
        documento TEXT NOT NULL,
        edad INTEGER,
        telefono TEXT,
        od TEXT,
        oi TEXT,
        adicion TEXT,
        avcc_od TEXT,
        avcc_oi TEXT,
        dp TEXT,
        altura TEXT,
        tipo TEXT,
        filtro TEXT,
        uso TEXT,
        control TEXT,
        observaciones TEXT,
        distanciaNasopupilarOD TEXT,
        distanciaNasopupilarOI TEXT
    )`);

    // Migración del renombrado "color" -> "altura" (commit 25e3bc4).
    const columns = await all('PRAGMA table_info(pacientes)');
    const hasAltura = columns.some((column) => column.name === 'altura');
    const hasColor = columns.some((column) => column.name === 'color');

    if (!hasAltura) {
        await run('ALTER TABLE pacientes ADD COLUMN altura TEXT');
    }
    if (hasColor) {
        await run('UPDATE pacientes SET altura = color WHERE altura IS NULL');
    }

    // Sin UNIQUE no se puede garantizar que un documento exista una sola vez.
    // Antes de crearlo, se conserva el registro más reciente de cada documento.
    const duplicates = await get(
        `SELECT COUNT(*) AS total FROM pacientes
         WHERE documento IS NOT NULL
           AND id NOT IN (SELECT MAX(id) FROM pacientes WHERE documento IS NOT NULL GROUP BY documento)`
    );
    if (duplicates.total > 0) {
        await run(
            `DELETE FROM pacientes
             WHERE documento IS NOT NULL
               AND id NOT IN (SELECT MAX(id) FROM pacientes WHERE documento IS NOT NULL GROUP BY documento)`
        );
        console.log(`Migración: ${duplicates.total} registro(s) duplicado(s) eliminado(s).`);
    }

    await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_documento ON pacientes(documento)');
    await run('CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre)');
    await run('CREATE INDEX IF NOT EXISTS idx_pacientes_fecha ON pacientes(fecha)');

    const version = await get('PRAGMA user_version');
    if (!version || version.user_version < SCHEMA_VERSION) {
        await run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    }
}

async function initDatabase() {
    copyLegacyDatabaseIfNeeded(getUserDbPath());
    await openDatabase();
    await migrateDatabase();
}

// ---------------------------------------------------------------------------
// Ventana
// ---------------------------------------------------------------------------

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1042,
        height: 640,
        webPreferences: {
            preload: path.join(__dirname, '../js/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../app/index.html'));
}

app.whenReady().then(async () => {
    try {
        dbReady = initDatabase();
        await dbReady;
    } catch (err) {
        console.error('No se pudo inicializar la base de datos:', err);
        dialog.showErrorBox(
            'Error de base de datos',
            `No se pudo abrir la base de datos:\n${err.message}`
        );
        app.quit();
        return;
    }

    createWindow();
});

// ---------------------------------------------------------------------------
// IPC: pacientes
// ---------------------------------------------------------------------------

const CAMPOS = [
    'fecha', 'entidad', 'nombre', 'documento', 'edad', 'telefono',
    'od', 'oi', 'adicion', 'avcc_od', 'avcc_oi', 'dp', 'altura',
    'tipo', 'filtro', 'uso', 'control', 'observaciones',
    'distanciaNasopupilarOD', 'distanciaNasopupilarOI'
];

// Guarda (o actualiza si el documento ya existe) un paciente. El UNIQUE de
// documento hace la operación idempotente frente a dobles clics.
ipcMain.handle('guardar-consulta', async (event, data) => {
    try {
        await dbReady;

        const params = CAMPOS.map((campo) => data[campo]);
        const actualizaciones = CAMPOS
            .filter((campo) => campo !== 'documento')
            .map((campo) => `${campo} = excluded.${campo}`)
            .join(', ');
        const sql = `INSERT INTO pacientes (${CAMPOS.join(', ')})
                     VALUES (${CAMPOS.map(() => '?').join(', ')})
                     ON CONFLICT(documento) DO UPDATE SET ${actualizaciones}`;

        const result = await run(sql, params);
        return { success: true, id: result.lastID, changes: result.changes };
    } catch (err) {
        console.error('Error al guardar la consulta:', err.message);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('actualizar-consulta', async (event, data) => {
    try {
        await dbReady;

        const campos = CAMPOS.filter((campo) => campo !== 'documento');
        const sql = `UPDATE pacientes SET ${campos.map((campo) => `${campo} = ?`).join(', ')}
                     WHERE documento = ?`;
        const params = [...campos.map((campo) => data[campo]), data.documento];
        const result = await run(sql, params);

        if (result.changes === 0) {
            return { success: false, error: 'No existe un paciente con ese documento.' };
        }
        return { success: true, changes: result.changes };
    } catch (err) {
        console.error('Error al actualizar la consulta:', err.message);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('validar-documento', async (event, documento) => {
    try {
        await dbReady;
        const row = await get('SELECT COUNT(*) AS count FROM pacientes WHERE documento = ?', [documento]);
        return row.count > 0;
    } catch (err) {
        console.error('Error al validar documento:', err.message);
        return false;
    }
});

ipcMain.handle('buscar-consulta', async (event, documento) => {
    try {
        await dbReady;
        return await get('SELECT * FROM pacientes WHERE documento = ?', [documento]) || null;
    } catch (err) {
        console.error('Error al buscar consulta:', err.message);
        return null;
    }
});

ipcMain.handle('eliminar-consulta', async (event, documento) => {
    try {
        await dbReady;
        const result = await run('DELETE FROM pacientes WHERE documento = ?', [documento]);
        if (result.changes === 0) {
            return { success: false, error: 'No existe un paciente con ese documento.' };
        }
        return { success: true, changes: result.changes };
    } catch (err) {
        console.error('Error al eliminar el paciente:', err.message);
        return { success: false, error: err.message };
    }
});

// ---------------------------------------------------------------------------
// IPC: PDF
// ---------------------------------------------------------------------------

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

ipcMain.handle('generar-pdf', async (event, data) => {
    const folderPath = path.join(app.getPath('documents'), 'Pacientes Optica');
    const pdfPath = path.join(folderPath, `Paciente_${sanitizeFileName(data.documento)}.pdf`);

    try {
        fs.mkdirSync(folderPath, { recursive: true });
    } catch (err) {
        console.error('Error al crear la carpeta de PDFs:', err.message);
        return { success: false, error: err.message };
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
            doc.fontSize(14).fillColor('#1770D5').text('FASHION VISION E Y C ÓPTICA, C.A.', 80, 20, { align: 'center' });
            doc.fontSize(10).fillColor('#171919').text('Calle 14 No. 11-26. Barrio Delicias (Centro)', { align: 'center' });
            doc.text('Villanueva, La Guajira', { align: 'center' });
            doc.moveDown(1);

            doc.fontSize(12).fillColor('#1770D5').font('Helvetica-Bold').text('INFORMACIÓN DEL PACIENTE', { underline: true });
            doc.moveDown(0.5);

            doc.fontSize(10).fillColor('#171919').font('Helvetica-Bold');
            const infoPaciente = [
                `Fecha: ${data.fecha || ''}                Entidad: ${data.entidad || ''}        Nombre: ${data.nombre || ''}`,
                `Documento: ${data.documento || ''}        Edad: ${data.edad || ''}                     Teléfono: ${data.telefono || ''}`
            ];
            infoPaciente.forEach((line) => doc.text(line, { align: 'left' }));
            doc.moveDown(1);

            doc.fontSize(14).fillColor('#1770D5').text('FÓRMULA DE LENTES', { align: 'center', underline: true });
            doc.moveDown(0.5);

            const tableTop = doc.y;
            const columnLeft = 50;
            const columnCenter = 250;
            const columnRight = 450;

            doc.fontSize(10).fillColor('#1770D5');
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

            doc.fontSize(10).fillColor('#171919');
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
            doc.fontSize(10).fillColor('#171919').text('3175373586 / 3114551504', 50, footerY);

            if (fs.existsSync(instagramLogoPath)) {
                doc.image(instagramLogoPath, 300, footerY, { width: 20 });
            }
            doc.fontSize(10).fillColor('#171919').text('optica_eyc / elena_escudero_optica', 330, footerY);

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
});
