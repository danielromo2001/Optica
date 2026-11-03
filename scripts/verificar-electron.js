#!/usr/bin/env node
/**
 * Comprueba que Electron se haya descargado y descomprimido por completo.
 *
 * En Windows, el postinstall de `electron` a veces termina "en silencio" con
 * `dist/` incompleto (antivirus, extracción interrumpida, etc.). El síntoma es
 * un error tipo "Electron failed to install correctly".
 *
 * Este script es idempotente: si Electron está bien no hace nada; si falta el
 * ejecutable intenta reinstalarlo y, como último recurso, extrae el ZIP que ya
 * está en la caché de Electron sin volver a descargarlo.
 *
 * Se ejecuta automáticamente en `npm install` (postinstall) y también a mano:
 *   npm run reparar-electron
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const raiz = path.join(__dirname, '..');
const dirElectron = path.join(raiz, 'node_modules', 'electron');

const EJECUTABLE = {
    win32: 'electron.exe',
    darwin: 'Electron.app/Contents/MacOS/Electron',
    linux: 'electron',
    freebsd: 'electron',
    openbsd: 'electron'
}[process.platform];

if (!fs.existsSync(dirElectron)) {
    // Electron no está instalado (por ejemplo, en un entorno de solo pruebas).
    process.exit(0);
}

const { version } = require(path.join(dirElectron, 'package.json'));
const dist = path.join(dirElectron, 'dist');
const ejecutable = path.join(dist, EJECUTABLE);
const pathTxt = path.join(dirElectron, 'path.txt');

function estaCompleto() {
    try {
        const versionInstalada = fs.readFileSync(path.join(dist, 'version'), 'utf8').replace(/^v/, '').trim();
        const rutaRelativa = fs.readFileSync(pathTxt, 'utf8').trim();
        return versionInstalada === version
            && rutaRelativa === EJECUTABLE
            && fs.existsSync(ejecutable);
    } catch {
        return false;
    }
}

function plataformaArtefacto() {
    const plataforma = process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux';
    return `${plataforma}-${process.arch}`;
}

function buscarZipEnCache() {
    const nombre = `electron-v${version}-${plataformaArtefacto()}.zip`;
    const raices = [
        process.env.electron_config_cache,
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'electron', 'Cache') : null,
        path.join(os.homedir(), '.cache', 'electron'),
        path.join(os.homedir(), 'Library', 'Caches', 'electron')
    ].filter(Boolean);

    const encontrados = [];

    const recorrer = (dir, profundidad) => {
        if (profundidad > 4 || !fs.existsSync(dir)) return;
        let entradas = [];
        try {
            entradas = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entrada of entradas) {
            const ruta = path.join(dir, entrada.name);
            if (entrada.isDirectory()) {
                recorrer(ruta, profundidad + 1);
            } else if (entrada.name === nombre) {
                encontrados.push({ ruta, mtime: fs.statSync(ruta).mtimeMs });
            }
        }
    };

    raices.forEach((raizCache) => recorrer(raizCache, 0));
    encontrados.sort((a, b) => b.mtime - a.mtime);
    return encontrados.length ? encontrados[0].ruta : null;
}

function ejecutarInstaladorOficial() {
    const instalador = path.join(dirElectron, 'install.js');
    if (!fs.existsSync(instalador)) return false;

    const resultado = spawnSync(process.execPath, [instalador], {
        cwd: raiz,
        stdio: 'inherit',
        timeout: 180000,
        env: { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '' }
    });

    return resultado.status === 0;
}

// `extract-zip` se queda colgado con el ZIP de Electron en algunas versiones de
// Node/Windows (extrae el primer archivo y nunca resuelve). Por eso se intenta
// primero con herramientas del sistema, que además son mucho más rápidas.
function extraerConHerramientaSistema(zip) {
    if (process.platform === 'win32') {
        // bsdtar viene de serie en Windows 10 1803+.
        const resultado = spawnSync('tar', ['-xf', zip, '-C', dist], { stdio: 'ignore' });
        return resultado.status === 0;
    }

    const resultado = spawnSync('unzip', ['-q', '-o', zip, '-d', dist], { stdio: 'ignore' });
    return resultado.status === 0;
}

async function extraerConExtractZip(zip) {
    let extract;
    try {
        extract = require(require.resolve('extract-zip', { paths: [dirElectron, raiz] }));
    } catch {
        return false;
    }

    // Si extract-zip se cuelga, no bloqueamos el install para siempre.
    const LIMITE_MS = 120000;
    let temporizador;
    const limite = new Promise((_, rechazar) => {
        temporizador = setTimeout(
            () => rechazar(new Error('La extracción tardó demasiado.')),
            LIMITE_MS
        );
    });

    try {
        await Promise.race([extract(zip, { dir: dist }), limite]);
        return true;
    } catch (error) {
        console.warn(`extract-zip no pudo extraer el ZIP: ${error.message}`);
        return false;
    } finally {
        clearTimeout(temporizador);
    }
}

async function extraerDesdeCache() {
    const zip = buscarZipEnCache();
    if (!zip) return false;

    console.log(`Extrayendo Electron desde la caché: ${zip}`);

    const preparar = () => {
        fs.rmSync(dist, { recursive: true, force: true });
        fs.mkdirSync(dist, { recursive: true });
    };

    preparar();
    let ok = extraerConHerramientaSistema(zip);

    if (!ok || !fs.existsSync(ejecutable)) {
        preparar();
        ok = await extraerConExtractZip(zip);
    }

    if (!fs.existsSync(ejecutable)) return false;

    // install.js mueve las definiciones de tipos a la raíz del paquete.
    const tipos = path.join(dist, 'electron.d.ts');
    if (fs.existsSync(tipos)) {
        fs.renameSync(tipos, path.join(dirElectron, 'electron.d.ts'));
    }

    fs.writeFileSync(pathTxt, EJECUTABLE);
    return true;
}

async function main() {
    if (estaCompleto()) {
        console.log(`Electron ${version} instalado correctamente.`);
        return;
    }

    console.warn(`Electron ${version} está incompleto (falta ${EJECUTABLE}). Reparando…`);

    // Primero la caché: es instantáneo y no depende de la red. Así se evita
    // ejecutar install.js (que es justo el que se cuelga con extract-zip).
    await extraerDesdeCache();
    if (estaCompleto()) {
        console.log('Electron reparado desde la caché local.');
        return;
    }

    ejecutarInstaladorOficial();
    if (estaCompleto()) {
        console.log('Electron reparado por el instalador oficial.');
        return;
    }

    // El instalador oficial pudo descargar el ZIP aunque fallara al extraerlo.
    await extraerDesdeCache();
    if (estaCompleto()) {
        console.log('Electron reparado desde la caché local.');
        return;
    }

    console.error('');
    console.error('No se pudo reparar Electron automáticamente.');
    console.error('Prueba una de estas opciones:');
    console.error('  1. npm run reparar-electron');
    console.error('  2. rm -rf node_modules/electron && npm install');
    console.error('  3. Añade una exclusión de antivirus para node_modules/electron');
    console.error('');
    process.exit(1);
}

main().catch((error) => {
    console.error('Error al verificar Electron:', error.message);
    process.exit(1);
});
