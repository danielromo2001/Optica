const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const db = require('../js/db');
const pacientes = require('../js/pacientes');

let carpeta;

const paciente = (extra = {}) => ({
    fecha: '2026-01-15',
    entidad: 'Particular',
    nombre: 'Ana Pérez',
    documento: '12345678',
    edad: '34',
    telefono: '3001234567',
    od: '-1.25',
    oi: '-1.50',
    adicion: '+2.00',
    avcc_od: '1.0',
    avcc_oi: '0.9',
    dp: '62',
    altura: '40',
    tipo: 'Monofocal',
    filtro: 'Antirreflejo',
    uso: 'Lejos',
    control: '6 meses',
    observaciones: 'Sin novedad',
    distanciaNasopupilarOD: '30',
    distanciaNasopupilarOI: '31',
    ...extra
});

before(async () => {
    carpeta = fs.mkdtempSync(path.join(os.tmpdir(), 'optica-pacientes-'));
    await db.init({ ruta: path.join(carpeta, 'pruebas.db') });
});

after(async () => {
    await db.close();
    fs.rmSync(carpeta, { recursive: true, force: true });
});

test('guarda y recupera un paciente', async () => {
    await pacientes.guardar(paciente());

    assert.equal(await pacientes.existe('12345678'), true);
    assert.equal(await pacientes.existe('00000000'), false);

    const fila = await pacientes.buscar('12345678');
    assert.equal(fila.nombre, 'Ana Pérez');
    assert.equal(fila.edad, 34);
    assert.equal(fila.altura, '40');
});

test('el documento es único: guardar de nuevo actualiza en vez de duplicar', async () => {
    await pacientes.guardar(paciente({ telefono: '3100000000', altura: '42' }));

    const fila = await pacientes.buscar('12345678');
    assert.equal(fila.telefono, '3100000000');
    assert.equal(fila.altura, '42');

    const total = await db.get('SELECT COUNT(*) AS total FROM pacientes WHERE documento = ?', ['12345678']);
    assert.equal(total.total, 1);
});

test('rechaza datos inválidos con un error marcado como validación', async () => {
    await assert.rejects(
        () => pacientes.guardar(paciente({ documento: '12', nombre: '' })),
        (error) => {
            assert.equal(error.validacion, true);
            assert.match(error.message, /documento/i);
            assert.match(error.message, /nombre/i);
            return true;
        }
    );
});

test('actualizar exige que el paciente exista', async () => {
    await assert.rejects(
        () => pacientes.actualizar(paciente({ documento: '99999999' })),
        /No existe un paciente/
    );
});

test('eliminar borra el registro y falla la segunda vez', async () => {
    await pacientes.guardar(paciente({ documento: '87654321', nombre: 'Carlos Ruiz' }));

    const resultado = await pacientes.eliminar('87654321');
    assert.equal(resultado.changes, 1);
    assert.equal(await pacientes.buscar('87654321'), null);

    await assert.rejects(() => pacientes.eliminar('87654321'), /No existe un paciente/);
});

test('listar busca por nombre o documento y ordena por fecha descendente', async () => {
    await pacientes.guardar(paciente({ documento: '11111111', nombre: 'Beatriz Gil', fecha: '2026-03-01' }));
    await pacientes.guardar(paciente({ documento: '22222222', nombre: 'Andrés Mora', fecha: '2026-02-01' }));

    const todas = await pacientes.listar();
    assert.ok(todas.length >= 3);
    const fechas = todas.map((fila) => fila.fecha);
    assert.deepEqual(fechas, [...fechas].sort().reverse());

    const porNombre = await pacientes.listar({ texto: 'andrés' });
    assert.equal(porNombre.length, 1);
    assert.equal(porNombre[0].documento, '22222222');

    const porDocumento = await pacientes.listar({ texto: '11111111' });
    assert.equal(porDocumento.length, 1);
    assert.equal(porDocumento[0].nombre, 'Beatriz Gil');
});

test('listar filtra por rango de fechas', async () => {
    const filas = await pacientes.listar({ desde: '2026-02-15', hasta: '2026-03-15' });

    assert.equal(filas.length, 1);
    assert.equal(filas[0].documento, '11111111');
});

test('listar escapa los comodines de LIKE', async () => {
    await pacientes.guardar(paciente({ documento: '33333333', nombre: 'Cien por ciento 100%' }));
    await pacientes.guardar(paciente({ documento: '44444444', nombre: 'Sin comodines' }));

    const filas = await pacientes.listar({ texto: '%' });
    assert.equal(filas.length, 1);
    assert.equal(filas[0].documento, '33333333');
});

test('listar devuelve los campos que usa la tabla', async () => {
    const [fila] = await pacientes.listar({ texto: '12345678' });

    assert.deepEqual(Object.keys(fila).sort(), [
        'altura', 'documento', 'edad', 'fecha', 'id', 'nombre', 'telefono'
    ].sort());
});
