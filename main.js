const { app, BrowserWindow, ipcMain, screen, Menu, dialog } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize();

let mainWindow;
let miniplayerWindow;

// Debug function
function logWindowState(window, name) {
  if (!window) {
    console.log(`${name} window is null`);
    return;
  }
  console.log(`${name} window state:`, {
    isVisible: window.isVisible(),
    isMinimized: window.isMinimized(),
    isMaximized: window.isMaximized(),
    bounds: window.getBounds()
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: true
    }
  });

  // Create the menu
  const template = [
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Command+Option+I' : 'Ctrl+Shift+I',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Enable remote module for this window
  require('@electron/remote/main').enable(mainWindow.webContents);

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' blob: data: mediastream: filesystem: 'unsafe-inline' 'unsafe-eval' devtools:"]
      }
    });
  });

  // Set CSP in meta tag
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.executeJavaScript(`
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = "default-src 'self' blob: data: mediastream: filesystem: 'unsafe-inline' 'unsafe-eval'";
      document.head.appendChild(meta);
    `);
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the index.html file
    mainWindow.loadFile('dist/index.html');
  }

  // Handle miniplayer toggle
  ipcMain.on('toggle-miniplayer', (event, data) => {
    console.log('Received toggle-miniplayer event with data:', data);
    logWindowState(mainWindow, 'Main');
    logWindowState(miniplayerWindow, 'Miniplayer');

    if (!miniplayerWindow) {
      console.log('Creating new miniplayer window');
      try {
        // Create miniplayer window
        miniplayerWindow = new BrowserWindow({
          width: 320,
          height: 180,
          frame: false,
          resizable: true,
          alwaysOnTop: true,
          backgroundColor: '#000000',
          show: false, // Don't show until ready
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            webSecurity: true,
            devTools: true
          }
        });

        require('@electron/remote/main').enable(miniplayerWindow.webContents);

        // Set initial position if provided
        if (data.position) {
          console.log('Setting initial position:', data.position);
          miniplayerWindow.setPosition(data.position.x, data.position.y);
        }

        // Construct miniplayer URL
        const miniplayerUrl = process.env.NODE_ENV !== 'production'
          ? new URL(`http://localhost:${devServerPort}`)
          : new URL(`file://${path.join(__dirname, 'dist/index.html')}`);

        // Add query parameters
        miniplayerUrl.searchParams.set('miniplayer', 'true');
        miniplayerUrl.searchParams.set('videoSrc', data.videoSrc);
        miniplayerUrl.searchParams.set('time', data.videoTime.toString());
        miniplayerUrl.searchParams.set('isPlaying', data.isPlaying.toString());

        console.log('Loading miniplayer with URL:', miniplayerUrl.toString());
        miniplayerWindow.loadURL(miniplayerUrl.toString());

        // Show window when ready
        miniplayerWindow.once('ready-to-show', () => {
          console.log('Miniplayer ready to show');
          miniplayerWindow.show();
          logWindowState(miniplayerWindow, 'Miniplayer after show');
        });

        // Debug events
        miniplayerWindow.webContents.on('did-start-loading', () => {
          console.log('Miniplayer started loading');
        });

        miniplayerWindow.webContents.on('did-finish-load', () => {
          console.log('Miniplayer finished loading');
        });

        miniplayerWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
          console.error('Miniplayer failed to load:', { errorCode, errorDescription });
        });

        // Open DevTools for miniplayer in development
        if (process.env.NODE_ENV === 'development') {
          miniplayerWindow.webContents.openDevTools({ mode: 'detach' });
        }

        miniplayerWindow.on('closed', () => {
          console.log('Miniplayer window closed');
          miniplayerWindow = null;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('miniplayer-closed');
          }
        });

      } catch (error) {
        console.error('Error creating miniplayer window:', error);
      }
    } else {
      console.log('Closing existing miniplayer window');
      miniplayerWindow.close();
      miniplayerWindow = null;
    }
  });

  // Handle miniplayer position updates
  ipcMain.on('set-miniplayer-position', (event, { x, y }) => {
    console.log('Setting miniplayer position:', x, y);
    if (miniplayerWindow) {
      miniplayerWindow.setPosition(x, y);
    }
  });

  // Handle screen dimension requests
  ipcMain.handle('get-screen-dimensions', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const dimensions = [primaryDisplay.workAreaSize.width, primaryDisplay.workAreaSize.height];
    console.log('Screen dimensions:', dimensions);
    return dimensions;
  });

  // Handle window position requests
  ipcMain.handle('get-window-position', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    const position = win ? win.getPosition() : null;
    console.log('Window position:', position);
    return position;
  });

  // Handle window size requests
  ipcMain.handle('get-window-size', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    const size = win ? win.getSize() : null;
    console.log('Window size:', size);
    return size;
  });

  // Handle miniplayer resize
  ipcMain.on('resize-miniplayer', (event, { width, height }) => {
    console.log('Resizing miniplayer:', width, height);
    if (miniplayerWindow) {
      miniplayerWindow.setSize(width, height);
    }
  });

  // Check if miniplayer exists
  ipcMain.on('check-miniplayer-exists', (event) => {
    event.returnValue = miniplayerWindow !== null;
  });

  // Handle aspect ratio updates
  ipcMain.on('update-aspect-ratio', (event, { aspectRatio }) => {
    console.log('Updating aspect ratio:', aspectRatio);
    if (miniplayerWindow) {
      const [width] = miniplayerWindow.getSize();
      const height = Math.round(width / aspectRatio);
      miniplayerWindow.setSize(width, height);
    }
  });

  // Sync time between windows
  ipcMain.on('sync-time', (event, { time }) => {
    const sender = event.sender.getOwnerBrowserWindow();
    const targetWindow = sender === mainWindow ? miniplayerWindow : mainWindow;
    if (targetWindow && !targetWindow.isDestroyed()) {
      console.log('Syncing time:', time);
      targetWindow.webContents.send('sync-time', { time });
    }
  });

  // Debug IPC communication
  ipcMain.on('ipc-debug', (event, message) => {
    console.log('IPC Debug:', message);
  });

  // Add new handler for miniplayer ready state
  ipcMain.on('miniplayer-ready', (event) => {
    console.log('Miniplayer reported ready');
    if (miniplayerWindow && event.sender === miniplayerWindow.webContents) {
      miniplayerWindow.show();
    }
  });

  // Add handler for video errors in miniplayer
  ipcMain.on('miniplayer-video-error', (event, error) => {
    console.error('Miniplayer video error:', error);
  });

  // Handle miniplayer source updates
  ipcMain.on('update-miniplayer-source', (event, { videoSrc, time, isPlaying }) => {
    console.log('Updating miniplayer source:', { videoSrc, time, isPlaying });
    if (miniplayerWindow && !miniplayerWindow.isDestroyed()) {
      const url = new URL(miniplayerWindow.webContents.getURL());
      url.searchParams.set('videoSrc', videoSrc);
      url.searchParams.set('time', time.toString());
      url.searchParams.set('isPlaying', isPlaying.toString());
      console.log('Loading new URL in miniplayer:', url.toString());
      miniplayerWindow.loadURL(url.toString());
    }
  });

  // Add new handler for showing error dialogs
  ipcMain.on('show-error', (event, { title, message }) => {
    dialog.showErrorBox(title, message);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 