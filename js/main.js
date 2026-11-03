const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const db = require('./db');
const { registrarHandlers } = require('./ipc');

let mainWindow = null;

function createWindow() {
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

    mainWindow.loadFile(path.join(__dirname, '../app/index.html'));
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
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
    createWindow();

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
