const { test } = require('node:test');
const assert = require('node:assert/strict');

const { opcionesImpresion } = require('../js/impresion');

test('imprime en media carta horizontal y en silencio', () => {
    const opciones = opcionesImpresion();

    assert.equal(opciones.silent, true);
    assert.equal(opciones.printBackground, true);
    assert.equal(opciones.scaleFactor, 100);
    assert.deepEqual(opciones.margins, { marginType: 'none' });
    assert.deepEqual(opciones.pageSize, { width: 215900, height: 139700 });
    assert.ok(!('deviceName' in opciones), 'sin impresora forzada usa la predeterminada');
});

test('permite forzar una impresora y el diálogo del sistema', () => {
    const opciones = opcionesImpresion({ silencioso: false, impresora: 'Impresora de prueba' });

    assert.equal(opciones.silent, false);
    assert.equal(opciones.deviceName, 'Impresora de prueba');
});
