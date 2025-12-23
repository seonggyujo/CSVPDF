const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, '../../temp');
const TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Validate path is within temp directory (prevent path traversal)
 */
function isPathSafe(targetPath) {
  const resolvedPath = path.resolve(targetPath);
  const resolvedTempDir = path.resolve(tempDir);
  return resolvedPath.startsWith(resolvedTempDir + path.sep);
}

/**
 * Check if path is a symbolic link
 */
function isSymlink(targetPath) {
  try {
    const stats = fs.lstatSync(targetPath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

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
      
      // Security: Skip symlinks to prevent symlink attacks
      if (isSymlink(dirPath)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Skipping symlink: ${dir}`);
        }
        continue;
      }
      
      // Security: Validate path is within temp directory
      if (!isPathSafe(dirPath)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Path traversal attempt blocked: ${dir}`);
        }
        continue;
      }
      
      const stats = fs.statSync(dirPath);
      
      if (stats.isDirectory() && (now - stats.mtimeMs) > TTL) {
        fs.rmSync(dirPath, { recursive: true, force: true });
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Cleaned up: ${dir}`);
        }
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Cleanup error:', err.message);
    }
  }
}

/**
 * Remove specific directory (with security checks)
 */
function removeDir(dirPath) {
  try {
    // Security: Validate path
    if (!isPathSafe(dirPath)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Remove dir blocked: path outside temp directory');
      }
      return;
    }
    
    // Security: Skip symlinks
    if (isSymlink(dirPath)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Remove dir blocked: symlink detected');
      }
      return;
    }
    
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Remove dir error:', err.message);
    }
  }
}

/**
 * Start periodic cleanup job
 */
function startCleanupJob() {
  // Run cleanup every minute
  setInterval(cleanupTempFiles, 60 * 1000);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Cleanup job started (TTL: 5 minutes)');
  }
}

module.exports = {
  cleanupTempFiles,
  removeDir,
  startCleanupJob
};
