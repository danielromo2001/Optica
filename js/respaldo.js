const fs = require('fs');
const path = require('path');

const dosDigitos = (valor) => String(valor).padStart(2, '0');

// Nombre ordenable y sin caracteres problemáticos: optica-respaldo-2026-11-03_1835.db
function nombreRespaldo(fecha = new Date()) {
    const dia = `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
    const hora = `${dosDigitos(fecha.getHours())}${dosDigitos(fecha.getMinutes())}`;
    return `optica-respaldo-${dia}_${hora}.db`;
}

// Genera una copia consistente de la base de datos en `destino`.
// No sobrescribe archivos existentes: el diálogo ya avisa, pero el proceso
// principal no debe confiar en lo que envía el renderer.
async function respaldar(db, destino) {
    if (typeof destino !== 'string' || !destino.trim()) {
        throw new Error('Falta la ruta donde guardar el respaldo.');
    }

    const ruta = path.resolve(destino);

    if (path.extname(ruta).toLowerCase() !== '.db') {
        throw new Error('El respaldo debe tener extensión .db.');
    }
    if (fs.existsSync(ruta)) {
        throw new Error('Ya existe un archivo con ese nombre. Elige otro.');
    }
    if (!fs.existsSync(path.dirname(ruta))) {
        throw new Error('La carpeta de destino no existe.');
    }

    await db.backup(ruta);

    const { size } = fs.statSync(ruta);
    if (size === 0) {
        fs.rmSync(ruta, { force: true });
        throw new Error('El respaldo quedó vacío.');
    }

    return { path: ruta, bytes: size };
}

module.exports = { respaldar, nombreRespaldo };
