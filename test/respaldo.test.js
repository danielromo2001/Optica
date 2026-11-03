const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const db = require('../js/db');
const pacientes = require('../js/pacientes');
const { respaldar, nombreRespaldo } = require('../js/respaldo');

let carpeta;
let destino;

const abrirSoloLectura = (ruta) => new sqlite3.Database(ruta, sqlite3.OPEN_READONLY);

const consultar = (ruta, sql, params = []) => new Promise((resolve, reject) => {
    const conexion = abrirSoloLectura(ruta);
    conexion.get(sql, params, (error, fila) => {
        conexion.close();
        if (error) reject(error);
        else resolve(fila);
    });
});

before(async () => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'optica-respaldo-'));
    await db.init({ ruta: path.join(carpeta, 'origen.db') });
    await pacientes.guardar({
        fecha: '2026-01-15',
        nombre: 'Ana Pérez',
        documento: '12345678',
        telefono: '3001234567'
    });
    destino = path.join(carpeta, 'respaldo.db');
});

after(async () => {
    await db.close();
    fs.rmSync(carpeta, { recursive: true, force: true });
});

test('nombreRespaldo genera un nombre ordenable', () => {
    const fecha = new Date(2026, 10, 3, 9, 5);

    assert.equal(nombreRespaldo(fecha), 'optica-respaldo-2026-11-03_0905.db');
});

test('respaldar crea una copia legible de la base de datos', async () => {
    const resultado = await respaldar(db, destino);

    assert.equal(resultado.path, destino);
    assert.ok(resultado.bytes > 0);
    assert.ok(fs.existsSync(destino));

    const fila = await consultar(destino, 'SELECT nombre FROM pacientes WHERE documento = ?', ['12345678']);
    assert.equal(fila.nombre, 'Ana Pérez');
});

test('no sobrescribe un respaldo existente', async () => {
    await assert.rejects(
        () => respaldar(db, destino),
        /Ya existe un archivo/
    );
});

test('exige extensión .db', async () => {
    await assert.rejects(
        () => respaldar(db, path.join(carpeta, 'respaldo.txt')),
        /extensión \.db/
    );
});

test('falla si la carpeta de destino no existe', async () => {
    await assert.rejects(
        () => respaldar(db, path.join(carpeta, 'no-existe', 'respaldo.db')),
        /carpeta de destino no existe/
    );
});

test('falla si no se indica ruta', async () => {
    await assert.rejects(() => respaldar(db, ''), /Falta la ruta/);
});
