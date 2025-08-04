const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { PythonShell } = require('python-shell');
const xlsx = require('xlsx');

let store; 

async function createWindow() {
  const { default: Store } = await import('electron-store');
  store = new Store();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'sparchive_logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL('http://localhost:3000');
  win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

ipcMain.on('packager:start', (event, datasetId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const outputDir = path.join(app.getPath('userData'), 'sparc_archives');
  fs.mkdirSync(outputDir, { recursive: true });

  const options = {
    mode: 'text',
    pythonPath: path.join(app.getAppPath(), '..', 'packager', 'venv', 'bin', 'python'),
    pythonOptions: ['-u'],
    scriptPath: path.join(app.getAppPath(), 'scripts'),
    args: [datasetId, outputDir],
  };

  const pyshell = new PythonShell('packager.py', options);

  pyshell.on('message', (message) => {
    try {
      const progress = JSON.parse(message);
      win.webContents.send('packager:progress', progress);
      if (progress.status === 'done') {
        const library = store.get('library', []);
        const newEntry = {
            id: progress.value.manifest.dataset_id,
            title: progress.value.manifest.dataset_title,
            path: progress.value.path,
            thumbnail: progress.value.manifest.thumbnail,
        };
        const existingIndex = library.findIndex(item => item.id === newEntry.id);
        if (existingIndex > -1) {
            library[existingIndex] = newEntry;
        } else {
            library.unshift(newEntry);
        }
        store.set('library', library);
      }
    } catch (e) { /* Ignore non-json messages */ }
  });

  pyshell.on('stderr', (stderr) => {
    win.webContents.send('packager:progress', { status: 'error', message: `Python Error: ${stderr}` });
  });
});

ipcMain.handle('library:get', () => store.get('library', []));
ipcMain.handle('sparc:getManifest', (event, filePath) => { try { const zip = new AdmZip(filePath); const manifestEntry = zip.getEntry('viewer_manifest.json'); return manifestEntry ? JSON.parse(manifestEntry.getData().toString('utf8')) : null; } catch (e) { return null; } });
ipcMain.handle('sparc:getFileContent', (event, packagePath, internalPath) => { try { const zip = new AdmZip(packagePath); const fileEntry = zip.getEntry(internalPath); if (!fileEntry) return null; const buffer = fileEntry.getData(); const extension = path.extname(internalPath).toLowerCase(); const imageMimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' }; if (imageMimeTypes[extension]) return { type: 'image', mimeType: imageMimeTypes[extension], data: buffer.toString('base64') }; if (['.json', '.txt', '.md'].includes(extension)) return { type: 'text', data: buffer.toString('utf8') }; if (['.csv', '.tsv', '.xlsx'].includes(extension)) { let workbook; if (extension === '.xlsx') { workbook = xlsx.read(buffer, { type: 'buffer' }); } else { const textData = buffer.toString('utf8'); const delimiter = extension === '.tsv' ? '\t' : ','; workbook = xlsx.read(textData, { type: 'string', delimiter }); } const sheetName = workbook.SheetNames[0]; const worksheet = workbook.Sheets[sheetName]; const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }); if (jsonData.length === 0) return { type: 'table', columns: [], rows: [] }; const columns = jsonData[0].map((header, index) => ({ key: `col_${index}`, name: String(header) })); const rows = jsonData.slice(1).map(row => { const rowObject = {}; columns.forEach((col, index) => { rowObject[col.key] = row[index]; }); return rowObject; }); return { type: 'table', columns, rows }; } return { type: 'unsupported' }; } catch (e) { console.error("Error getting file content:", e); return null; } });
ipcMain.handle('sparc:downloadSingleFile', async (event, packagePath, internalPath, defaultFileName) => { const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: defaultFileName }); if (!canceled && filePath) { try { const zip = new AdmZip(packagePath); const fileEntry = zip.getEntry(internalPath); if (fileEntry) { fs.writeFileSync(filePath, fileEntry.getData()); return { success: true }; } } catch (e) { return { success: false, error: e.message }; } } return { success: false, error: 'Save canceled' }; });
