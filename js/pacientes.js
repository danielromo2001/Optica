const db = require('./db');
const { CAMPOS, validarPaciente } = require('./validacion');

function validar(data) {
    const { ok, datos, errores } = validarPaciente(data);
    if (!ok) {
        const error = errores.join(' ');
        const fallo = new Error(error);
        fallo.validacion = true;
        throw fallo;
    }
    return datos;
}

async function existe(documento) {
    const row = await db.get('SELECT COUNT(*) AS total FROM pacientes WHERE documento = ?', [documento]);
    return row.total > 0;
}

async function buscar(documento) {
    return (await db.get('SELECT * FROM pacientes WHERE documento = ?', [documento])) || null;
}

// Guarda o actualiza (si el documento ya existe) en una sola operación.
async function guardar(data) {
    const datos = validar(data);

    const actualizaciones = CAMPOS
        .filter((campo) => campo !== 'documento')
        .map((campo) => `${campo} = excluded.${campo}`)
        .join(', ');

    const sql = `INSERT INTO pacientes (${CAMPOS.join(', ')})
                 VALUES (${CAMPOS.map(() => '?').join(', ')})
                 ON CONFLICT(documento) DO UPDATE SET ${actualizaciones}`;

    const resultado = await db.run(sql, CAMPOS.map((campo) => datos[campo]));
    return { id: resultado.lastID, changes: resultado.changes };
}

async function actualizar(data) {
    const datos = validar(data);

    const campos = CAMPOS.filter((campo) => campo !== 'documento');
    const sql = `UPDATE pacientes SET ${campos.map((campo) => `${campo} = ?`).join(', ')}
                 WHERE documento = ?`;

    const resultado = await db.run(sql, [...campos.map((campo) => datos[campo]), datos.documento]);
    if (resultado.changes === 0) {
        throw new Error('No existe un paciente con ese documento.');
    }
    return { changes: resultado.changes };
}

async function eliminar(documento) {
    const resultado = await db.run('DELETE FROM pacientes WHERE documento = ?', [documento]);
    if (resultado.changes === 0) {
        throw new Error('No existe un paciente con ese documento.');
    }
    return { changes: resultado.changes };
}

async function listar({ texto = '', desde = '', hasta = '' } = {}) {
    const condiciones = [];
    const params = [];

    const busqueda = String(texto || '').trim();
    if (busqueda) {
        const patron = `%${busqueda.replace(/([%_\\])/g, '\\$1')}%`;
        condiciones.push("(nombre LIKE ? ESCAPE '\\' OR documento LIKE ? ESCAPE '\\')");
        params.push(patron, patron);
    }
    if (desde) {
        condiciones.push('fecha >= ?');
        params.push(desde);
    }
    if (hasta) {
        condiciones.push('fecha <= ?');
        params.push(hasta);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    return db.all(
        `SELECT id, documento, nombre, fecha, telefono, edad, altura
         FROM pacientes ${where}
         ORDER BY fecha DESC, nombre ASC
         LIMIT 200`,
        params
    );
}

module.exports = { existe, buscar, guardar, actualizar, eliminar, listar };
