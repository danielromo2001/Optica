# OpticaApp

Aplicación de escritorio para registrar pacientes, generar fórmulas ópticas en PDF e imprimirlas directamente. Funciona sin conexión y guarda los datos en el equipo, no en la nube.

Hecha con Electron + SQLite (`sqlite3`); el PDF y la impresión usan el motor de Chromium con una única plantilla HTML, para que el papel salga igual que el archivo.

## Características

- **Formulario de paciente** con fecha, entidad, documento, edad, teléfono y datos de la fórmula (RX, AVCC, DP, altura, tipo, filtro, uso, control, observaciones).
- **Búsqueda por documento** y detección de pacientes existentes.
- **Listado de pacientes** con búsqueda por nombre/documento y filtro por rango de fechas.
- **Edición y eliminación** desde el listado o desde el formulario.
- **PDF por paciente** en `Documentos/Pacientes Optica/`, tamaño media carta.
- **Impresión directa** a la impresora predeterminada, también en tamaño media carta, sin pasar por Adobe Reader.
- **Dos diseños de fórmula** (`clasica` y `moderna`) generados desde la misma plantilla.
- **Importar datos** de una instalación anterior, con copia de seguridad automática antes de reemplazar.
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

Al arrancar por primera vez, si existe una base antigua en `db/optica.db` o en la carpeta de una instalación anterior (`db/` o `resources/app/db/`), se copia automáticamente a esa ruta. Si la nueva app arranca con la base vacía, ofrece importar los datos de la versión anterior.

> **Privacidad:** el repositorio **no** incluye la base de datos. `.gitignore` excluye `db/` y cualquier `*.db`. No subas nunca una base con datos de pacientes: usa el botón *Respaldar datos* y guarda la copia fuera del proyecto.

## Impresión y PDF

La fórmula se construye una sola vez como HTML y se usa para las dos salidas, así que el papel y el archivo son idénticos:

- **Imprimir:** botón *Imprimir* en cada fila del listado o en el aviso que aparece al guardar. Envía el trabajo directamente a la impresora predeterminada, en tamaño **media carta** (139,7 × 215,9 mm, 5,5 × 8,5 in) y sin abrir Adobe Reader.
- **PDF:** al guardar se crea `Documentos/Pacientes Optica/Paciente_<documento>.pdf`, también en media carta (396 × 612 pt). Si el contenido es muy largo, pasa a una segunda página en lugar de recortarse.

Si Windows no permite imprimir en silencio (controlador, permisos o impresora ocupada), la app muestra el diálogo de impresión para elegir impresora y confirmar.

Para que la impresión directa salga en media carta, la impresora debe admitir ese tamaño. En Windows: *Configuración → Bluetooth y dispositivos → Impresoras y escáneres → [impresora] → Preferencias de impresión → Tamaño de papel: media carta (5,5 × 8,5 in)*. La app envía el tamaño en cada trabajo; si el controlador no lo admite, usa el diálogo y selecciónalo.

### Cambiar el diseño de la fórmula

Hay dos variantes: `clasica` (por defecto) y `moderna`. Para cambiar la que usa toda la app, edita `DISENO_POR_DEFECTO` en `js/formula.js`. También se puede pedir una concreta al generar el PDF o imprimir:

```js
generarPDF(datos, documentos, { diseno: 'moderna' });
imprimirFormula(datos, { diseno: 'moderna' });
```

## Instalar la actualización sin perder datos

Los pacientes **no** viven dentro de la carpeta de la app: están en `%APPDATA%\optica_app\optica.db`. El instalador no toca esa carpeta, así que actualizar no borra los datos. Aun así, conviene guardar una copia antes.

1. Localiza la base de datos de la versión vieja. Normalmente está en `<carpeta de la app vieja>\resources\app\db\optica.db`. Copia ese archivo a `Documentos` o a un USB.
2. Cierra la app vieja.
3. Instala la nueva versión con `OpticaApp Setup <versión>.exe`. No desinstales la versión vieja hasta comprobar que están todos los pacientes.
4. Abre la nueva app. Si la base está vacía, pregunta si quieres importar: elige **Importar datos** y selecciona el `optica.db` del paso 1. También puedes hacerlo después en *Pacientes → Importar datos*.
5. Antes de reemplazar, la app guarda la base actual como `optica-antes-de-importar-<fecha>.db` en `%APPDATA%\optica_app\`.
6. Revisa el listado. Si algo salió mal, vuelve a importar el respaldo o la base vieja.

La importación conserva el historial y migra el esquema antiguo automáticamente (`color` → `altura`, documentos duplicados, índices). Si instalas la nueva versión sobre la carpeta de la vieja, la detección del primer arranque puede copiarla sola.

## Respaldo y restauración

**Crear un respaldo:** pestaña *Pacientes* → *Respaldar datos*. Se abre un diálogo para elegir dónde guardar el archivo (por defecto `Documentos`, con nombre `optica-respaldo-AAAA-MM-DD_HHMMSS.db`).

El respaldo usa `VACUUM INTO`, así que es una copia consistente aunque la app esté abierta.

**Restaurar:**

1. Abre la app y ve a *Pacientes → Importar datos*.
2. Selecciona el archivo de respaldo. La app guarda antes una copia de la base actual.
3. Comprueba el listado.

También se puede restaurar a mano: cierra la app, copia el respaldo sobre `%APPDATA%\optica_app\optica.db` y vuelve a abrirla.

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
  db.js               Conexión SQLite, ruta en userData, respaldo e importación
  migraciones.js      Esquema, índices y PRAGMA user_version
  pacientes.js        Consultas de pacientes (upsert idempotente)
  validacion.js       Normalización y validación de datos
  respaldo.js         Nombre y creación del respaldo
  formula.js          Plantilla HTML de la fórmula (diseños y tamaño media carta)
  pagina.js           Ventana oculta para renderizar la fórmula con Chromium
  pdf.js              Generación del PDF con printToPDF
  impresion.js        Impresión directa y respaldo con diálogo del sistema
scripts/
  verificar-electron.js  Repara instalaciones incompletas de Electron
test/                 Pruebas de validación, datos, migraciones, respaldo, fórmula e importación
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
- Fórmula: tamaño media carta, escape de HTML, datos vacíos y las dos variantes de diseño.
- Importación: validación del archivo SQLite, rechazo de archivos inválidos o en uso, migración y copia de seguridad previa.

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
