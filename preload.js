const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getConfig : ()        => ipcRenderer.invoke('config:get'),
  saveLinks : links     => ipcRenderer.invoke('config:save', links),
  checkPass : pass      => ipcRenderer.invoke('pass:check', pass)
});


