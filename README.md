<div align="center">

<img src="images/logo.png" alt="Fashion Vision E y C Óptica" width="110">

# OpticaApp

**Pacientes, fórmulas ópticas y PDF en un solo lugar.**
Rápida, sin conexión y con los datos siempre en tu equipo.

[![Versión](https://img.shields.io/github/package-json/v/danielromo2001/Optica?label=versi%C3%B3n&color=1770D5&style=for-the-badge)](https://github.com/danielromo2001/Optica)
[![Plataforma](https://img.shields.io/badge/Windows-10%20%7C%2011-1770D5?style=for-the-badge&logo=windows&logoColor=white)](#requisitos)
[![Licencia](https://img.shields.io/badge/licencia-ISC-2ea44f?style=for-the-badge)](#licencia)

[![Electron](https://img.shields.io/badge/Electron-35-47848F?style=flat-square&logo=electron&logoColor=white)](#)
[![Node](https://img.shields.io/badge/Node.js-%E2%89%A520-339933?style=flat-square&logo=node.js&logoColor=white)](#requisitos)
[![SQLite](https://img.shields.io/badge/SQLite-local-003B57?style=flat-square&logo=sqlite&logoColor=white)](#dónde-se-guardan-los-datos)
[![Sin conexión](https://img.shields.io/badge/100%25-sin%20conexi%C3%B3n-6b7480?style=flat-square)](#características)

[Características](#características) · [Instalación](#instalación) · [Datos](#dónde-se-guardan-los-datos) · [Impresión](#impresión-y-pdf) · [Instalador](#generar-el-instalador) · [Pruebas](#pruebas)

</div>

---

<a id="características"></a>
## ✨ Características

| Función | Detalle |
|---|---|
| 📝 **Ficha completa del paciente** | Fecha de la consulta, fecha de nacimiento, entidad, documento, teléfono y todos los datos de la fórmula. |
| 🎂 **Edad automática** | Se calcula con la fecha de nacimiento y la de la consulta. El campo es de solo lectura. |
| 🔎 **Búsqueda inmediata** | Por documento al escribir, con detección de pacientes ya registrados. |
| 🗂️ **Listado y filtros** | Búsqueda por nombre o documento y filtro por rango de fechas de consulta. |
| 🖨️ **Impresión directa** | A la impresora predeterminada, en media carta horizontal, sin Adobe Reader ni otras apps. |
| 📄 **PDF automático** | Se genera al guardar, con el mismo diseño que el papel. |
| 🎨 **Dos diseños** | `clasica` y `moderna`, desde una única plantilla. |
| 💾 **Respaldo e importación** | Copia de seguridad manual e importación de datos de versiones anteriores. |
| 🛡️ **Validación centralizada** | El proceso principal valida todo; la interfaz no puede saltarse las reglas. |
| ⌨️ **Atajos** | `Ctrl+S` guardar · `Ctrl+F` buscar. |

> [!NOTE]
> La app funciona **100 % sin internet**: no hay cuentas, nube ni telemetría. Todo vive en tu computador.

---

## 📑 Contenido

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Ejecutar](#ejecutar)
- [Flujo de trabajo](#flujo-de-trabajo)
- [Dónde se guardan los datos](#dónde-se-guardan-los-datos)
- [Impresión y PDF](#impresión-y-pdf)
- [Respaldo y restauración](#respaldo-y-restauración)
- [Actualizar sin perder datos](#actualizar-sin-perder-datos)
- [Generar el instalador](#generar-el-instalador)
- [Scripts](#scripts)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Pruebas](#pruebas)
- [Problemas conocidos](#problemas-conocidos)
- [Licencia](#licencia)

---

<a id="requisitos"></a>
## 🧰 Requisitos

| Requisito | Detalle |
|---|---|
| **Sistema** | Windows 10/11 (probado). Linux y macOS sirven para desarrollo. |
| **Node.js** | 20 o superior. |
| **Internet** | Solo la primera vez que se empaqueta: electron-builder descarga sus utilidades. |
| **Inno Setup 6** | Necesario para compilar el instalador. El proyecto ya incluye `optica-inno.iss`. |

---

<a id="instalación"></a>
## 🚀 Instalación

```bash
npm install
```

El `postinstall` verifica que Electron se haya descargado completo y lo repara si hace falta (ver [Problemas conocidos](#problemas-conocidos)). Si algo falla:

```bash
npm run reparar-electron
```

---

<a id="ejecutar"></a>
## ▶️ Ejecutar

```bash
npm start      # abre la app
npm run dev    # igual, pero reinicia al cambiar archivos
```

---

<a id="flujo-de-trabajo"></a>
## 🧭 Flujo de trabajo

```text
1. Paciente      →  completa la ficha y guarda (Ctrl+S)
2. Fórmula       →  se genera el PDF automáticamente
3. Impresión     →  botón Imprimir en el aviso o en el listado
```

La edad se recalcula sola al cambiar la **fecha de nacimiento** o la **fecha de la consulta**. Si un paciente antiguo no tiene fecha de nacimiento, se conserva la edad guardada.

---

<a id="dónde-se-guardan-los-datos"></a>
## 🗄️ Dónde se guardan los datos

La base de datos vive en el directorio de datos del usuario, **nunca** dentro de la carpeta del proyecto:

| Sistema | Ruta |
|---|---|
| **Windows** | `%APPDATA%\optica_app\optica.db` |
| **Linux** | `~/.config/optica_app/optica.db` |
| **macOS** | `~/Library/Application Support/optica_app/optica.db` |

Al arrancar por primera vez, si existe una base antigua en `db/optica.db` o en la carpeta de una instalación anterior (`db/` o `resources/app/db/`), se copia automáticamente a esa ruta. Si la nueva app arranca con la base vacía, ofrece importar los datos de la versión anterior.

> [!WARNING]
> **Privacidad:** el repositorio **no** incluye la base de datos. `.gitignore` excluye `db/` y cualquier `*.db`. No subas nunca una base con datos de pacientes: usa *Respaldar datos* y guarda la copia fuera del proyecto.

---

<a id="impresión-y-pdf"></a>
## 🖨️ Impresión y PDF

La fórmula se construye **una sola vez** como HTML y se usa para las dos salidas: el papel y el archivo salen idénticos.

```text
┌─────────────────────────────────────────────┐
│  Fórmula óptica · media carta horizontal    │
│  215,9 × 139,7 mm  ·  8,5 × 5,5 in          │
│  PDF: 612 × 396 pt                          │
└─────────────────────────────────────────────┘
```

| Salida | Cómo |
|---|---|
| **Imprimir** | Botón *Imprimir* en el listado o en el aviso al guardar. Va directo a la **impresora predeterminada**, sin abrir Adobe Reader ni otra aplicación. |
| **PDF** | Al guardar se crea `Documentos/Pacientes Optica/Paciente_<documento>.pdf`. Si las observaciones son muy largas, continúan en una segunda página en lugar de recortarse. |

La cabecera muestra la **fecha de la consulta**, no la de nacimiento.

> [!TIP]
> Si Windows no permite imprimir en silencio (controlador, permisos o impresora ocupada), la app muestra el diálogo del sistema para elegir impresora y confirmar. En *Configuración → Bluetooth y dispositivos → Impresoras y escáneres → [impresora] → Preferencias de impresión*, deja el tamaño de papel en **media carta (8,5 × 5,5 in)**.

La impresión no está atada a una marca ni a una aplicación concreta: se usa la impresora predeterminada del sistema.

### 🎨 Cambiar el diseño de la fórmula

Hay dos variantes: `clasica` (por defecto) y `moderna`. Para cambiar la que usa toda la app, edita `DISENO_POR_DEFECTO` en `js/formula.js`. También puedes pedir una concreta al generar el PDF o imprimir:

```js
generarPDF(datos, documentos, { diseno: 'moderna' });
imprimirFormula(datos, { diseno: 'moderna' });
```

---

<a id="respaldo-y-restauración"></a>
## 💾 Respaldo y restauración

**Crear un respaldo:** pestaña *Pacientes* → *Respaldar datos*. Se abre un diálogo para elegir dónde guardar (por defecto `Documentos`, con nombre `optica-respaldo-AAAA-MM-DD_HHMMSS.db`). Usa `VACUUM INTO`, así que es una copia consistente aunque la app esté abierta.

**Restaurar:**

1. *Pacientes → Importar datos*.
2. Selecciona el archivo de respaldo. La app guarda antes una copia de la base actual.
3. Comprueba el listado.

También se puede restaurar a mano: cierra la app, copia el respaldo sobre `%APPDATA%\optica_app\optica.db` y vuelve a abrirla.

---

<a id="actualizar-sin-perder-datos"></a>
## 🔄 Actualizar sin perder datos

Los pacientes **no** viven dentro de la carpeta de la app: están en `%APPDATA%\optica_app\optica.db`. El instalador no toca esa carpeta, así que actualizar no borra los datos. Aun así, conviene guardar una copia antes.

1. Localiza la base de la versión vieja, normalmente en `<carpeta de la app vieja>\resources\app\db\optica.db`, y cópiala a `Documentos` o a un USB.
2. Cierra la app vieja.
3. Instala la nueva versión con `OpticaApp Setup <versión>.exe`. Si puedes, elige la **misma carpeta**: el instalador la detecta antes de copiar archivos y la pasa a `%APPDATA%\optica_app`. No desinstales la versión vieja hasta comprobar que están todos los pacientes.
4. Abre la nueva app. Si la base está vacía, elige **Importar datos** y selecciona el `optica.db` del paso 1. También puedes hacerlo después en *Pacientes → Importar datos*.
5. Antes de reemplazar, la app guarda la base actual como `optica-antes-de-importar-<fecha>.db` en `%APPDATA%\optica_app\`.
6. Revisa el listado. Si algo salió mal, vuelve a importar el respaldo o la base vieja.

> [!NOTE]
> La importación conserva el historial y migra el esquema antiguo automáticamente (`color` → `altura`, documentos duplicados, índices). En los registros anteriores, si la fecha guardada coincide con la edad (por ejemplo, 2001 con 25 años), se toma como **fecha de nacimiento**; si no, se conserva como **fecha de la consulta**. La edad guardada nunca se pierde y, al editar el paciente, puedes completar la fecha que falte para que la edad se calcule sola.

---

<a id="generar-el-instalador"></a>
## 📦 Generar el instalador

El instalador se compila con **Inno Setup 6**. Primero se empaqueta la app con electron-builder (solo la carpeta, sin NSIS) y después Inno comprime esa carpeta:

```bash
npm run build              # empaqueta + compila el instalador
```

También puedes ejecutar los pasos por separado:

```bash
npm run build:dir          # crea dist/win-unpacked/
npm run build:instalador   # compila dist/OpticaApp Setup <versión>.exe
```

`scripts/crear-instalador.js` busca `ISCC.exe` en las rutas habituales de Inno Setup 6. Si está en otro sitio, define `INNO_SETUP_ISCC` con la ruta completa.

**El instalador:**

- Instala en `{autopf}\OpticaApp` y pide permisos de administrador; con `/CURRENTUSER` se instala solo para el usuario actual.
- Crea accesos directos en el menú Inicio y, opcionalmente, en el escritorio.
- No incluye ni borra bases de datos: los pacientes viven en `%APPDATA%\optica_app\optica.db`.
- Antes de reemplazar archivos, si encuentra una base antigua en la carpeta de instalación (`resources\app\db\optica.db` o `db\optica.db`), la copia a `%APPDATA%\optica_app\optica.db` solo cuando todavía no hay una base nueva.
- El desinstalador no borra `%APPDATA%\optica_app`.

**Antes de compilar, comprueba:**

- No hay ninguna base de datos dentro del proyecto (`db/` está ignorado).
- `build.files` no incluye `db/` ni `test/`.
- Los módulos nativos (`sqlite3`) se descomprimen fuera del `asar` gracias a `asarUnpack`.

Para revisar qué se empaquetó sin instalar nada:

```bash
npm run build:dir
npx @electron/asar list dist/win-unpacked/resources/app.asar
```

---

<a id="scripts"></a>
## 🛠️ Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Abre la app. |
| `npm run dev` | Desarrollo con recarga automática (nodemon). |
| `npm test` | Pruebas con el runner nativo de Node (`node:test`). |
| `npm run build` | Empaqueta y compila el instalador en `dist/`. |
| `npm run build:dir` | Genera la app sin instalador (`dist/win-unpacked/`). |
| `npm run build:instalador` | Compila el instalador Inno desde `dist/win-unpacked/`. |
| `npm run reparar-electron` | Verifica y repara la instalación de Electron. |

---

<a id="estructura-del-proyecto"></a>
## 🧱 Estructura del proyecto

```text
OpticaApp/
├── app/                  HTML y CSS de la interfaz (CSP estricta, sin CDN)
├── images/               Logo e iconos
├── js/
│   ├── main.js           Ciclo de vida de Electron y ventana
│   ├── ipc.js            Canales IPC (validación y errores centralizados)
│   ├── preload.js        Puente seguro con contextIsolation
│   ├── renderer.js       Lógica de la interfaz
│   ├── db.js             Conexión SQLite, ruta en userData, respaldo e importación
│   ├── migraciones.js    Esquema, índices y PRAGMA user_version
│   ├── pacientes.js      Consultas de pacientes (upsert idempotente)
│   ├── validacion.js     Normalización y validación de datos
│   ├── fechas.js         Cálculo de la edad desde la fecha de nacimiento
│   ├── respaldo.js       Nombre y creación del respaldo
│   ├── formula.js        Plantilla HTML de la fórmula (diseños y media carta)
│   ├── pagina.js         Ventana oculta para renderizar con Chromium
│   ├── pdf.js            Generación del PDF con printToPDF
│   └── impresion.js      Impresión directa y diálogo del sistema
├── scripts/
│   ├── verificar-electron.js   Repara instalaciones incompletas de Electron
│   └── crear-instalador.js     Busca ISCC y compila el instalador Inno
├── test/                 Pruebas de validación, datos, migraciones y salidas
├── optica-inno.iss       Script del instalador Inno Setup 6
└── package.json          Dependencias, scripts y configuración de empaquetado
```

---

<a id="pruebas"></a>
## 🧪 Pruebas

```bash
npm test
```

| Área | Qué se comprueba |
|---|---|
| **Validación** | Documento, fechas, edad calculada, teléfono y límites. |
| **Datos** | SQLite real: alta, upsert sin duplicados, actualización, borrado, búsqueda y filtros. |
| **Migraciones** | `color` → `altura`, clasificación de la fecha antigua, duplicados, `UNIQUE`, `user_version` e idempotencia. |
| **Respaldo** | Nombre, copia legible y rechazo de destinos inválidos. |
| **Fórmula** | Media carta horizontal, reparto en dos tablas, encabezado de Refracción, escape de HTML y ambos diseños. |
| **Impresión** | Opciones de media carta, impresión silenciosa y uso de la impresora predeterminada. |
| **Importación** | Validación del archivo SQLite, rechazo de archivos inválidos o en uso, migración y copia previa. |

> [!NOTE]
> Las pruebas usan bases temporales; **nunca** tocan la base real.

---

<a id="problemas-conocidos"></a>
## 🩺 Problemas conocidos

<details>
<summary><strong>“Electron failed to install correctly”</strong></summary>

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

</details>

<details>
<summary><strong><code>sqlite3</code> no carga tras cambiar de versión de Node o Electron</strong></summary>

`sqlite3` 5.x usa N-API, así que normalmente el mismo binario sirve para Node y Electron. Si aparece un error de módulo nativo:

```bash
npm rebuild sqlite3
```

</details>

---

<a id="licencia"></a>
## 📄 Licencia

ISC © Daniel RoMo DEV

<div align="center">

---

Hecho con cariño para **Fashion Vision E y C Óptica, C.A.** 👓

</div>
