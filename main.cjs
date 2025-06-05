const { app, BrowserWindow, ipcMain, screen, Menu, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';
require('@electron/remote/main').initialize();

let mainWindow = null;
let miniplayerWindow = null;
let devServerPort = 5173;

// Track the dev server port
ipcMain.on('update-dev-server-port', (event, port) => {
  devServerPort = port;
});

// Store temporary subtitle directories and their contents
const tempSubtitleDirs = new Set();
const subtitleContents = new Map();

// Subtitle extraction IPC handler
ipcMain.handle('extract-subtitles', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'python', 'test_subtitle_extraction.py');
    const pythonProcess = spawn('python3', [scriptPath, filePath]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('Python stdout:', output);
      
      // Check for temporary directory path
      const tempDirMatch = output.match(/TEMP_DIR:(.+)/);
      if (tempDirMatch) {
        const tempDir = tempDirMatch[1].trim();
        tempSubtitleDirs.add(tempDir);
      }

      // Check for results
      const resultsMatch = output.match(/RESULTS:(.+)/);
      if (resultsMatch) {
        try {
          const results = JSON.parse(resultsMatch[1]);
          // Store subtitle contents
          results.forEach(result => {
            if (result.status === 'success' && result.contents) {
              subtitleContents.set(result.output_file, result.contents);
            }
          });
        } catch (error) {
          console.error('Error parsing subtitle results:', error);
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      console.log('Python process exited with code:', code);
      if (code === 0) {
        try {
          // Parse the output directory from the Python script's output
          const tempDirMatch = stdout.match(/TEMP_DIR:(.+)/);
          if (!tempDirMatch) {
            resolve({ success: false, error: 'No temporary directory found in output' });
            return;
          }
          
          const tempDir = tempDirMatch[1].trim();
          const summaryFile = path.join(tempDir, 'extraction_summary.txt');
          
          // Read the summary file to get the extraction results
          const fs = require('fs');
          if (fs.existsSync(summaryFile)) {
            const summary = fs.readFileSync(summaryFile, 'utf8');
            const tracks = [];
            
            // Parse the summary file to extract track information
            const lines = summary.split('\n');
            let currentTrack = null;
            
            for (const line of lines) {
              if (line.startsWith('Stream #')) {
                if (currentTrack) {
                  tracks.push(currentTrack);
                }
                currentTrack = {
                  stream_index: parseInt(line.match(/Stream #(\d+)/)[1]),
                  language: 'unknown',
                  title: 'No title',
                  output_file: null,
                  contents: null
                };
              } else if (line.includes('Language:')) {
                currentTrack.language = line.split('Language:')[1].trim();
              } else if (line.includes('Title:')) {
                currentTrack.title = line.split('Title:')[1].trim();
              } else if (line.includes('Output File:')) {
                const filename = line.split('Output File:')[1].trim();
                const outputFile = path.join(tempDir, filename);
                currentTrack.output_file = outputFile;
                // Add contents if available
                if (subtitleContents.has(outputFile)) {
                  currentTrack.contents = subtitleContents.get(outputFile);
                }
              }
            }
            
            if (currentTrack) {
              tracks.push(currentTrack);
            }

            // Get the results from Python output
            const resultsMatch = stdout.match(/RESULTS:(.+)/);
            if (resultsMatch) {
              try {
                const results = JSON.parse(resultsMatch[1]);
                // Update tracks with contents from Python results
                tracks.forEach(track => {
                  const matchingResult = results.find(r => 
                    r.status === 'success' && 
                    r.stream_index === track.stream_index
                  );
                  if (matchingResult && matchingResult.contents) {
                    track.contents = matchingResult.contents;
                  }
                });
              } catch (error) {
                console.error('Error parsing subtitle results:', error);
              }
            }
            
            resolve({ success: true, tracks });
          } else {
            resolve({ success: false, error: 'No summary file found' });
          }
        } catch (error) {
          console.error('Error parsing subtitle extraction results:', error);
          resolve({ success: false, error: error.message });
        }
      } else {
        resolve({ success: false, error: stderr || `Exited with code ${code}` });
      }
    });

    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      resolve({ success: false, error: err.message });
    });
  });
});

// Add IPC handler to get subtitle contents
ipcMain.handle('get-subtitle-contents', async (event, filePath) => {
  return subtitleContents.get(filePath) || null;
});

// Clean up temporary subtitle directories on app exit
app.on('before-quit', () => {
  const fs = require('fs');
  const path = require('path');
  
  for (const tempDir of tempSubtitleDirs) {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${tempDir}`);
      }
    } catch (error) {
      console.error(`Error cleaning up temporary directory ${tempDir}:`, error);
    }
  }
  // Clear the contents map
  subtitleContents.clear();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the Vite development server URL
  mainWindow.loadURL(`http://localhost:${devServerPort}`);

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

      // Set position with better error handling
      if (position && typeof position.x === 'number' && typeof position.y === 'number') {
        try {
          const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
          const [winWidth, winHeight] = miniplayerWindow.getSize();
          
          // Ensure window is within screen bounds
          const x = Math.max(0, Math.min(position.x, screenWidth - winWidth));
          const y = Math.max(0, Math.min(position.y, screenHeight - winHeight));
          
          miniplayerWindow.setPosition(Math.round(x), Math.round(y));
        } catch (error) {
          console.error('Error setting initial miniplayer position:', error);
          // Use default center position if there's an error
          miniplayerWindow.center();
        }
      } else {
        // Default to center if no position provided
        miniplayerWindow.center();
      }

      const miniplayerUrl = process.env.NODE_ENV !== 'production'
        ? `http://localhost:${devServerPort}?miniplayer=true&videoSrc=${encodeURIComponent(videoSrc)}&time=${videoTime}&isPlaying=${isPlaying}`
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