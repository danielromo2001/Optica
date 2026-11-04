const { test } = require('node:test');
const assert = require('node:assert/strict');

const { calcularEdad } = require('../js/fechas');

test('calcula la edad cumplida en la fecha de referencia', () => {
    assert.equal(calcularEdad('1992-05-10', '2026-05-10'), 34);
    assert.equal(calcularEdad('1992-05-10', '2026-05-09'), 33);
    assert.equal(calcularEdad('2000-02-29', '2026-02-28'), 25);
    assert.equal(calcularEdad('2000-02-29', '2026-03-01'), 26);
    assert.equal(calcularEdad('2026-01-15', '2026-01-15'), 0);
});

test('devuelve null con fechas inválidas o posteriores a la referencia', () => {
    assert.equal(calcularEdad('', '2026-01-15'), null);
    assert.equal(calcularEdad('2026-02-30', '2026-03-01'), null);
    assert.equal(calcularEdad('2026-02-01', '2026-01-15'), null);
    assert.equal(calcularEdad('1990-01-01', 'sin-fecha'), null);
});

test('sin fecha de referencia usa la fecha actual', () => {
    const hoy = new Date();
    const dos = (valor) => String(valor).padStart(2, '0');
    const referencia = `${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}`;

    assert.equal(calcularEdad(referencia), 0);
    assert.equal(calcularEdad('2000-01-01'), hoy.getFullYear() - 2000);
});
