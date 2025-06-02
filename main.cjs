const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let miniplayerWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the app
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile('dist/index.html');
  }

  // Handle time synchronization
  ipcMain.on('sync-time', (event, { time }) => {
    // Only sync from main to miniplayer
    if (event.sender === mainWindow?.webContents && miniplayerWindow) {
      miniplayerWindow.webContents.send('sync-time', { time });
    }
  });

  // Handle miniplayer closing state
  ipcMain.on('miniplayer-closing', (event, { time, isPlaying }) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-from-miniplayer', { time, isPlaying });
    }
  });

  // Get window position
  ipcMain.handle('get-window-position', (event) => {
    if (miniplayerWindow) {
      return miniplayerWindow.getPosition();
    }
    return [0, 0];
  });

  // Set window position
  ipcMain.on('set-miniplayer-position', (event, { x, y }) => {
    if (miniplayerWindow) {
      miniplayerWindow.setPosition(Math.round(x), Math.round(y));
    }
  });

  // Listen for miniplayer toggle
  ipcMain.on('toggle-miniplayer', (event, { videoTime, videoSrc, isPlaying }) => {
    if (!miniplayerWindow) {
      // Create miniplayer window
      miniplayerWindow = new BrowserWindow({
        width: 320,
        height: 180,
        alwaysOnTop: true,
        frame: false,
        resizable: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      const miniplayerUrl = new URL(process.env.NODE_ENV !== 'production' 
        ? 'http://localhost:5173' 
        : `file://${path.join(__dirname, 'dist/index.html')}`);
      
      miniplayerUrl.searchParams.set('miniplayer', 'true');
      miniplayerUrl.searchParams.set('time', videoTime);
      miniplayerUrl.searchParams.set('videoSrc', encodeURIComponent(videoSrc));
      miniplayerUrl.searchParams.set('isPlaying', isPlaying);

      miniplayerWindow.loadURL(miniplayerUrl.toString());
      miniplayerWindow.setAspectRatio(16/9);
      miniplayerWindow.setMinimumSize(200, 112);

      miniplayerWindow.on('closed', () => {
        miniplayerWindow = null;
      });
    } else {
      miniplayerWindow.close();
      miniplayerWindow = null;
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 