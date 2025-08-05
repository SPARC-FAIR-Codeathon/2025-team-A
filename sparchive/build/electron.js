const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { PythonShell } = require('python-shell');
const xlsx = require('xlsx');
const { spawn } = require('child_process');

let store;
let activePackagerShell = null;

// This helper function now correctly handles running either the Python script in development
// or the compiled executable in the packaged application.
function runBackendProcess(args, onMessage, onError, onComplete) {
    // FIX: The local variable is renamed to 'childProcess' to avoid shadowing the global 'process' object.
    let childProcess;

    if (app.isPackaged) {
        // --- PRODUCTION MODE ---
        // The code below now correctly accesses the global 'process' object for 'platform' and 'resourcesPath'.
        const execName = process.platform === 'win32' ? 'packager.exe' : 'packager';
        const executablePath = path.join(process.resourcesPath, 'bin', execName);
        
        childProcess = spawn(executablePath, args);

        childProcess.stdout.on('data', (data) => {
            const messages = data.toString().split('\n').filter(msg => msg.trim().length > 0);
            messages.forEach(msg => onMessage(msg));
        });

    } else {
        // --- DEVELOPMENT MODE ---
        const pythonExecutable = process.platform === 'win32' ? 'python.exe' : 'python';
        const venvPath = path.join(__dirname, '..', 'packager', 'venv', 'bin', pythonExecutable);
        const options = {
            mode: 'text',
            pythonPath: venvPath,
            pythonOptions: ['-u'],
            scriptPath: path.join(__dirname, '..', 'scripts'),
            args: args
        };
        
        childProcess = new PythonShell('packager.py', options);
        childProcess.on('message', onMessage);
    }

    // --- COMMON EVENT HANDLERS ---
    childProcess.stderr.on('data', (data) => {
        onError(data.toString());
    });

    childProcess.on('close', (code) => {
        if (onComplete) {
            onComplete(code);
        }
    });
    
    return childProcess;
}


async function createWindow() {
  const isDev = (await import('electron-is-dev')).default;
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

  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
  
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

ipcMain.handle('sparc:browse', async (event, { query, page, limit }) => {
    return new Promise((resolve, reject) => {
        const scriptArgs = ['browse', '--query', query, '--page', String(page), '--limit', String(limit)];
        let output = '';

        runBackendProcess(
            scriptArgs,
            (message) => {
                output += message;
            },
            (error) => {
                console.error("Browse Error (stderr):", error);
                // Reject with the actual error so the frontend can display it
                reject(new Error(error));
            },
            (code) => {
                if (code === 0) {
                    try {
                        const parsedResult = JSON.parse(output);
                        if (parsedResult.error) {
                           reject(new Error(parsedResult.error));
                        } else {
                           resolve(parsedResult);
                        }
                    } catch (e) {
                        reject(new Error("Failed to parse JSON from Python script."));
                    }
                } else {
                    // Include the output in the rejection for better debugging
                    reject(new Error(`Python script exited with code ${code}. Output: ${output}`));
                }
            }
        );
    });
});

ipcMain.on('packager:start', (event, datasetId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  
  const library = store.get('library', []);
  const existingDataset = library.find(item => String(item.id) === String(datasetId));
  if (existingDataset) {
    win.webContents.send('packager:progress', { status: 'exists', message: `Dataset ${datasetId} is already in your library.` });
    return;
  }

  const outputDir = path.join(app.getPath('userData'), 'sparc_archives');
  fs.mkdirSync(outputDir, { recursive: true });

  const scriptArgs = ['package', datasetId, outputDir];

  if (activePackagerShell) {
      if (activePackagerShell.kill) activePackagerShell.kill();
      else if (activePackagerShell.terminate) activePackagerShell.terminate();
  }
  
  activePackagerShell = runBackendProcess(
      scriptArgs,
      (message) => { // onMessage
        try {
            const progress = JSON.parse(message);
            win.webContents.send('packager:progress', progress);
            if (progress.status === 'done') {
                const currentLibrary = store.get('library', []);
                const newEntry = {
                    id: progress.value.manifest.dataset_id,
                    title: progress.value.manifest.dataset_title,
                    authors: progress.value.manifest.authors,
                    path: progress.value.path,
                    thumbnail: progress.value.manifest.thumbnail,
                };
                const existingIndex = currentLibrary.findIndex(item => item.id === newEntry.id);
                if (existingIndex > -1) {
                    currentLibrary[existingIndex] = newEntry;
                } else {
                    currentLibrary.unshift(newEntry);
                }
                store.set('library', currentLibrary);
            }
        } catch (e) {
            console.warn("Received non-JSON message from backend:", message);
        }
      },
      (error) => { // onError
        const isHarmless = error.includes('pkg_resources is deprecated') || error.includes('declare_namespace') || error.includes('SciCrunch API Key: Not Found');
        if (!isHarmless) {
            win.webContents.send('packager:progress', { status: 'error', message: `Python Error: ${error}` });
        }
      },
      () => { // onComplete
        activePackagerShell = null;
      }
  );
});


ipcMain.handle('library:upload', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import .sparchive File',
    buttonLabel: 'Import',
    filters: [{ name: 'spARCHIVE files', extensions: ['sparchive'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) {
    return { status: 'canceled' };
  }

  const sourcePath = filePaths[0];
  const outputDir = path.join(app.getPath('userData'), 'sparc_archives');
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const zip = new AdmZip(sourcePath);
    const manifestEntry = zip.getEntry('viewer_manifest.json');
    if (!manifestEntry) {
      return { status: 'error', message: 'Invalid archive: viewer_manifest.json not found.' };
    }
    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    const datasetId = manifest.dataset_id;

    if (!datasetId) {
        return { status: 'error', message: 'Invalid manifest: dataset_id is missing.' };
    }

    const library = store.get('library', []);
    const existingDataset = library.find(item => String(item.id) === String(datasetId));
    if (existingDataset) {
      return { status: 'exists', message: `Dataset ${datasetId} is already in your library.` };
    }

    const destPath = path.join(outputDir, `${datasetId}.sparchive`);
    fs.copyFileSync(sourcePath, destPath);

    const newEntry = {
      id: manifest.dataset_id,
      title: manifest.dataset_title,
      authors: manifest.authors,
      path: destPath,
      thumbnail: manifest.thumbnail,
    };
    library.unshift(newEntry);
    store.set('library', library);

    return { status: 'success', message: 'Dataset imported successfully!', library };

  } catch (e) {
    console.error("Error importing dataset:", e);
    return { status: 'error', message: e.message || 'Could not read or import the selected file.' };
  }
});

ipcMain.on('packager:confirm', (event, confirmed) => {
  if (activePackagerShell) {
    activePackagerShell.stdin.write(confirmed ? 'confirm\n' : 'cancel\n');
  }
});

ipcMain.handle('library:get', () => store.get('library', []));

ipcMain.handle('library:delete', (event, datasetId) => {
  try {
    const library = store.get('library', []);
    const datasetToDelete = library.find(item => item.id === datasetId);
    if (datasetToDelete && fs.existsSync(datasetToDelete.path)) {
      fs.unlinkSync(datasetToDelete.path);
    }
    const updatedLibrary = library.filter(item => item.id !== datasetId);
    store.set('library', updatedLibrary);
    return updatedLibrary;
  } catch (e) {
    console.error("Error deleting dataset:", e);
    return store.get('library', []);
  }
});

ipcMain.on('library:open-location', (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  }
});

ipcMain.handle('sparc:getManifest', (event, filePath) => { try { const zip = new AdmZip(filePath); const manifestEntry = zip.getEntry('viewer_manifest.json'); return manifestEntry ? JSON.parse(manifestEntry.getData().toString('utf8')) : null; } catch (e) { return null; } });
ipcMain.handle('sparc:getFileContent', (event, packagePath, internalPath) => { try { const zip = new AdmZip(packagePath); const fileEntry = zip.getEntry(internalPath); if (!fileEntry) return null; const buffer = fileEntry.getData(); const extension = path.extname(internalPath).toLowerCase(); const imageMimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml' }; if (imageMimeTypes[extension]) return { type: 'image', mimeType: imageMimeTypes[extension], data: buffer.toString('base64') }; if (['.json', '.txt', '.md'].includes(extension)) return { type: 'text', data: buffer.toString('utf8') }; if (['.csv', '.tsv', '.xlsx'].includes(extension)) { let workbook; if (extension === '.xlsx') { workbook = xlsx.read(buffer, { type: 'buffer' }); } else { const textData = buffer.toString('utf8'); const delimiter = extension === '.tsv' ? '\t' : ','; workbook = xlsx.read(textData, { type: 'string', delimiter }); } const sheetName = workbook.SheetNames[0]; const worksheet = workbook.Sheets[sheetName]; const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 }); if (jsonData.length === 0) return { type: 'table', columns: [], rows: [] }; const columns = jsonData[0].map((header, index) => ({ key: `col_${index}`, name: String(header ?? '') })); const rows = jsonData.slice(1).map(row => { const rowObject = {}; columns.forEach((col, index) => { rowObject[col.key] = row[index]; }); return rowObject; }); return { type: 'table', columns, rows }; } return { type: 'unsupported' }; } catch (e) { console.error("Error getting file content:", e); return null; } });
ipcMain.handle('sparc:downloadSingleFile', async (event, packagePath, internalPath, defaultFileName) => { const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: defaultFileName }); if (!canceled && filePath) { try { const zip = new AdmZip(packagePath); const fileEntry = zip.getEntry(internalPath); if (fileEntry) { fs.writeFileSync(filePath, fileEntry.getData()); return { success: true }; } } catch (e) { return { success: false, error: e.message }; } } return { success: false, error: 'Save canceled' }; });
