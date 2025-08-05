const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // The 'openExternalLink' function has been removed as it's no longer needed.
  
  uploadToLibrary: () => ipcRenderer.invoke('library:upload'),
  browseDatasets: (params) => ipcRenderer.invoke('sparc:browse', params),
  getManifest: (filePath) => ipcRenderer.invoke('sparc:getManifest', filePath),
  getFileContent: (packagePath, internalPath) => ipcRenderer.invoke('sparc:getFileContent', packagePath, internalPath),
  startPackaging: (datasetId) => ipcRenderer.send('packager:start', datasetId),
  onPackagingProgress: (callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on('packager:progress', listener);
    return () => ipcRenderer.removeListener('packager:progress', listener);
  },
  confirmPackaging: (confirmed) => ipcRenderer.send('packager:confirm', confirmed),
  getLibrary: () => ipcRenderer.invoke('library:get'),
  deleteDataset: (datasetId) => ipcRenderer.invoke('library:delete', datasetId),
  openDatasetLocation: (filePath) => ipcRenderer.send('library:open-location', filePath),
  downloadSingleFile: (packagePath, internalPath, defaultFileName) => ipcRenderer.invoke('sparc:downloadSingleFile', packagePath, internalPath, defaultFileName),
});
