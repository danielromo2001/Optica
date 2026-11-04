const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const { migrar } = require('../js/migraciones');
const { calcularEdad } = require('../js/fechas');

let carpeta;
let conexion;
let adaptador;

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

before(async () => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'optica-migraciones-fechas-'));
    conexion = new sqlite3.Database(path.join(carpeta, 'antigua.db'));
    adaptador = { run: ejecutar, get: traer, all: traerTodos };

    await ejecutar(`CREATE TABLE pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT, entidad TEXT, nombre TEXT, documento TEXT NOT NULL,
        edad INTEGER, telefono TEXT, od TEXT, oi TEXT, adicion TEXT,
        avcc_od TEXT, avcc_oi TEXT, dp TEXT, altura TEXT, tipo TEXT,
        filtro TEXT, uso TEXT, control TEXT, observaciones TEXT,
        distanciaNasopupilarOD TEXT, distanciaNasopupilarOI TEXT
    )`);

    await ejecutar(
        "INSERT INTO pacientes (documento, nombre, fecha, edad) VALUES ('700', 'Segun edad es nacimiento', '1990-06-15', ?)",
        [calcularEdad('1990-06-15')]
    );
    await ejecutar(
        "INSERT INTO pacientes (documento, nombre, fecha, edad) VALUES ('800', 'Fecha de consulta', '2025-03-27', 23)"
    );
});

after(() => new Promise((resolve) => {
    conexion.close(() => {
        fs.rmSync(carpeta, { recursive: true, force: true });
        resolve();
    });
}));

test('distingue si la fecha antigua era de nacimiento o de consulta', async () => {
    await migrar(adaptador);

    const nacimiento = await traer(
        'SELECT fecha, fechaNacimiento, fechaConsulta FROM pacientes WHERE documento = ?',
        ['700']
    );
    assert.equal(nacimiento.fecha, '1990-06-15');
    assert.equal(nacimiento.fechaNacimiento, '1990-06-15');
    assert.equal(nacimiento.fechaConsulta, null);

    const consulta = await traer(
        'SELECT fecha, fechaNacimiento, fechaConsulta FROM pacientes WHERE documento = ?',
        ['800']
    );
    assert.equal(consulta.fecha, '2025-03-27');
    assert.equal(consulta.fechaNacimiento, null);
    assert.equal(consulta.fechaConsulta, '2025-03-27');
});

test('volver a migrar no cambia la clasificación', async () => {
    await migrar(adaptador);

    const nacimiento = await traer(
        'SELECT fechaNacimiento, fechaConsulta FROM pacientes WHERE documento = ?',
        ['700']
    );
    assert.equal(nacimiento.fechaNacimiento, '1990-06-15');
    assert.equal(nacimiento.fechaConsulta, null);

    const consulta = await traer(
        'SELECT fechaNacimiento, fechaConsulta FROM pacientes WHERE documento = ?',
        ['800']
    );
    assert.equal(consulta.fechaNacimiento, null);
    assert.equal(consulta.fechaConsulta, '2025-03-27');
});
