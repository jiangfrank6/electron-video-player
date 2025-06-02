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

  // Get window size
  ipcMain.handle('get-window-size', (event) => {
    try {
      if (miniplayerWindow) {
        const [width, height] = miniplayerWindow.getSize();
        return { width, height };
      }
      return { width: 320, height: 180 };
    } catch (error) {
      console.error('Error getting window size:', error);
      return { width: 320, height: 180 };
    }
  });

  // Get screen dimensions
  ipcMain.handle('get-screen-dimensions', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    return [width, height];
  });

  // Check if window has focus
  ipcMain.handle('has-window-focus', (event) => {
    try {
      // Check which window the event came from
      if (event.sender === mainWindow?.webContents) {
        return mainWindow.isFocused();
      } else if (event.sender === miniplayerWindow?.webContents) {
        return miniplayerWindow.isFocused();
      }
      return false;
    } catch (error) {
      console.error('Error checking window focus:', error);
      return false;
    }
  });

  // Handle window resizing
  ipcMain.on('resize-miniplayer', (event, { width, height }) => {
    try {
      if (miniplayerWindow) {
        const newWidth = Math.max(200, Math.round(width));
        const newHeight = Math.round(height); // Height will be automatically adjusted by aspect ratio
        miniplayerWindow.setSize(newWidth, newHeight);
      }
    } catch (error) {
      console.error('Error resizing window:', error);
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

  // Listen for miniplayer toggle
  ipcMain.on('toggle-miniplayer', (event, { videoTime, videoSrc, isPlaying, position }) => {
    if (!miniplayerWindow) {
      miniplayerWindow = new BrowserWindow({
        width: 320,
        height: 180,
        frame: false,
        resizable: true,
        minWidth: 200,  // Base minimum width
        minHeight: 112, // Will be adjusted based on video aspect ratio
        alwaysOnTop: true,
        hasShadow: true,
        level: 'floating',
        focusable: true,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      miniplayerWindow.setAspectRatio(16/9); // Default aspect ratio, will be updated when video loads

      miniplayerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

      if (position) {
        miniplayerWindow.setPosition(position.x, position.y);
      }

      const miniplayerUrl = process.env.NODE_ENV !== 'production'
        ? `http://localhost:5173?miniplayer=true&videoSrc=${encodeURIComponent(videoSrc)}&time=${videoTime}&isPlaying=${isPlaying}`
        : `file://${path.join(__dirname, 'dist/index.html')}?miniplayer=true&videoSrc=${encodeURIComponent(videoSrc)}&time=${videoTime}&isPlaying=${isPlaying}`;

      miniplayerWindow.loadURL(miniplayerUrl);
      miniplayerWindow.focus();

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

  // Update aspect ratio
  ipcMain.on('update-aspect-ratio', (event, { aspectRatio }) => {
    try {
      if (miniplayerWindow) {
        miniplayerWindow.setAspectRatio(aspectRatio);
        // Update minimum height based on minimum width and aspect ratio
        const minHeight = Math.round(200 / aspectRatio); // 200 is minWidth
        miniplayerWindow.setMinimumSize(200, minHeight);
      }
    } catch (error) {
      console.error('Error updating aspect ratio:', error);
    }
  });

  // Check if miniplayer exists (synchronous)
  ipcMain.on('check-miniplayer-exists', (event) => {
    event.returnValue = miniplayerWindow !== null;
  });

  // Forward miniplayer time updates to main window
  ipcMain.on('miniplayer-time-update', (event, data) => {
    if (mainWindow) {
      mainWindow.webContents.send('miniplayer-time-update', data);
    }
  });

  // Forward miniplayer play state to main window
  ipcMain.on('miniplayer-play-state', (event, data) => {
    if (mainWindow) {
      mainWindow.webContents.send('miniplayer-play-state', data);
    }
  });

  // Check if miniplayer exists
  ipcMain.handle('is-miniplayer-open', () => {
    return miniplayerWindow !== null;
  });

  // Focus miniplayer window
  ipcMain.on('focus-miniplayer', () => {
    if (miniplayerWindow) {
      miniplayerWindow.focus();
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