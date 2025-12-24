const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path   = require('path');
const Store  = require('electron-store');
const Crypto = require('crypto-js');

app.commandLine.appendSwitch('ozone-platform', 'wayland');
app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations,WaylandIme');
app.disableHardwareAcceleration();                // на слабых GPU
app.commandLine.appendSwitch('touch-events','enabled');

const store = new Store({
  name: 'rms-web-config',
  defaults: {
    passwordHash: Crypto.SHA256('admin').toString(),
    links: [
      { title: 'Яндекс', url: 'https://ya.ru/' },
      { title: 'RMS',    url: 'https://rms-group.ru/' }
    ]
  }
});

function createWindow () {
  const win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    backgroundColor: '#e7e9fa',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  //win.webContents.openDevTools({ mode: 'detach' });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
}

app.whenReady().then(createWindow);

// ── IPC для рендера ──────────────────────────────────────────
ipcMain.handle('config:get',  ()         => store.store);
ipcMain.handle('config:save', (_, links) => store.set('links', links));
ipcMain.handle('pass:check',  (_, pass) =>
  Crypto.SHA256(pass).toString() === store.get('passwordHash'));
