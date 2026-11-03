const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const { migrar, SCHEMA_VERSION } = require('../js/migraciones');

let carpeta;
let conexion;

const ejecutar = (sql, params = []) => new Promise((resolve, reject) => {
    conexion.run(sql, params, function (error) {
        if (error) reject(error);
        else resolve(this);
    });
});

const traer = (sql, params = []) => new Promise((resolve, reject) => {
    conexion.get(sql, params, (error, fila) => (error ? reject(error) : resolve(fila)));
});

const traerTodos = (sql, params = []) => new Promise((resolve, reject) => {
    conexion.all(sql, params, (error, filas) => (error ? reject(error) : resolve(filas)));
});

const adaptador = {
    run: ejecutar,
    get: traer,
    all: traerTodos
};

before(async () => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'optica-migraciones-'));
    conexion = new sqlite3.Database(path.join(carpeta, 'antigua.db'));

    // Esquema anterior: columna "color" en vez de "altura" y sin UNIQUE.
    await ejecutar(`CREATE TABLE pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT, entidad TEXT, nombre TEXT, documento TEXT NOT NULL,
        edad INTEGER, telefono TEXT, od TEXT, oi TEXT, adicion TEXT,
        avcc_od TEXT, avcc_oi TEXT, dp TEXT, color TEXT, tipo TEXT,
        filtro TEXT, uso TEXT, control TEXT, observaciones TEXT,
        distanciaNasopupilarOD TEXT, distanciaNasopupilarOI TEXT
    )`);

    await ejecutar("INSERT INTO pacientes (documento, nombre, color) VALUES ('100', 'Registro viejo', '40')");
    await ejecutar("INSERT INTO pacientes (documento, nombre, color) VALUES ('100', 'Registro nuevo', '42')");
    await ejecutar("INSERT INTO pacientes (documento, nombre, color) VALUES ('200', 'Sin color', NULL)");
});

after(() => new Promise((resolve) => {
    conexion.close(() => {
        fs.rmSync(carpeta, { recursive: true, force: true });
        resolve();
    });
}));

test('migra color a altura y conserva el registro más reciente de cada documento', async () => {
    await migrar(adaptador);

    const columnas = await traerTodos('PRAGMA table_info(pacientes)');
    const nombres = columnas.map((columna) => columna.name);
    assert.ok(nombres.includes('altura'));

    const filas = await traerTodos('SELECT documento, nombre, altura FROM pacientes ORDER BY documento');
    assert.equal(filas.length, 2);
    assert.equal(filas[0].documento, '100');
    assert.equal(filas[0].nombre, 'Registro nuevo');
    assert.equal(filas[0].altura, '42');
    assert.equal(filas[1].documento, '200');
    assert.equal(filas[1].altura, null);
});

test('crea el índice único y la versión de esquema', async () => {
    const indices = await traerTodos('PRAGMA index_list(pacientes)');
    const unico = indices.find((indice) => indice.name === 'idx_pacientes_documento');
    assert.ok(unico);
    assert.equal(unico.unique, 1);

    const version = await traer('PRAGMA user_version');
    assert.equal(version.user_version, SCHEMA_VERSION);
});

test('el índice único impide documentos duplicados', async () => {
    await assert.rejects(
        () => ejecutar("INSERT INTO pacientes (documento, nombre) VALUES ('100', 'Duplicado')"),
        /UNIQUE|constraint/i
    );
});

test('migrar es idempotente', async () => {
    await migrar(adaptador);

    const total = await traer('SELECT COUNT(*) AS total FROM pacientes');
    assert.equal(total.total, 2);

    const version = await traer('PRAGMA user_version');
    assert.equal(version.user_version, SCHEMA_VERSION);
});
