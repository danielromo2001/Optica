const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarPaciente } = require('../js/validacion');

const base = (extra = {}) => ({
    fechaConsulta: '2026-01-15',
    entidad: 'Particular',
    nombre: 'Ana Pérez',
    documento: '12345678',
    edad: '34',
    telefono: '300 123 4567',
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

test('acepta y normaliza un paciente completo', () => {
    const resultado = validarPaciente(base({ nombre: '  Ana Pérez  ', documento: ' 12345678 ' }));

    assert.equal(resultado.ok, true);
    assert.deepEqual(resultado.errores, []);
    assert.equal(resultado.datos.nombre, 'Ana Pérez');
    assert.equal(resultado.datos.documento, '12345678');
    assert.equal(resultado.datos.edad, 34);
    assert.equal(resultado.datos.entidad, 'Particular');
});

test('exige documento, nombre y fecha de la consulta', () => {
    const resultado = validarPaciente({});

    assert.equal(resultado.ok, false);
    assert.ok(resultado.errores.some((error) => error.includes('documento')));
    assert.ok(resultado.errores.some((error) => error.includes('nombre')));
    assert.ok(resultado.errores.some((error) => error.includes('fecha de la consulta')));
});

test('acepta la columna "fecha" de versiones anteriores como fecha de la consulta', () => {
    const resultado = validarPaciente(base({ fechaConsulta: undefined, fecha: '2026-01-15' }));

    assert.equal(resultado.ok, true);
    assert.equal(resultado.datos.fechaConsulta, '2026-01-15');
    assert.equal(resultado.datos.fecha, '2026-01-15');
});

test('calcula la edad con la fecha de nacimiento y la de la consulta', () => {
    const cumple = validarPaciente(base({ fechaNacimiento: '1992-01-10', edad: '99' }));
    assert.equal(cumple.ok, true);
    assert.equal(cumple.datos.edad, 34);

    const antesDelCumple = validarPaciente(base({ fechaNacimiento: '1992-01-16', edad: '99' }));
    assert.equal(antesDelCumple.ok, true);
    assert.equal(antesDelCumple.datos.edad, 33);

    const mismoDia = validarPaciente(base({ fechaNacimiento: '2026-01-15', edad: '' }));
    assert.equal(mismoDia.ok, true);
    assert.equal(mismoDia.datos.edad, 0);
});

test('rechaza fechas de nacimiento inválidas o posteriores a la consulta', () => {
    assert.equal(validarPaciente(base({ fechaNacimiento: '2026-02-30' })).ok, false);
    assert.equal(validarPaciente(base({ fechaNacimiento: '2026-01-16' })).ok, false);

    const futuro = validarPaciente(base({ fechaNacimiento: '2026-01-16' }));
    assert.ok(futuro.errores.some((error) => error.includes('posterior')));
});

test('permite conservar la edad de registros sin fecha de nacimiento', () => {
    const resultado = validarPaciente(base({ fechaNacimiento: '', edad: '80' }));

    assert.equal(resultado.ok, true);
    assert.equal(resultado.datos.edad, 80);
});

test('rechaza documentos demasiado cortos o con caracteres raros', () => {
    assert.equal(validarPaciente(base({ documento: '12' })).ok, false);
    assert.equal(validarPaciente(base({ documento: '12 34' })).ok, false);
    assert.equal(validarPaciente(base({ documento: 'a'.repeat(31) })).ok, false);
    assert.equal(validarPaciente(base({ documento: 'ABC-123.4' })).ok, true);
});

test('rechaza fechas de consulta imposibles y fuera de rango', () => {
    assert.equal(validarPaciente(base({ fechaConsulta: '2026-02-30' })).ok, false);
    assert.equal(validarPaciente(base({ fechaConsulta: '2026-13-01' })).ok, false);
    assert.equal(validarPaciente(base({ fechaConsulta: '1899-12-31' })).ok, false);
    assert.equal(validarPaciente(base({ fechaConsulta: '15/01/2026' })).ok, false);
    assert.equal(validarPaciente(base({ fechaConsulta: '2026-02-28' })).ok, true);
    assert.equal(validarPaciente(base({ fechaConsulta: '2024-02-29' })).ok, true);
});

test('valida la edad y la deja nula si está vacía', () => {
    assert.equal(validarPaciente(base({ edad: '' })).datos.edad, null);
    assert.equal(validarPaciente(base({ edad: '0' })).datos.edad, 0);
    assert.equal(validarPaciente(base({ edad: '120' })).datos.edad, 120);
    assert.equal(validarPaciente(base({ edad: '121' })).ok, false);
    assert.equal(validarPaciente(base({ edad: '34.5' })).ok, false);
    assert.equal(validarPaciente(base({ edad: 'treinta' })).ok, false);
});

test('valida el teléfono sin obligarlo', () => {
    assert.equal(validarPaciente(base({ telefono: '' })).ok, true);
    assert.equal(validarPaciente(base({ telefono: '+57 (300) 123-4567' })).ok, true);
    assert.equal(validarPaciente(base({ telefono: 'llamar al 300' })).ok, false);
    assert.equal(validarPaciente(base({ telefono: '123' })).ok, false);
});

test('la entidad es Particular por defecto y tiene límite', () => {
    assert.equal(validarPaciente(base({ entidad: '' })).datos.entidad, 'Particular');
    assert.equal(validarPaciente(base({ entidad: 'x'.repeat(41) })).ok, false);
});

test('limita los campos cortos y las observaciones', () => {
    const campoLargo = validarPaciente(base({ od: 'x'.repeat(41) }));
    assert.equal(campoLargo.ok, false);
    assert.ok(campoLargo.errores.some((error) => error.includes('od')));

    assert.equal(validarPaciente(base({ observaciones: 'x'.repeat(1001) })).ok, false);
    assert.equal(validarPaciente(base({ observaciones: 'x'.repeat(1000) })).ok, true);
});

test('tolera valores nulos y undefined', () => {
    const resultado = validarPaciente(base({ telefono: null, od: undefined, observaciones: null }));

    assert.equal(resultado.ok, true);
    assert.equal(resultado.datos.telefono, '');
    assert.equal(resultado.datos.od, '');
    assert.equal(resultado.datos.observaciones, '');
});
