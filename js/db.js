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

// Rutas donde han vivido las bases de datos de versiones anteriores:
// - el proyecto en desarrollo (db/ opcionalmente dentro del asar),
// - la app empaquetada con electron-packager (resources/app/db/),
// - la carpeta de instalación cuando el ejecutable quedaba al lado de db/.
function getLegacyDbPaths() {
    const candidatos = [getLegacyDbPath()];

    try {
        const ejecutable = path.dirname(app.getPath('exe'));
        const recursos = process.resourcesPath;

        candidatos.push(
            path.join(ejecutable, 'db', 'optica.db'),
            path.join(ejecutable, 'resources', 'app', 'db', 'optica.db'),
            path.join(ejecutable, 'resources', 'app.asar.unpacked', 'db', 'optica.db'),
            path.join(recursos, 'app', 'db', 'optica.db'),
            path.join(recursos, 'app.asar.unpacked', 'db', 'optica.db'),
            path.join(recursos, 'db', 'optica.db')
        );
    } catch {
        // `app` todavía no está listo (por ejemplo en pruebas).
    }

    return [...new Set(candidatos.map((ruta) => path.resolve(ruta)))];
}

// Busca la base de datos más grande de las versiones anteriores. Si hay varias,
// la más grande suele ser la que tiene el historial real de pacientes.
function buscarBaseLegada() {
    const encontradas = getLegacyDbPaths()
        .filter((ruta) => {
            try {
                return fs.statSync(ruta).size > 0;
            } catch {
                return false;
            }
        })
        .map((ruta) => ({ ruta, size: fs.statSync(ruta).size }))
        .sort((a, b) => b.size - a.size);

    return encontradas.length ? encontradas[0].ruta : null;
}

// Copia la BD de versiones anteriores la primera vez que se abre la nueva app.
function copyLegacyDatabaseIfNeeded(targetPath) {
    if (fs.existsSync(targetPath)) return null;

    const legacyPath = buscarBaseLegada();
    if (!legacyPath) return null;

    fs.copyFileSync(legacyPath, targetPath);
    console.log(`Base de datos migrada desde ${legacyPath}`);
    return legacyPath;
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

const CABECERA_SQLITE = 'SQLite format 3\u0000';

// Comprueba la cabecera del archivo antes de tocar nada: así no se reemplaza la
// base buena por un archivo cualquiera con extensión .db.
function esBaseSQLite(ruta) {
    const cabecera = Buffer.alloc(16);
    let descriptor = null;
    try {
        descriptor = fs.openSync(ruta, 'r');
        fs.readSync(descriptor, cabecera, 0, 16, 0);
    } catch {
        return false;
    } finally {
        if (descriptor !== null) fs.closeSync(descriptor);
    }
    return cabecera.toString('utf8') === CABECERA_SQLITE;
}

function selloFecha(fecha = new Date()) {
    const dos = (valor) => String(valor).padStart(2, '0');
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}_${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`;
}

async function contarPacientes() {
    try {
        const fila = await get('SELECT COUNT(*) AS total FROM pacientes');
        return fila ? fila.total : 0;
    } catch {
        return 0;
    }
}

// Reemplaza la base de datos en uso por otra (por ejemplo, la del equipo
// antiguo). Antes de cambiar nada guarda una copia de seguridad de la actual y,
// si la nueva no se puede abrir, restaura la anterior.
async function reemplazarBase(origen, { ruta } = {}) {
    const destino = ruta || rutaActual || getDefaultDbPath();

    if (!origen || !fs.existsSync(origen)) {
        throw new Error('No se encontró el archivo seleccionado.');
    }
    if (path.resolve(origen) === path.resolve(destino)) {
        throw new Error('Ese archivo ya es la base de datos que está en uso.');
    }
    if (fs.statSync(origen).size === 0) {
        throw new Error('El archivo está vacío.');
    }
    if (!esBaseSQLite(origen)) {
        throw new Error('El archivo no es una base de datos SQLite válida.');
    }

    await close();

    let respaldo = null;
    if (fs.existsSync(destino)) {
        respaldo = path.join(path.dirname(destino), `optica-antes-de-importar-${selloFecha()}.db`);
        fs.copyFileSync(destino, respaldo);
    }

    try {
        fs.copyFileSync(origen, destino);
        await open(destino);
        await migrar({ run, get, all });

        return {
            ruta: destino,
            respaldo,
            total: await contarPacientes()
        };
    } catch (error) {
        await close();
        if (respaldo) fs.copyFileSync(respaldo, destino);
        await open(destino);
        throw error;
    }
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
    reemplazarBase,
    contarPacientes,
    esBaseSQLite,
    getUserDbPath,
    getDefaultDbPath,
    getLegacyDbPaths,
    buscarBaseLegada,
    get rutaActual() {
        return rutaActual;
    }
};
