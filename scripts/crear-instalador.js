#!/usr/bin/env node
/**
 * Compila el instalador con Inno Setup 6.
 *
 * Usa la app ya empaquetada en `dist/win-unpacked` (npm run build:dir) y el
 * script `optica-inno.iss`. La versión se toma de package.json, así que no hay
 * que cambiarla en dos sitios.
 *
 *   npm run build:instalador
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const raiz = path.join(__dirname, '..');
const paquete = require(path.join(raiz, 'package.json'));
const ejecutable = path.join(raiz, 'dist', 'win-unpacked', 'OpticaApp.exe');

if (!fs.existsSync(ejecutable)) {
    console.error('No existe dist/win-unpacked/OpticaApp.exe.');
    console.error('Ejecuta primero: npm run build:dir');
    process.exit(1);
}

const candidatos = [
    process.env.INNO_SETUP_ISCC,
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Inno Setup 6', 'ISCC.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Inno Setup 6', 'ISCC.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'Inno Setup 6', 'ISCC.exe')
].filter(Boolean);

const iscc = candidatos.find((ruta) => fs.existsSync(ruta));
if (!iscc) {
    console.error('No se encontró Inno Setup 6 (ISCC.exe).');
    console.error('Instálalo desde https://jrsoftware.org/isdl.php o define INNO_SETUP_ISCC.');
    process.exit(1);
}

const script = path.join(raiz, 'optica-inno.iss');
const resultado = spawnSync(iscc, [`/DMyAppVersion=${paquete.version}`, script], {
    cwd: raiz,
    stdio: 'inherit'
});

if (resultado.error) {
    console.error('No se pudo ejecutar Inno Setup:', resultado.error.message);
    process.exit(1);
}

const instalador = path.join(raiz, 'dist', `OpticaApp Setup ${paquete.version}.exe`);
process.exit(resultado.status || (fs.existsSync(instalador) ? 0 : 1));
