const CAMPOS = [
    'fecha', 'entidad', 'nombre', 'documento', 'edad', 'telefono',
    'od', 'oi', 'adicion', 'avcc_od', 'avcc_oi', 'dp', 'altura',
    'tipo', 'filtro', 'uso', 'control', 'observaciones',
    'distanciaNasopupilarOD', 'distanciaNasopupilarOI'
];

// Campos de texto libre que no necesitan un formato concreto.
const CAMPOS_TEXTO_CORTO = [
    'od', 'oi', 'adicion', 'avcc_od', 'avcc_oi', 'dp', 'altura',
    'tipo', 'filtro', 'uso', 'control',
    'distanciaNasopupilarOD', 'distanciaNasopupilarOI'
];

const MAX_CORTO = 40;
const MAX_NOMBRE = 80;
const MAX_ENTIDAD = 40;
const MAX_TELEFONO = 25;
const MAX_OBSERVACIONES = 1000;
const MAX_DOCUMENTO = 30;

function texto(valor) {
    return valor === null || valor === undefined ? '' : String(valor).trim();
}

function fechaValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;

    const [anio, mes, dia] = valor.split('-').map(Number);
    if (anio < 1900 || anio > 2100) return false;

    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    return fecha.getUTCFullYear() === anio
        && fecha.getUTCMonth() === mes - 1
        && fecha.getUTCDate() === dia;
}

// Valida y normaliza los datos de un paciente. El proceso principal no debe
// confiar en lo que envía el renderer.
function validarPaciente(entrada = {}) {
    const errores = [];
    const datos = {};

    datos.documento = texto(entrada.documento);
    if (!datos.documento) {
        errores.push('El documento es obligatorio.');
    } else if (!/^[A-Za-z0-9.-]{3,30}$/.test(datos.documento)) {
        errores.push('El documento debe tener entre 3 y 30 caracteres (letras, números, punto o guion).');
    }

    datos.nombre = texto(entrada.nombre);
    if (datos.nombre.length < 2) {
        errores.push('El nombre es obligatorio (mínimo 2 caracteres).');
    } else if (datos.nombre.length > MAX_NOMBRE) {
        errores.push(`El nombre no puede superar ${MAX_NOMBRE} caracteres.`);
    }

    datos.fecha = texto(entrada.fecha);
    if (!fechaValida(datos.fecha)) {
        errores.push('La fecha es obligatoria y debe tener el formato AAAA-MM-DD.');
    }

    datos.edad = null;
    const edad = texto(entrada.edad);
    if (edad) {
        const numero = Number(edad);
        if (!Number.isInteger(numero) || numero < 0 || numero > 120) {
            errores.push('La edad debe ser un número entero entre 0 y 120.');
        } else {
            datos.edad = numero;
        }
    }

    datos.telefono = texto(entrada.telefono);
    if (datos.telefono && !/^[0-9+\-()\s]{5,25}$/.test(datos.telefono)) {
        errores.push(`El teléfono no es válido (máximo ${MAX_TELEFONO} caracteres).`);
    }

    datos.entidad = texto(entrada.entidad) || 'Particular';
    if (datos.entidad.length > MAX_ENTIDAD) {
        errores.push(`La entidad no puede superar ${MAX_ENTIDAD} caracteres.`);
    }

    for (const campo of CAMPOS_TEXTO_CORTO) {
        datos[campo] = texto(entrada[campo]);
        if (datos[campo].length > MAX_CORTO) {
            errores.push(`El campo "${campo}" no puede superar ${MAX_CORTO} caracteres.`);
        }
    }

    datos.observaciones = texto(entrada.observaciones);
    if (datos.observaciones.length > MAX_OBSERVACIONES) {
        errores.push(`Las observaciones no pueden superar ${MAX_OBSERVACIONES} caracteres.`);
    }

    return { ok: errores.length === 0, datos, errores };
}

module.exports = { validarPaciente, CAMPOS };
