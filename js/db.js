const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { migrar } = require('./migraciones');

let db = null;

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

function open() {
    if (db) return Promise.resolve(db);

    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(getUserDbPath(), (err) => {
            if (err) reject(err);
            else resolve(db);
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

function close() {
    if (!db) return Promise.resolve();
    const connection = db;
    db = null;
    return new Promise((resolve) => connection.close(() => resolve()));
}

async function init() {
    copyLegacyDatabaseIfNeeded(getUserDbPath());
    await open();
    await migrar({ run, get, all });
}

module.exports = { init, run, get, all, close, getUserDbPath };
