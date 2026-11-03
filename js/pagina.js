const { BrowserWindow } = require('electron');

// Ventana invisible para renderizar la fórmula con el motor de Chromium. Se
// usa tanto para generar el PDF como para imprimir: así el papel sale igual
// que el archivo.
function crearVentanaOculta() {
    return new BrowserWindow({
        show: false,
        width: 420,
        height: 640,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true
        }
    });
}

// El HTML se carga como data URL en base64. Evita escribir archivos temporales
// (Windows puede bloquearlos mientras Chromium los tiene abiertos) y conserva
// el documento como un origen opaco, sin acceso al disco.
async function cargarHTML(ventana, html) {
    const datos = Buffer.from(html, 'utf8').toString('base64');
    await ventana.loadURL(`data:text/html;base64,${datos}`);

    // Espera a que el logo termine de decodificarse y a las fuentes.
    await ventana.webContents.executeJavaScript(`
        Promise.all(Array.from(document.images).map((imagen) => {
            if (imagen.complete) return Promise.resolve();
            return new Promise((resolver) => {
                imagen.onload = resolver;
                imagen.onerror = resolver;
            });
        })).then(() => (document.fonts ? document.fonts.ready : null)).then(() => true)
    `);
}

module.exports = { crearVentanaOculta, cargarHTML };
