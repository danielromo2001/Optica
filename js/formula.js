const path = require('path');
const fs = require('fs');

// Media carta: 5,5 x 8,5 pulgadas (139,7 x 215,9 mm). Electron trabaja en micras.
const TAMANO_MEDIA_CARTA = { width: 139700, height: 215900 };

const EMPRESA = {
    nombre: 'FASHION VISION E Y C ÓPTICA, C.A.',
    direccion: 'Calle 14 No. 11-26 · Barrio Delicias (Centro)',
    ciudad: 'Villanueva, La Guajira',
    telefonos: '317 537 3586 · 311 455 1504',
    instagram: '@optica_eyc · @elena_escudero_optica'
};

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const FILAS = [
    { etiqueta: 'RX', od: 'od', oi: 'oi' },
    { etiqueta: 'ADD', unico: 'adicion' },
    { etiqueta: 'AVCC', od: 'avcc_od', oi: 'avcc_oi' },
    { etiqueta: 'Distancia nasopupilar', od: 'distanciaNasopupilarOD', oi: 'distanciaNasopupilarOI' },
    { etiqueta: 'D. pupilar', unico: 'dp' },
    { etiqueta: 'Altura', unico: 'altura' },
    { etiqueta: 'Tipo', unico: 'tipo' },
    { etiqueta: 'Filtro', unico: 'filtro' },
    { etiqueta: 'Uso', unico: 'uso' },
    { etiqueta: 'Control', unico: 'control' }
];

// Los textos vienen de la base de datos y se insertan en HTML: hay que
// escaparlos para que un nombre con "<" no rompa la plantilla.
function escapar(valor) {
    return String(valor === null || valor === undefined ? '' : valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function texto(valor) {
    return String(valor === null || valor === undefined ? '' : valor).trim();
}

// En la fórmula lo importante es que el hueco quede visible para escribir a mano.
function dato(valor) {
    const limpio = texto(valor);
    return limpio ? escapar(limpio) : '—';
}

function fechaLarga(fecha) {
    const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(fecha));
    if (!coincide) return texto(fecha);

    const [, anio, mes, dia] = coincide.map(Number);
    const nombreMes = MESES[mes - 1];
    if (!nombreMes) return texto(fecha);

    return `${dia} de ${nombreMes} de ${anio}`;
}

function filaHTML(fila, datos) {
    const etiqueta = `<th scope="row">${escapar(fila.etiqueta)}</th>`;

    if (fila.unico) {
        return `<tr>${etiqueta}<td colspan="2" class="unico">${dato(datos[fila.unico])}</td></tr>`;
    }

    return `<tr>${etiqueta}<td>${dato(datos[fila.od])}</td><td>${dato(datos[fila.oi])}</td></tr>`;
}

function imagenesHTML(imagenes = {}) {
    const imagen = (clave, clase) => imagenes[clave]
        ? `<img class="${clase}" src="${imagenes[clave]}" alt="">`
        : '';
    return {
        logo: imagen('logo', 'logo'),
        whatsapp: imagen('whatsapp', 'icono'),
        instagram: imagen('instagram', 'icono')
    };
}

const CSS_BASE = `
    * { box-sizing: border-box; }
    @page { size: 139.7mm 215.9mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body {
        font-family: "Segoe UI", Arial, Helvetica, sans-serif;
        color: #171919;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .hoja {
        width: 139.7mm;
        min-height: 215.9mm;
        padding: 8mm 9mm;
        display: flex;
        flex-direction: column;
    }
    h1, h2, h3, p { margin: 0; }
    .logo { width: 16mm; height: 16mm; object-fit: contain; }
    .icono { width: 3.4mm; height: 3.4mm; vertical-align: -0.7mm; margin-right: 1mm; }
    .paciente { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1mm 4mm; }
    .dato { display: flex; gap: 1.5mm; font-size: 8.3pt; }
    .dato .et { color: #6b7480; min-width: 13mm; }
    .dato .vl { font-weight: 600; }
    table.rx { width: 100%; border-collapse: collapse; }
    table.rx th, table.rx td { padding: 1.5mm 2mm; font-size: 8.6pt; }
    table.rx td { text-align: center; font-variant-numeric: tabular-nums; }
    table.rx td.unico { text-align: left; padding-left: 3mm; }
    table.rx, .cabecera, .paciente, .pie, .observaciones .caja { break-inside: avoid; page-break-inside: avoid; }
    table.rx tr { break-inside: avoid; page-break-inside: avoid; }
    .observaciones { margin-top: 3.5mm; }
    .observaciones h3 { font-size: 7.8pt; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 1.2mm; }
    .observaciones .caja {
        min-height: 15mm;
        padding: 2mm;
        font-size: 8.4pt;
        white-space: pre-wrap;
    }
    .pie { margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; }
    .firma { width: 52mm; }
    .firma .linea { border-top: 0.3mm solid #4a4f55; margin-bottom: 1mm; }
    .firma span { font-size: 7.2pt; color: #6b7480; }
    .contactos { display: flex; flex-direction: column; gap: 0.8mm; font-size: 7.3pt; color: #4a4f55; text-align: right; }
`;

const CSS_CLASICA = `
    .cabecera { display: flex; align-items: center; gap: 4mm; padding-bottom: 2.5mm; border-bottom: 0.7mm solid #1770D5; }
    .empresa h1 { font-size: 10.2pt; color: #1770D5; letter-spacing: 0.02em; }
    .empresa p { font-size: 7.1pt; color: #4a4f55; margin-top: 0.6mm; }
    .titulo { display: flex; align-items: baseline; justify-content: space-between; margin: 3.5mm 0 2.5mm; }
    .titulo h2 { font-size: 9.6pt; letter-spacing: 0.18em; color: #1770D5; }
    .titulo .fecha { font-size: 7.8pt; color: #4a4f55; }
    .paciente {
        border: 0.3mm solid #c8d3df;
        border-radius: 1.6mm;
        background: #f7fafd;
        padding: 2.6mm 3mm;
    }
    .paciente .nombre { grid-column: 1 / -1; font-size: 11pt; font-weight: 600; }
    table.rx { margin-top: 3.5mm; }
    table.rx th, table.rx td { border: 0.25mm solid #cfd8e3; }
    table.rx thead th {
        background: #1770D5;
        color: #ffffff;
        font-size: 7.8pt;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    table.rx tbody th { width: 44%; text-align: left; background: #eef4fb; color: #26313d; font-weight: 600; }
    table.rx tbody tr:nth-child(even) td { background: #fafcfe; }
    .observaciones h3 { color: #1770D5; }
    .observaciones .caja { border: 0.25mm dashed #b9c6d6; border-radius: 1.2mm; }
    .pie { padding-top: 3mm; border-top: 0.3mm solid #d7dee7; }
`;

const CSS_MODERNA = `
    .hoja { padding: 0; }
    .cabecera {
        background: #1770D5;
        color: #ffffff;
        padding: 7mm 9mm 6mm;
        display: flex;
        align-items: center;
        gap: 4mm;
    }
    .cabecera .logo { width: 15mm; height: 15mm; background: #ffffff; border-radius: 50%; padding: 1.2mm; }
    .empresa h1 { font-size: 10.4pt; color: #ffffff; letter-spacing: 0.02em; }
    .empresa p { font-size: 7pt; color: #dbe9fb; margin-top: 0.6mm; }
    .cuerpo { padding: 6mm 9mm 8mm; display: flex; flex-direction: column; flex: 1; }
    .titulo { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 4mm; }
    .titulo h2 { font-size: 9.4pt; letter-spacing: 0.2em; color: #1770D5; }
    .titulo .fecha { font-size: 7.8pt; color: #6b7480; }
    .paciente { border-bottom: 0.3mm solid #d7dee7; padding-bottom: 3mm; }
    .paciente .nombre { grid-column: 1 / -1; font-size: 13pt; font-weight: 700; margin-bottom: 1.5mm; }
    .dato .et { color: #8a929c; }
    table.rx { margin-top: 4mm; }
    table.rx thead th {
        color: #1770D5;
        font-size: 7.6pt;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        border-bottom: 0.5mm solid #1770D5;
        text-align: left;
    }
    table.rx thead th:not(:first-child) { text-align: center; }
    table.rx tbody th { width: 42%; text-align: left; font-weight: 400; color: #6b7480; border-bottom: 0.2mm solid #e4e9ef; }
    table.rx tbody td { border-bottom: 0.2mm solid #e4e9ef; font-size: 9.2pt; font-weight: 600; }
    table.rx tbody tr:nth-child(even) th,
    table.rx tbody tr:nth-child(even) td { background: #f7fafd; }
    .observaciones h3 { color: #8a929c; }
    .observaciones .caja { border-left: 1mm solid #1770D5; background: #f7fafd; padding: 2mm 3mm; }
    .pie { padding-top: 3mm; }
    .firma .linea { border-top: 0.3mm solid #8a929c; }
`;

const DISENOS = {
    clasica: CSS_CLASICA,
    moderna: CSS_MODERNA
};

const DISENO_POR_DEFECTO = 'clasica';

function cabeceraHTML(imagenes, diseno) {
    if (diseno === 'moderna') {
        return `<header class="cabecera">
            ${imagenes.logo}
            <div class="empresa">
                <h1>${escapar(EMPRESA.nombre)}</h1>
                <p>${escapar(EMPRESA.direccion)}</p>
                <p>${escapar(EMPRESA.ciudad)} · ${escapar(EMPRESA.telefonos)}</p>
            </div>
        </header>`;
    }

    return `<header class="cabecera">
        ${imagenes.logo}
        <div class="empresa">
            <h1>${escapar(EMPRESA.nombre)}</h1>
            <p>${escapar(EMPRESA.direccion)}</p>
            <p>${escapar(EMPRESA.ciudad)}</p>
            <p>${escapar(EMPRESA.telefonos)}</p>
        </div>
    </header>`;
}

function contenidoHTML(datos, imagenes, diseno) {
    const nombre = texto(datos.nombre);
    const filas = FILAS.map((fila) => filaHTML(fila, datos)).join('');
    const observaciones = texto(datos.observaciones);

    const bloque = `<div class="titulo">
            <h2>FÓRMULA ÓPTICA</h2>
            <span class="fecha">${escapar(fechaLarga(datos.fecha))}</span>
        </div>

        <section class="paciente">
            ${nombre ? `<div class="nombre">${escapar(nombre)}</div>` : ''}
            <div class="dato"><span class="et">Documento</span><span class="vl">${dato(datos.documento)}</span></div>
            <div class="dato"><span class="et">Edad</span><span class="vl">${dato(datos.edad)}</span></div>
            <div class="dato"><span class="et">Teléfono</span><span class="vl">${dato(datos.telefono)}</span></div>
            <div class="dato"><span class="et">Entidad</span><span class="vl">${dato(datos.entidad)}</span></div>
        </section>

        <table class="rx">
            <thead>
                <tr><th scope="col">Concepto</th><th scope="col">OD</th><th scope="col">OI</th></tr>
            </thead>
            <tbody>${filas}</tbody>
        </table>

        <section class="observaciones">
            <h3>Observaciones</h3>
            <div class="caja">${observaciones ? escapar(observaciones) : ''}</div>
        </section>

        <footer class="pie">
            <div class="firma">
                <div class="linea"></div>
                <span>Firma y sello</span>
            </div>
            <div class="contactos">
                <span>${imagenes.whatsapp}${escapar(EMPRESA.telefonos)}</span>
                <span>${imagenes.instagram}${escapar(EMPRESA.instagram)}</span>
            </div>
        </footer>`;

    return diseno === 'moderna' ? `<div class="cuerpo">${bloque}</div>` : bloque;
}

// Genera el HTML de la fórmula. Es una función pura: las imágenes llegan ya
// convertidas a data URI, así que se puede probar sin Electron.
function construirHTML(datos = {}, { imagenes = {}, diseno = DISENO_POR_DEFECTO } = {}) {
    const disenoValido = DISENOS[diseno] ? diseno : DISENO_POR_DEFECTO;
    const recursos = imagenesHTML(imagenes);

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Fórmula óptica</title>
    <style>${CSS_BASE}${DISENOS[disenoValido]}</style>
</head>
<body>
    <div class="hoja hoja--${disenoValido}">
        ${cabeceraHTML(recursos, disenoValido)}
        ${contenidoHTML(datos, recursos, disenoValido)}
    </div>
</body>
</html>`;
}

// Convierte una imagen a data URI para poder incrustarla en el HTML. Se usa
// `nativeImage` de Electron, que sí sabe leer dentro del asar empaquetado.
function cargarImagen(nombreArchivo, ancho) {
    const { nativeImage } = require('electron');
    const ruta = path.join(__dirname, '../images', nombreArchivo);
    if (!fs.existsSync(ruta)) return null;

    const imagen = nativeImage.createFromPath(ruta);
    if (imagen.isEmpty()) return null;

    const redimensionada = ancho ? imagen.resize({ width: ancho }) : imagen;
    const buffer = nombreArchivo.endsWith('.png')
        ? redimensionada.toPNG()
        : redimensionada.toJPEG(90);

    const mime = nombreArchivo.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
}

// El logo original es de 2508x2560: se reduce para que el HTML no pese 2 MB.
function cargarImagenes() {
    return {
        logo: cargarImagen('logo.png', 240),
        whatsapp: cargarImagen('whatsapp.png', 64),
        instagram: cargarImagen('instagram.png', 64)
    };
}

module.exports = {
    construirHTML,
    cargarImagenes,
    TAMANO_MEDIA_CARTA,
    DISENO_POR_DEFECTO,
    DISENOS: Object.keys(DISENOS),
    EMPRESA,
    escapar,
    fechaLarga
};
