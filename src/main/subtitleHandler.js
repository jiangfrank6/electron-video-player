const { ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

function runPythonScript(args) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, '../../python/subtitle_extractor.py');
    const pythonProcess = spawn('python3', [pythonScript, ...args]);

    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        try {
          const errorData = JSON.parse(error);
          reject(new Error(errorData.error || 'Unknown error occurred'));
        } catch (e) {
          reject(new Error(error || 'Failed to run Python script'));
        }
        return;
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (e) {
        reject(new Error('Failed to parse Python script output'));
      }
    });
  });
}

function initialize(mainWindow) {
  // Handle getting subtitle tracks
  ipcMain.handle('get-subtitle-tracks', async (event, filePath) => {
    try {
      const tracks = await runPythonScript(['get-tracks', filePath]);
      return tracks;
    } catch (error) {
      console.error('Error getting subtitle tracks:', error);
      throw error;
    }
  });

  // Handle extracting subtitles
  ipcMain.handle('extract-subtitles', async (event, { filePath, streamIndex }) => {
    try {
      const outputDir = path.join(os.homedir(), '.video-player', 'subtitles');
      const outputFile = path.join(outputDir, `${path.basename(filePath, path.extname(filePath))}.srt`);
      
      const result = await runPythonScript(['extract', filePath, outputFile, streamIndex]);
      return result;
    } catch (error) {
      console.error('Error extracting subtitles:', error);
      throw error;
    }
  });
}

module.exports = {
  initialize
}; 