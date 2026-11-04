const { calcularEdad } = require('./fechas');

const SCHEMA_VERSION = 2;

// Migraciones incrementales del esquema. Cada paso debe ser idempotente para
// que pueda ejecutarse sobre bases de datos de versiones anteriores.
async function migrar({ run, get, all }) {
    await run(`CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT,
        fechaConsulta TEXT,
        fechaNacimiento TEXT,
        entidad TEXT,
        nombre TEXT,
        documento TEXT NOT NULL,
        edad INTEGER,
        telefono TEXT,
        od TEXT,
        oi TEXT,
        adicion TEXT,
        avcc_od TEXT,
        avcc_oi TEXT,
        dp TEXT,
        altura TEXT,
        tipo TEXT,
        filtro TEXT,
        uso TEXT,
        control TEXT,
        observaciones TEXT,
        distanciaNasopupilarOD TEXT,
        distanciaNasopupilarOI TEXT
    )`);

    // Renombrado "color" -> "altura" (commit 25e3bc4).
    const columns = await all('PRAGMA table_info(pacientes)');
    const hasAltura = columns.some((column) => column.name === 'altura');
    const hasColor = columns.some((column) => column.name === 'color');

    if (!hasAltura) {
        await run('ALTER TABLE pacientes ADD COLUMN altura TEXT');
    }
    if (hasColor) {
        await run('UPDATE pacientes SET altura = color WHERE altura IS NULL');
    }

    // Fecha de nacimiento y fecha de la consulta (versión 2). En las bases
    // anteriores solo existía "fecha". Si esa fecha coincide con la edad
    // guardada, se interpreta como fecha de nacimiento (el cliente la usaba
    // así); en caso contrario se conserva como fecha de la consulta.
    const versionAnterior = await get('PRAGMA user_version');
    const versionActual = versionAnterior ? versionAnterior.user_version : 0;

    if (!columns.some((column) => column.name === 'fechaConsulta')) {
        await run('ALTER TABLE pacientes ADD COLUMN fechaConsulta TEXT');
    }
    if (!columns.some((column) => column.name === 'fechaNacimiento')) {
        await run('ALTER TABLE pacientes ADD COLUMN fechaNacimiento TEXT');
    }

    if (versionActual < 2) {
        const pendientes = await all(
            `SELECT id, fecha, edad FROM pacientes
             WHERE fecha IS NOT NULL AND fecha <> ''
               AND (fechaConsulta IS NULL OR fechaConsulta = '')
               AND (fechaNacimiento IS NULL OR fechaNacimiento = '')`
        );

        for (const fila of pendientes) {
            const edadGuardada = fila.edad === null || fila.edad === undefined
                ? null
                : Number(fila.edad);
            const edadCalculada = calcularEdad(fila.fecha);
            const pareceNacimiento = Number.isInteger(edadGuardada)
                && edadGuardada === edadCalculada
                && edadCalculada >= 0
                && edadCalculada <= 120;

            if (pareceNacimiento) {
                await run(
                    'UPDATE pacientes SET fechaNacimiento = ?, fechaConsulta = NULL WHERE id = ?',
                    [fila.fecha, fila.id]
                );
            } else {
                await run(
                    'UPDATE pacientes SET fechaConsulta = ? WHERE id = ?',
                    [fila.fecha, fila.id]
                );
            }
        }
    }

    // Sin UNIQUE no se puede garantizar que un documento exista una sola vez.
    // Antes de crearlo se conserva el registro más reciente de cada documento.
    const duplicates = await get(
        `SELECT COUNT(*) AS total FROM pacientes
         WHERE documento IS NOT NULL
           AND id NOT IN (SELECT MAX(id) FROM pacientes WHERE documento IS NOT NULL GROUP BY documento)`
    );
    if (duplicates.total > 0) {
        await run(
            `DELETE FROM pacientes
             WHERE documento IS NOT NULL
               AND id NOT IN (SELECT MAX(id) FROM pacientes WHERE documento IS NOT NULL GROUP BY documento)`
        );
        console.log(`Migración: ${duplicates.total} registro(s) duplicado(s) eliminado(s).`);
    }

    await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_documento ON pacientes(documento)');
    await run('CREATE INDEX IF NOT EXISTS idx_pacientes_nombre ON pacientes(nombre)');
    await run('CREATE INDEX IF NOT EXISTS idx_pacientes_fecha ON pacientes(fecha)');
    await run('CREATE INDEX IF NOT EXISTS idx_pacientes_fecha_consulta ON pacientes(fechaConsulta)');

    const version = await get('PRAGMA user_version');
    if (!version || version.user_version < SCHEMA_VERSION) {
        await run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    }
}

module.exports = { migrar, SCHEMA_VERSION };
