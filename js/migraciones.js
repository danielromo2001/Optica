const SCHEMA_VERSION = 1;

// Migraciones incrementales del esquema. Cada paso debe ser idempotente para
// que pueda ejecutarse sobre bases de datos de versiones anteriores.
async function migrar({ run, get, all }) {
    await run(`CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT,
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

    const version = await get('PRAGMA user_version');
    if (!version || version.user_version < SCHEMA_VERSION) {
        await run(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    }
}

module.exports = { migrar, SCHEMA_VERSION };
