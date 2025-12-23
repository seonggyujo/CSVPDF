const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create temp directory if not exists
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.ppt', '.pptx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create unique folder for each request
    const requestId = uuidv4();
    const requestDir = path.join(tempDir, requestId);
    fs.mkdirSync(requestDir, { recursive: true });
    req.requestId = requestId;
    req.requestDir = requestDir;
    cb(null, requestDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename with sanitization
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, sanitizedName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
};

// Export multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

module.exports = upload;
