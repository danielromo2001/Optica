# OpticaApp

Aplicación de escritorio para registrar pacientes, generar fórmulas ópticas en PDF e imprimirlas directamente. Funciona sin conexión y guarda los datos en el equipo, no en la nube.

Hecha con Electron + SQLite (`sqlite3`); el PDF y la impresión usan el motor de Chromium con una única plantilla HTML, para que el papel salga igual que el archivo.

## Características

- **Formulario de paciente** con fecha, entidad, documento, edad, teléfono y datos de la fórmula (RX, AVCC, DP, altura, tipo, filtro, uso, control, observaciones).
- **Búsqueda por documento** y detección de pacientes existentes.
- **Listado de pacientes** con búsqueda por nombre/documento y filtro por rango de fechas.
- **Edición y eliminación** desde el listado o desde el formulario.
- **PDF por paciente** en `Documentos/Pacientes Optica/`, tamaño media carta horizontal.
- **Impresión directa** a la impresora predeterminada, también en media carta horizontal, sin pasar por Adobe Reader ni por otra aplicación.
- **Dos diseños de fórmula** (`clasica` y `moderna`) generados desde la misma plantilla.
- **Importar datos** de una instalación anterior, con copia de seguridad automática antes de reemplazar.
- **Respaldo manual** de la base de datos desde la propia app (*Pacientes → Respaldar datos*).
- **Validación en el proceso principal**: el renderer no puede saltarse las reglas.
- Atajos: **Ctrl+S** guardar, **Ctrl+F** buscar.

## Requisitos

- Windows 10/11 (probado) o Linux/macOS para desarrollo.
- **Node.js 20 o superior**.
- Para empaquetar: conexión a internet la primera vez (electron-builder descarga sus utilidades).
- Para compilar el instalador: **Inno Setup 6** (incluye `ISCC.exe`). El proyecto ya trae `optica-inno.iss`.

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

La fórmula se construye una sola vez como HTML y se usa para las dos salidas, así que el papel y el archivo son idénticos. El diseño es **horizontal**: el paciente y las mediciones van arriba y las tablas de refracción y lentes se reparten el ancho del papel.

- **Imprimir:** botón *Imprimir* en cada fila del listado o en el aviso que aparece al guardar. Envía el trabajo directamente a la **impresora predeterminada** del sistema, en tamaño **media carta horizontal** (215,9 × 139,7 mm, 8,5 × 5,5 in), sin abrir Adobe Reader ni ninguna otra aplicación.
- **PDF:** al guardar se crea `Documentos/Pacientes Optica/Paciente_<documento>.pdf`, también en media carta horizontal (612 × 396 pt). Si las observaciones son muy largas, el texto continúa en una segunda página en lugar de recortarse.

Si Windows no permite imprimir en silencio (controlador, permisos o impresora ocupada), la app muestra el diálogo de impresión para elegir impresora y confirmar. La impresora debe admitir el tamaño media carta. En Windows: *Configuración → Bluetooth y dispositivos → Impresoras y escáneres → [impresora] → Preferencias de impresión → Tamaño de papel: media carta (8,5 × 5,5 in)*. La app envía el tamaño en cada trabajo; si el controlador no lo admite, usa el diálogo y selecciónalo.

La impresión no está atada a una marca o aplicación concreta: se usa la impresora predeterminada de Windows. Si el equipo tiene otra impresora configurada, la app la toma automáticamente.

### Cambiar el diseño de la fórmula

Hay dos variantes: `clasica` (por defecto) y `moderna`. Para cambiar la que usa toda la app, edita `DISENO_POR_DEFECTO` en `js/formula.js`. También se puede pedir una concreta al generar el PDF o imprimir:

```js
generarPDF(datos, documentos, { diseno: 'moderna' });
imprimirFormula(datos, { diseno: 'moderna' });
```

## Instalar la actualización sin perder datos

Los pacientes **no** viven dentro de la carpeta de la app: están en `%APPDATA%\optica_app\optica.db`. El instalador no toca esa carpeta, así que actualizar no borra los datos. Aun así, conviene guardar una copia antes.

1. Localiza la base de datos de la versión vieja. Normalmente está en `<carpeta de la app vieja>\resources\app\db\optica.db`. Copia ese archivo a `Documentos` o a un USB como precaución.
2. Cierra la app vieja.
3. Instala la nueva versión con `OpticaApp Setup <versión>.exe`. Si puedes, elige la **misma carpeta** donde estaba la app vieja: el instalador la detecta antes de copiar archivos y la pasa a `%APPDATA%\optica_app`. No desinstales la versión vieja hasta comprobar que están todos los pacientes.
4. Abre la nueva app. Si la base está vacía, pregunta si quieres importar: elige **Importar datos** y selecciona el `optica.db` del paso 1. También puedes hacerlo después en *Pacientes → Importar datos*.
5. Antes de reemplazar, la app guarda la base actual como `optica-antes-de-importar-<fecha>.db` en `%APPDATA%\optica_app\`.
6. Revisa el listado. Si algo salió mal, vuelve a importar el respaldo o la base vieja.

La importación conserva el historial y migra el esquema antiguo automáticamente (`color` → `altura`, documentos duplicados, índices). El instalador nunca borra `%APPDATA%\optica_app`; si la nueva base ya existe, no la sobrescribe.

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
| `npm run build` | Empaqueta la app y compila el instalador con Inno Setup en `dist/`. |
| `npm run build:dir` | Genera la app sin instalador (`dist/win-unpacked/`), útil para probar el empaquetado. |
| `npm run build:instalador` | Compila el instalador Inno a partir de `dist/win-unpacked/`. |
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
  formula.js          Plantilla HTML de la fórmula (diseños y media carta horizontal)
  pagina.js           Ventana oculta para renderizar la fórmula con Chromium
  pdf.js              Generación del PDF con printToPDF
  impresion.js        Impresión directa y respaldo con diálogo del sistema
scripts/
  verificar-electron.js  Repara instalaciones incompletas de Electron
  crear-instalador.js    Busca ISCC y compila el instalador Inno
optica-inno.iss       Instalador de Inno Setup 6
test/                 Pruebas de validación, datos, migraciones, respaldo, fórmula, impresión e importación
```

## Generar el instalador

El instalador se compila con **Inno Setup 6**. Primero se empaqueta la app con electron-builder (solo la carpeta, sin NSIS) y después Inno comprime esa carpeta:

```bash
npm run build            # empaqueta + compila el instalador
```

También se pueden ejecutar los pasos por separado:

```bash
npm run build:dir        # crea dist/win-unpacked/
npm run build:instalador # compila dist/OpticaApp Setup <versión>.exe
```

`scripts/crear-instalador.js` busca `ISCC.exe` en las rutas habituales de Inno Setup 6. Si está en otro sitio, define `INNO_SETUP_ISCC` con la ruta completa.

El instalador:

- Instala en `{autopf}\OpticaApp` y pide permisos de administrador; con `/CURRENTUSER` se puede instalar solo para el usuario actual.
- Crea accesos directos en el menú Inicio y, opcionalmente, en el escritorio.
- No incluye ni borra bases de datos: los pacientes viven en `%APPDATA%\optica_app\optica.db`.
- Antes de reemplazar archivos, si encuentra una base antigua en la carpeta de instalación (`resources\app\db\optica.db` o `db\optica.db`), la copia a `%APPDATA%\optica_app\optica.db` solo cuando todavía no hay una base nueva.
- El desinstalador no borra `%APPDATA%\optica_app`.

Antes de compilar, comprueba:

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
- Fórmula: tamaño media carta horizontal, reparto en dos tablas, escape de HTML, datos vacíos y las dos variantes de diseño.
- Impresión: opciones de media carta horizontal, impresión silenciosa y uso de la impresora predeterminada.
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
