const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { migrar } = require('./migraciones');

let db = null;
let rutaActual = null;

// La BD debe vivir en el directorio de datos del usuario: el directorio de la
// aplicación es de solo lectura cuando está empaquetada (asar).
function getDefaultDbPath() {
    const userDataDir = app.getPath('userData');
    fs.mkdirSync(userDataDir, { recursive: true });
    return path.join(userDataDir, 'optica.db');
}

// Se mantiene el nombre histórico para no romper a quien lo importe.
const getUserDbPath = getDefaultDbPath;

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

function open(ruta = getDefaultDbPath()) {
    if (db) return Promise.resolve(db);

    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(ruta, (err) => {
            if (err) {
                db = null;
                reject(err);
            } else {
                rutaActual = ruta;
                resolve(db);
            }
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

// Copia consistente de la base de datos aunque esté abierta. Se usa
// `VACUUM INTO` en lugar de la API db.backup() de sqlite3: esa API devuelve el
// callback antes de volcar el archivo y deja la copia a 0 bytes en Windows.
function backup(destino) {
    if (!db) return Promise.reject(new Error('La base de datos no está abierta.'));
    if (fs.existsSync(destino)) {
        return Promise.reject(new Error('Ya existe un archivo en la ruta de destino.'));
    }
    return run('VACUUM INTO ?', [destino]).then(() => destino);
}

function close() {
    if (!db) return Promise.resolve();
    const connection = db;
    db = null;
    rutaActual = null;
    return new Promise((resolve) => connection.close(() => resolve()));
}

// `ruta` permite abrir una base concreta (pruebas); en la app se usa la ruta de
// datos del usuario y, si existe, se migra la BD de instalaciones antiguas.
async function init({ ruta } = {}) {
    const destino = ruta || getDefaultDbPath();
    if (!ruta) copyLegacyDatabaseIfNeeded(destino);
    await open(destino);
    await migrar({ run, get, all });
    return destino;
}

module.exports = {
    init,
    open,
    run,
    get,
    all,
    backup,
    close,
    getUserDbPath,
    getDefaultDbPath,
    get rutaActual() {
        return rutaActual;
    }
};
