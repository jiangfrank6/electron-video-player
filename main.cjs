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

  // Listen for miniplayer toggle
  ipcMain.on('toggle-miniplayer', (event, { videoTime, videoSrc }) => {
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

      miniplayerWindow.loadURL(miniplayerUrl.toString());
      miniplayerWindow.setAspectRatio(16/9);
      miniplayerWindow.setMinimumSize(200, 112);

      // Enable window dragging
      miniplayerWindow.webContents.on('did-finish-load', () => {
        miniplayerWindow.webContents.executeJavaScript(`
          document.body.style.webkitAppRegion = 'drag';
          const video = document.querySelector('video');
          if (video) video.style.webkitAppRegion = 'no-drag';
          const controls = document.querySelector('.controls-overlay');
          if (controls) controls.style.webkitAppRegion = 'no-drag';
        `);
      });

      miniplayerWindow.on('closed', () => {
        if (mainWindow) {
          mainWindow.webContents.send('miniplayer-closed');
        }
        miniplayerWindow = null;
      });
    } else {
      miniplayerWindow.close();
      miniplayerWindow = null;
    }
  });

  // Handle window dragging
  ipcMain.on('move-miniplayer', (event, { deltaX, deltaY }) => {
    if (!miniplayerWindow) return;
    
    const [x, y] = miniplayerWindow.getPosition();
    miniplayerWindow.setPosition(x + deltaX, y + deltaY);
  });

  // Handle video source synchronization
  ipcMain.on('request-video-source', (event) => {
    mainWindow.webContents.send('request-video-source');
  });

  ipcMain.on('video-source', (event, source) => {
    if (miniplayerWindow) {
      miniplayerWindow.webContents.send('video-source', source);
    }
  });

  // Handle time synchronization
  ipcMain.on('update-main-player-time', (event, time) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-time', time);
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