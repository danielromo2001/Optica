const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { registrarHandlers, importarBase } = require('./ipc');

let mainWindow = null;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1042,
        height: 640,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(__dirname, '../images/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, './preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    await mainWindow.loadFile(path.join(__dirname, '../app/index.html'));
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// En el primer arranque la base está vacía: se ofrece traer los datos de la
// instalación anterior para que una actualización no parezca una pérdida.
async function ofrecerImportacion() {
    try {
        const eleccion = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: 'Datos de la versión anterior',
            message: '¿Quieres importar los datos que ya tienes?',
            detail: 'Si antes usabas OpticaApp, elige «Importar datos» y selecciona el archivo '
                + 'optica.db de la instalación anterior. Si empiezas de cero, elige «Continuar».',
            buttons: ['Continuar', 'Importar datos'],
            defaultId: 1,
            cancelId: 0,
            noLink: true
        });

        if (eleccion.response !== 1) return;

        const resultado = await importarBase(mainWindow);
        if (resultado.cancelado) return;

        const total = resultado.total === 1 ? '1 paciente' : `${resultado.total} pacientes`;
        await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Importar datos',
            message: `Datos importados: ${total}.`,
            detail: resultado.respaldo
                ? `La base anterior quedó guardada en:\n${resultado.respaldo}`
                : undefined,
            buttons: ['Aceptar'],
            noLink: true
        });
    } catch (error) {
        console.error('No se pudieron importar los datos:', error);
        dialog.showErrorBox('Importar datos', `No se pudieron importar los datos:\n${error.message}`);
    }
}

app.whenReady().then(async () => {
    const rutaBase = db.getDefaultDbPath();
    const existiaBase = fs.existsSync(rutaBase);

    try {
        await db.init();
    } catch (error) {
        console.error('No se pudo inicializar la base de datos:', error);
        dialog.showErrorBox(
            'Error de base de datos',
            `No se pudo abrir la base de datos:\n${error.message}`
        );
        app.quit();
        return;
    }

    registrarHandlers();
    await createWindow();

    if (!existiaBase && await db.contarPacientes() === 0) {
        await ofrecerImportacion();
    }

    // En macOS es habitual reabrir la ventana desde el dock.
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    db.close();
});

// Un error no capturado no debe dejar la app en un estado silencioso.
process.on('uncaughtException', (error) => {
    console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Promesa rechazada sin manejar:', error);
});
