const path = require('path');
const fs = require('fs');

// Media carta horizontal: 8,5 x 5,5 pulgadas (215,9 x 139,7 mm).
// Electron trabaja en micras.
const TAMANO_MEDIA_CARTA = { width: 215900, height: 139700 };

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

// La fórmula se reparte en dos tablas para aprovechar el ancho del papel:
// a la izquierda la refracción y a la derecha las características de la lente.
const FILAS = [
    { etiqueta: 'RX', od: 'od', oi: 'oi', grupo: 'refraccion' },
    { etiqueta: 'ADD', unico: 'adicion', grupo: 'refraccion' },
    { etiqueta: 'AVCC', od: 'avcc_od', oi: 'avcc_oi', grupo: 'refraccion' },
    { etiqueta: 'Distancia nasopupilar', od: 'distanciaNasopupilarOD', oi: 'distanciaNasopupilarOI', grupo: 'refraccion' },
    { etiqueta: 'D. pupilar', unico: 'dp', grupo: 'refraccion' },
    { etiqueta: 'Altura', unico: 'altura', grupo: 'lentes' },
    { etiqueta: 'Tipo', unico: 'tipo', grupo: 'lentes' },
    { etiqueta: 'Filtro', unico: 'filtro', grupo: 'lentes' },
    { etiqueta: 'Uso', unico: 'uso', grupo: 'lentes' },
    { etiqueta: 'Control', unico: 'control', grupo: 'lentes' }
];

const GRUPOS = [
    { clave: 'refraccion', titulo: 'Refracción' },
    { clave: 'lentes', titulo: 'Lentes' }
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

function tablaHTML(grupo, datos) {
    const filas = FILAS
        .filter((fila) => fila.grupo === grupo.clave)
        .map((fila) => filaHTML(fila, datos))
        .join('');

    return `<table class="rx">
        <caption>${escapar(grupo.titulo)}</caption>
        <thead>
            <tr><th scope="col">Concepto</th><th scope="col">OD</th><th scope="col">OI</th></tr>
        </thead>
        <tbody>${filas}</tbody>
    </table>`;
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
    @page { size: 215.9mm 139.7mm; margin: 0; }
    html, body { margin: 0; padding: 0; background: #ffffff; }
    body {
        font-family: "Segoe UI", Arial, Helvetica, sans-serif;
        color: #171919;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .hoja {
        width: 215.9mm;
        min-height: 139.7mm;
        display: flex;
        flex-direction: column;
    }
    h1, h2, h3, p { margin: 0; }
    .logo { width: 12mm; height: 12mm; object-fit: contain; }
    .icono { width: 3mm; height: 3mm; vertical-align: -0.6mm; margin-right: 0.8mm; }
    .cabecera {
        display: flex;
        align-items: center;
        gap: 3.5mm;
        padding: 6mm 8mm 2.6mm;
    }
    .empresa { flex: 1; min-width: 0; }
    .empresa h1 { font-size: 9.8pt; letter-spacing: 0.02em; }
    .empresa p { font-size: 6.9pt; margin-top: 0.35mm; }
    .titulo { text-align: right; white-space: nowrap; }
    .titulo h2 { font-size: 9pt; letter-spacing: 0.16em; }
    .titulo .fecha { display: block; font-size: 7.3pt; margin-top: 0.8mm; }
    .contenido {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 0 8mm 5mm;
    }
    .paciente {
        margin-top: 3mm;
        display: grid;
        grid-template-columns: 1.65fr 1fr 0.55fr 1fr 1.1fr;
        gap: 1.5mm 4mm;
        align-items: end;
    }
    .paciente .nombre { font-size: 11.5pt; font-weight: 700; line-height: 1.15; overflow-wrap: anywhere; }
    .dato { display: flex; flex-direction: column; gap: 0.2mm; min-width: 0; }
    .dato .et { color: #6b7480; font-size: 6.6pt; text-transform: uppercase; letter-spacing: 0.06em; }
    .dato .vl { font-size: 8.4pt; font-weight: 600; overflow-wrap: anywhere; }
    .medidas { display: grid; grid-template-columns: 1fr 1fr; gap: 0 6mm; margin-top: 3mm; }
    table.rx { width: 100%; border-collapse: collapse; }
    table.rx caption {
        caption-side: top;
        text-align: left;
        padding-bottom: 0.8mm;
        font-size: 6.8pt;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
    }
    table.rx th, table.rx td { padding: 1.35mm 2mm; font-size: 8.5pt; }
    table.rx td { text-align: center; font-variant-numeric: tabular-nums; }
    table.rx td.unico { text-align: left; padding-left: 2.6mm; }
    table.rx, .cabecera, .paciente, .pie { break-inside: avoid; page-break-inside: avoid; }
    table.rx tr { break-inside: avoid; page-break-inside: avoid; }
    .observaciones { margin-top: 3mm; }
    .observaciones h3 { font-size: 7pt; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.8mm; }
    .observaciones .caja {
        min-height: 24mm;
        padding: 2mm 2.4mm;
        font-size: 8.2pt;
        white-space: pre-wrap;
    }
    .pie { margin-top: auto; padding-top: 2.6mm; display: flex; align-items: flex-end; justify-content: space-between; gap: 6mm; }
    .firma { width: 56mm; }
    .firma .linea { border-top: 0.3mm solid #4a4f55; margin-bottom: 0.8mm; }
    .firma span { font-size: 6.8pt; color: #6b7480; }
    .contactos { display: flex; flex-direction: column; gap: 0.6mm; font-size: 6.9pt; color: #4a4f55; text-align: right; }
`;

const CSS_CLASICA = `
    .cabecera { border-bottom: 0.7mm solid #1770D5; }
    .empresa h1 { color: #1770D5; }
    .empresa p { color: #4a4f55; }
    .titulo h2 { color: #1770D5; }
    .titulo .fecha { color: #4a4f55; }
    .paciente {
        border: 0.3mm solid #c8d3df;
        border-radius: 1.4mm;
        background: #f7fafd;
        padding: 1.8mm 2.6mm;
    }
    table.rx caption { color: #1770D5; }
    table.rx th, table.rx td { border: 0.25mm solid #cfd8e3; }
    table.rx thead th {
        background: #1770D5;
        color: #ffffff;
        font-size: 7.3pt;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    table.rx tbody th { width: 46%; text-align: left; background: #eef4fb; color: #26313d; font-weight: 600; }
    table.rx tbody tr:nth-child(even) td { background: #fafcfe; }
    .observaciones h3 { color: #1770D5; }
    .observaciones .caja { border: 0.25mm dashed #b9c6d6; border-radius: 1.2mm; }
    .pie { border-top: 0.3mm solid #d7dee7; }
`;

const CSS_MODERNA = `
    .cabecera {
        background: #1770D5;
        color: #ffffff;
        padding: 4.5mm 8mm;
    }
    .cabecera .logo { width: 12mm; height: 12mm; background: #ffffff; border-radius: 50%; padding: 1mm; }
    .empresa h1 { color: #ffffff; }
    .empresa p { color: #dbe9fb; }
    .titulo h2 { color: #ffffff; }
    .titulo .fecha { color: #dbe9fb; }
    .contenido { padding: 3.5mm 8mm 5mm; }
    .paciente { border-bottom: 0.3mm solid #d7dee7; padding-bottom: 2mm; margin-top: 2mm; }
    .dato .et { color: #8a929c; }
    table.rx caption { color: #8a929c; }
    table.rx thead th {
        color: #1770D5;
        font-size: 7.2pt;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        border-bottom: 0.5mm solid #1770D5;
        text-align: left;
    }
    table.rx thead th:not(:first-child) { text-align: center; }
    table.rx tbody th { width: 46%; text-align: left; font-weight: 400; color: #6b7480; border-bottom: 0.2mm solid #e4e9ef; }
    table.rx tbody td { border-bottom: 0.2mm solid #e4e9ef; font-size: 8.8pt; font-weight: 600; }
    table.rx tbody tr:nth-child(even) th,
    table.rx tbody tr:nth-child(even) td { background: #f7fafd; }
    .observaciones h3 { color: #8a929c; }
    .observaciones .caja { border-left: 1mm solid #1770D5; background: #f7fafd; padding: 1.8mm 2.6mm; }
    .firma .linea { border-top: 0.3mm solid #8a929c; }
`;

const DISENOS = {
    clasica: CSS_CLASICA,
    moderna: CSS_MODERNA
};

const DISENO_POR_DEFECTO = 'clasica';

function cabeceraHTML(imagenes, fecha) {
    return `<header class="cabecera">
        ${imagenes.logo}
        <div class="empresa">
            <h1>${escapar(EMPRESA.nombre)}</h1>
            <p>${escapar(EMPRESA.direccion)}</p>
            <p>${escapar(EMPRESA.ciudad)} · ${escapar(EMPRESA.telefonos)}</p>
        </div>
        <div class="titulo">
            <h2>FÓRMULA ÓPTICA</h2>
            <span class="fecha">${escapar(fechaLarga(fecha))}</span>
        </div>
    </header>`;
}

function contenidoHTML(datos, imagenes) {
    const nombre = texto(datos.nombre);
    const observaciones = texto(datos.observaciones);
    const tablas = GRUPOS
        .map((grupo) => tablaHTML(grupo, datos))
        .join('');

    return `<div class="contenido">
        <section class="paciente">
            <div class="nombre">${nombre ? escapar(nombre) : '&nbsp;'}</div>
            <div class="dato"><span class="et">Documento</span><span class="vl">${dato(datos.documento)}</span></div>
            <div class="dato"><span class="et">Edad</span><span class="vl">${dato(datos.edad)}</span></div>
            <div class="dato"><span class="et">Teléfono</span><span class="vl">${dato(datos.telefono)}</span></div>
            <div class="dato"><span class="et">Entidad</span><span class="vl">${dato(datos.entidad)}</span></div>
        </section>

        <div class="medidas">${tablas}</div>

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
        </footer>
    </div>`;
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
        ${cabeceraHTML(recursos, datos.fecha)}
        ${contenidoHTML(datos, recursos)}
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
