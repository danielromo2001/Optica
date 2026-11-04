// Cálculo de edad compartido entre la interfaz (script clásico) y el proceso
// principal (CommonJS). No depende de Electron ni de la zona horaria.
(function (global) {
    function partes(fecha) {
        const coincide = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha || '').trim());
        if (!coincide) return null;

        const [, anio, mes, dia] = coincide.map(Number);
        if (anio < 1900 || anio > 2100) return null;

        const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
        if (fechaUTC.getUTCFullYear() !== anio
            || fechaUTC.getUTCMonth() !== mes - 1
            || fechaUTC.getUTCDate() !== dia) {
            return null;
        }

        return { anio, mes, dia };
    }

    function hoy() {
        const ahora = new Date();
        return {
            anio: ahora.getFullYear(),
            mes: ahora.getMonth() + 1,
            dia: ahora.getDate()
        };
    }

    // Edad cumplida a la fecha de referencia (normalmente la consulta). Si no
    // se indica, se usa la fecha actual. Devuelve null si alguna fecha no es
    // válida o si el nacimiento es posterior a la referencia.
    function calcularEdad(fechaNacimiento, fechaReferencia) {
        const nacimiento = partes(fechaNacimiento);
        if (!nacimiento) return null;

        const referencia = fechaReferencia ? partes(fechaReferencia) : hoy();
        if (!referencia) return null;

        let edad = referencia.anio - nacimiento.anio;
        if (referencia.mes < nacimiento.mes
            || (referencia.mes === nacimiento.mes && referencia.dia < nacimiento.dia)) {
            edad -= 1;
        }

        return edad >= 0 ? edad : null;
    }

    const api = { calcularEdad };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        global.Fechas = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
