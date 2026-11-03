# OpticaApp

Aplicación de escritorio para registrar pacientes y generar fórmulas ópticas en PDF. Funciona sin conexión y guarda los datos en el equipo, no en la nube.

Hecha con Electron + SQLite (`sqlite3`) + PDFKit.

## Características

- **Formulario de paciente** con fecha, entidad, documento, edad, teléfono y datos de la fórmula (RX, AVCC, DP, altura, tipo, filtro, uso, control, observaciones).
- **Búsqueda por documento** y detección de pacientes existentes.
- **Listado de pacientes** con búsqueda por nombre/documento y filtro por rango de fechas.
- **Edición y eliminación** desde el listado o desde el formulario.
- **PDF por paciente** en `Documentos/Pacientes Optica/`.
- **Respaldo manual** de la base de datos desde la propia app (*Pacientes → Respaldar datos*).
- **Validación en el proceso principal**: el renderer no puede saltarse las reglas.
- Atajos: **Ctrl+S** guardar, **Ctrl+F** buscar.

## Requisitos

- Windows 10/11 (probado) o Linux/macOS para desarrollo.
- **Node.js 20 o superior**.
- Para compilar el instalador: conexión a internet la primera vez (electron-builder descarga sus utilidades).

## Instalación

```bash
npm install
```

El `postinstall` comprueba que Electron se haya descargado completo y lo repara si hace falta (ver [Problemas conocidos](#problemas-conocidos)). Si algo falla:

```bash
npm run reparar-electron
```

## Ejecutar

```bash
npm start      # abre la app
npm run dev    # igual, pero reinicia al cambiar archivos (nodemon)
```

## Dónde se guardan los datos

La base de datos vive en el directorio de datos del usuario, nunca dentro de la carpeta del proyecto:

| Sistema | Ruta |
|---|---|
| Windows | `%APPDATA%\optica_app\optica.db` |
| Linux | `~/.config/optica_app/optica.db` |
| macOS | `~/Library/Application Support/optica_app/optica.db` |

Al arrancar por primera vez, si existe una base antigua en `db/optica.db`, se copia automáticamente a esa ruta.

> **Privacidad:** el repositorio **no** incluye la base de datos. `.gitignore` excluye `db/` y cualquier `*.db`. No subas nunca una base con datos de pacientes: usa el botón *Respaldar datos* y guarda la copia fuera del proyecto.

## Respaldo y restauración

**Crear un respaldo:** pestaña *Pacientes* → *Respaldar datos*. Se abre un diálogo para elegir dónde guardar el archivo (por defecto `Documentos`, con nombre `optica-respaldo-AAAA-MM-DD_HHMM.db`).

El respaldo usa `VACUUM INTO`, así que es una copia consistente aunque la app esté abierta.

**Restaurar:**

1. Cierra la app.
2. Guarda una copia de la base actual.
3. Copia el respaldo sobre `%APPDATA%\optica_app\optica.db`.
4. Abre la app y comprueba el listado.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Abre la app. |
| `npm run dev` | Desarrollo con recarga (nodemon). |
| `npm test` | Pruebas con el runner nativo de Node (`node:test`). |
| `npm run build` | Genera el instalador NSIS en `dist/`. |
| `npm run build:dir` | Genera la app sin instalador (`dist/win-unpacked/`), útil para probar el empaquetado. |
| `npm run reparar-electron` | Verifica y repara la instalación de Electron. |

## Estructura del proyecto

```
app/                  HTML y CSS de la interfaz (CSP estricta, sin CDN)
images/               Logo e iconos
js/
  main.js             Ciclo de vida de Electron y ventana
  ipc.js              Canales IPC (validación y errores centralizados)
  preload.js          Puente seguro con contextIsolation
  renderer.js         Lógica de la interfaz
  db.js               Conexión SQLite, ruta en userData y respaldo
  migraciones.js      Esquema, índices y PRAGMA user_version
  pacientes.js        Consultas de pacientes (upsert idempotente)
  validacion.js       Normalización y validación de datos
  respaldo.js         Nombre y creación del respaldo
  pdf.js              Generación del PDF
scripts/
  verificar-electron.js  Repara instalaciones incompletas de Electron
test/                 Pruebas de validación, datos, migraciones y respaldo
```

## Generar el instalador

```bash
npm run build
```

El resultado queda en `dist/` (`OpticaApp Setup <versión>.exe`). Antes de compilar, comprueba:

- No hay ninguna base de datos dentro del proyecto (`db/` está ignorado).
- `build.files` no incluye `db/` ni `test/`.
- Los módulos nativos (`sqlite3`) se descomprimen fuera del `asar` gracias a `asarUnpack`.

Para revisar qué se empaquetó sin instalar nada:

```bash
npm run build:dir
npx @electron/asar list dist/win-unpacked/resources/app.asar
```

## Pruebas

```bash
npm test
```

Cubren:

- Validación y normalización (documento, fecha real, edad, teléfono, límites).
- Capa de datos contra SQLite real: alta, upsert sin duplicados, actualización, borrado, búsqueda y filtros.
- Migración de una base antigua (`color` → `altura`, duplicados, `UNIQUE`, `user_version`) e idempotencia.
- Respaldo: nombre, copia legible y rechazo de destinos inválidos.

Las pruebas usan bases temporales; nunca tocan la base real.

## Problemas conocidos

### "Electron failed to install correctly"

El postinstall de Electron puede dejar `node_modules/electron/dist` incompleto en Windows (antivirus o extracción interrumpida). Solución:

```bash
npm run reparar-electron
```

El script comprueba el ejecutable, reintenta el instalador oficial y, si hace falta, extrae el ZIP de la caché de Electron (`%LOCALAPPDATA%\electron\Cache`). Como última opción:

```bash
rm -rf node_modules/electron
npm install
```

Añadir una exclusión de antivirus para `node_modules/electron` evita que vuelva a pasar.

### `sqlite3` no carga tras cambiar de versión de Node/Electron

`sqlite3` 5.x usa N-API, así que normalmente el mismo binario sirve para Node y Electron. Si aparece un error de módulo nativo:

```bash
npm rebuild sqlite3
```

## Licencia

ISC.
