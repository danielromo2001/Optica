const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
    construirHTML,
    TAMANO_MEDIA_CARTA,
    DISENOS,
    DISENO_POR_DEFECTO,
    fechaLarga
} = require('../js/formula');

const PACIENTE = {
    fecha: '2026-11-03',
    nombre: 'Ana Pérez',
    documento: '1000474497',
    edad: '34',
    telefono: '3001234567',
    entidad: 'Particular',
    od: '0.50',
    oi: '-0.75',
    adicion: '+1.50',
    avcc_od: '1.0',
    avcc_oi: '0.9',
    dp: '62',
    altura: '40',
    tipo: 'Monofocal',
    filtro: 'Antirreflejo',
    uso: 'Lejos',
    control: '2027-05-03',
    observaciones: 'Sin novedad.'
};

test('media carta horizontal son 8,5 x 5,5 pulgadas en micras', () => {
    assert.deepEqual(TAMANO_MEDIA_CARTA, { width: 215900, height: 139700 });
});

test('la plantilla fija el tamaño media carta horizontal', () => {
    const html = construirHTML(PACIENTE);

    assert.ok(html.includes('@page { size: 215.9mm 139.7mm; margin: 0; }'));
    assert.ok(html.includes('width: 215.9mm'));
    assert.ok(html.includes('height: 139.7mm'));
});

test('reparte las mediciones en dos tablas para aprovechar el ancho', () => {
    const html = construirHTML(PACIENTE);

    assert.ok(html.includes('<caption>Refracción</caption>'));
    assert.ok(html.includes('<caption>Lentes</caption>'));
    assert.equal((html.match(/<table class="rx">/g) || []).length, 2);
});

test('incluye los datos y las mediciones del paciente', () => {
    const html = construirHTML(PACIENTE);

    assert.ok(html.includes('Ana Pérez'));
    assert.ok(html.includes('1000474497'));
    assert.ok(html.includes('0.50'));
    assert.ok(html.includes('-0.75'));
    assert.ok(html.includes('+1.50'));
    assert.ok(html.includes('Sin novedad.'));
});

test('escapa el texto para que no rompa el HTML', () => {
    const html = construirHTML({
        nombre: '<script>alert(1)</script>',
        documento: 'A&B "42"',
        observaciones: "No usar <b>ni</b> 'comillas'"
    });

    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('A&amp;B &quot;42&quot;'));
    assert.ok(html.includes('No usar &lt;b&gt;ni&lt;/b&gt; &#39;comillas&#39;'));
});

test('los campos vacíos dejan un guion para escribir a mano', () => {
    const html = construirHTML({ nombre: 'Solo nombre' });

    assert.ok(html.includes('<td>—</td>'));
});

test('genera las dos variantes de diseño', () => {
    assert.deepEqual(DISENOS, ['clasica', 'moderna']);

    for (const diseno of DISENOS) {
        const html = construirHTML(PACIENTE, { diseno });
        assert.ok(html.includes(`hoja--${diseno}`), `falta la hoja ${diseno}`);
        assert.ok(html.includes('FÓRMULA ÓPTICA'));
    }

    const clasica = construirHTML(PACIENTE, { diseno: 'clasica' });
    const moderna = construirHTML(PACIENTE, { diseno: 'moderna' });
    assert.notEqual(clasica, moderna);
    assert.ok(moderna.includes('background: #1770D5'));
});

test('un diseño desconocido usa el de por defecto', () => {
    const html = construirHTML(PACIENTE, { diseno: 'no-existe' });

    assert.ok(html.includes(`hoja--${DISENO_POR_DEFECTO}`));
});

test('fechaLarga convierte la fecha ISO a texto', () => {
    assert.equal(fechaLarga('2026-11-03'), '3 de noviembre de 2026');
    assert.equal(fechaLarga('sin-fecha'), 'sin-fecha');
});
