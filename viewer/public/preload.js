const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getManifest: (filePath) => ipcRenderer.invoke('sparc:getManifest', filePath),
  getFileContent: (packagePath, internalPath) => ipcRenderer.invoke('sparc:getFileContent', packagePath, internalPath),
  startPackaging: (datasetId) => ipcRenderer.send('packager:start', datasetId),
  onPackagingProgress: (callback) => {
    const listener = (event, ...args) => callback(...args);
    ipcRenderer.on('packager:progress', listener);
    return () => ipcRenderer.removeListener('packager:progress', listener);
  },
  getLibrary: () => ipcRenderer.invoke('library:get'),
  // Expose the new delete function
  deleteDataset: (datasetId) => ipcRenderer.invoke('library:delete', datasetId),
  downloadSingleFile: (packagePath, internalPath, defaultFileName) => ipcRenderer.invoke('sparc:downloadSingleFile', packagePath, internalPath, defaultFileName),
});
