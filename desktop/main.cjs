// Startet das Spiel als eigenes Programmfenster (Electron).
const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');

// Eigene Adresse app://cosy/ – damit funktionieren die Spielmodule und der
// Spielstand (localStorage) bleibt über Updates hinweg erhalten.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function serve(request) {
  let file = decodeURIComponent(new URL(request.url).pathname);
  if (file === '/' || file === '') file = '/index.html';
  const full = path.join(ROOT, file);
  if (!full.startsWith(ROOT)) return new Response('Nicht erlaubt', { status: 403 });
  return net.fetch(pathToFileURL(full).toString());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 360,
    backgroundColor: '#1b1730',
    title: 'Cosy',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  win.removeMenu();
  // F11 schaltet Vollbild um
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  win.loadURL('app://cosy/');
}

app.whenReady().then(() => {
  protocol.handle('app', serve);
  createWindow();
});

app.on('window-all-closed', () => app.quit());
