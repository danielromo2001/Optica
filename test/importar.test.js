const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const db = require('../js/db');
const pacientes = require('../js/pacientes');

let carpeta;
let rutaActual;
let rutaLegada;
let rutaTexto;

// Esquema anterior: columna "color" en vez de "altura" y sin índice UNIQUE.
const ESQUEMA_ANTIGUO = `CREATE TABLE pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT, entidad TEXT, nombre TEXT, documento TEXT NOT NULL,
    edad INTEGER, telefono TEXT, od TEXT, oi TEXT, adicion TEXT,
    avcc_od TEXT, avcc_oi TEXT, dp TEXT, color TEXT, tipo TEXT,
    filtro TEXT, uso TEXT, control TEXT, observaciones TEXT,
    distanciaNasopupilarOD TEXT, distanciaNasopupilarOI TEXT
)`;

function abrir(ruta) {
    return new sqlite3.Database(ruta);
}

function ejecutar(conexion, sql, params = []) {
    return new Promise((resolve, reject) => {
        conexion.run(sql, params, function (error) {
            if (error) reject(error);
            else resolve(this);
        });
    });
}

function consultar(ruta, sql, params = []) {
    return new Promise((resolve, reject) => {
        const conexion = abrir(ruta);
        conexion.get(sql, params, (error, fila) => {
            conexion.close();
            if (error) reject(error);
            else resolve(fila);
        });
    });
}

before(async () => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'optica-importar-'));
    rutaActual = path.join(carpeta, 'actual.db');
    await db.init({ ruta: rutaActual });
    await pacientes.guardar({
        fecha: '2026-01-15',
        nombre: 'Paciente actual',
        documento: '999'
    });

    rutaLegada = path.join(carpeta, 'vieja.db');
    const conexion = abrir(rutaLegada);
    await ejecutar(conexion, ESQUEMA_ANTIGUO);
    await ejecutar(
        conexion,
        "INSERT INTO pacientes (documento, nombre, color) VALUES ('100', 'Registro viejo', '38')"
    );
    await ejecutar(
        conexion,
        "INSERT INTO pacientes (documento, nombre, color) VALUES ('100', 'Registro nuevo', '42')"
    );
    await ejecutar(
        conexion,
        "INSERT INTO pacientes (documento, nombre, color) VALUES ('200', 'Sin color', NULL)"
    );
    await new Promise((resolve) => conexion.close(resolve));

    rutaTexto = path.join(carpeta, 'no-es-base.txt');
    fs.writeFileSync(rutaTexto, 'esto no es sqlite');
});

after(async () => {
    await db.close();
    fs.rmSync(carpeta, { recursive: true, force: true });
});

test('esBaseSQLite distingue una base real de otro archivo', () => {
    assert.equal(db.esBaseSQLite(rutaLegada), true);
    assert.equal(db.esBaseSQLite(rutaTexto), false);
    assert.equal(db.esBaseSQLite(path.join(carpeta, 'no-existe.db')), false);
});

test('rechaza un archivo que no existe', async () => {
    await assert.rejects(
        () => db.reemplazarBase(path.join(carpeta, 'no-existe.db')),
        /No se encontró/
    );
});

test('rechaza un archivo vacío', async () => {
    const vacia = path.join(carpeta, 'vacia.db');
    fs.writeFileSync(vacia, '');

    await assert.rejects(() => db.reemplazarBase(vacia), /está vacío/);
});

test('rechaza un archivo que no es SQLite', async () => {
    await assert.rejects(
        () => db.reemplazarBase(rutaTexto),
        /no es una base de datos SQLite/
    );
});

test('rechaza la base de datos que ya está en uso', async () => {
    await assert.rejects(
        () => db.reemplazarBase(rutaActual),
        /ya es la base de datos que está en uso/
    );
});

test('importa la base antigua, migra color a altura y guarda un respaldo', async () => {
    const resultado = await db.reemplazarBase(rutaLegada);

    assert.equal(resultado.ruta, rutaActual);
    assert.equal(resultado.total, 2);
    assert.ok(resultado.respaldo && fs.existsSync(resultado.respaldo));

    // La base anterior quedó a salvo en el respaldo.
    const anterior = await consultar(
        resultado.respaldo,
        'SELECT nombre FROM pacientes WHERE documento = ?',
        ['999']
    );
    assert.equal(anterior.nombre, 'Paciente actual');

    // La base en uso es ahora la importada, con el esquema nuevo.
    const columnas = await db.all('PRAGMA table_info(pacientes)');
    assert.ok(columnas.some((columna) => columna.name === 'altura'));

    const reciente = await db.get(
        'SELECT nombre, altura FROM pacientes WHERE documento = ?',
        ['100']
    );
    assert.equal(reciente.nombre, 'Registro nuevo');
    assert.equal(reciente.altura, '42');

    assert.equal(await db.contarPacientes(), 2);
});
