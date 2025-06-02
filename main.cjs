const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

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
    try {
      if (miniplayerWindow) {
        const [x, y] = miniplayerWindow.getPosition();
        return [Math.round(x), Math.round(y)];
      }
      return [0, 0];
    } catch (error) {
      console.error('Error getting window position:', error);
      return [0, 0];
    }
  });

  // Set window position
  ipcMain.on('set-miniplayer-position', (event, { x, y }) => {
    try {
      if (miniplayerWindow) {
        const roundedX = Math.round(x);
        const roundedY = Math.round(y);
        miniplayerWindow.setPosition(roundedX, roundedY);
      }
    } catch (error) {
      console.error('Error setting window position:', error);
    }
  });

  // Add screen dimensions handler
  ipcMain.handle('get-screen-dimensions', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    return [width, height];
  });

  // Listen for miniplayer toggle
  ipcMain.on('toggle-miniplayer', (event, { videoTime, videoSrc, isPlaying, position }) => {
    if (!miniplayerWindow) {
      miniplayerWindow = new BrowserWindow({
        width: 320,
        height: 180,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      // Set initial position if provided
      if (position) {
        miniplayerWindow.setPosition(position.x, position.y);
      }

      const miniplayerUrl = process.env.NODE_ENV !== 'production'
        ? `http://localhost:5173?miniplayer=true&videoSrc=${encodeURIComponent(videoSrc)}&time=${videoTime}&isPlaying=${isPlaying}`
        : `file://${path.join(__dirname, 'dist/index.html')}?miniplayer=true&videoSrc=${encodeURIComponent(videoSrc)}&time=${videoTime}&isPlaying=${isPlaying}`;

      miniplayerWindow.loadURL(miniplayerUrl);

      miniplayerWindow.on('closed', () => {
        miniplayerWindow = null;
      });
    } else {
      if (miniplayerWindow) {
        miniplayerWindow.close();
        miniplayerWindow = null;
      }
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