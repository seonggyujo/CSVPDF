const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../../temp');
const TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Remove old temporary directories
 */
function cleanupTempFiles() {
  if (!fs.existsSync(tempDir)) return;

  const now = Date.now();
  
  try {
    const dirs = fs.readdirSync(tempDir);
    
    for (const dir of dirs) {
      const dirPath = path.join(tempDir, dir);
      const stats = fs.statSync(dirPath);
      
      if (stats.isDirectory() && (now - stats.mtimeMs) > TTL) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        console.log(`Cleaned up: ${dir}`);
      }
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}

/**
 * Remove specific directory
 */
function removeDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Remove dir error:', err.message);
  }
}

/**
 * Start periodic cleanup job
 */
function startCleanupJob() {
  // Run cleanup every minute
  setInterval(cleanupTempFiles, 60 * 1000);
  console.log('Cleanup job started (TTL: 5 minutes)');
}

module.exports = {
  cleanupTempFiles,
  removeDir,
  startCleanupJob
};
