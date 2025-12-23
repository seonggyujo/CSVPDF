const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create temp directory if not exists
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// ===================
// Security Constants
// ===================

const ALLOWED_EXTENSIONS = ['.ppt', '.pptx'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILENAME_LENGTH = 100;

// PPT/PPTX Magic Numbers (파일 시그니처)
// PPTX (ZIP 기반): 50 4B 03 04
// PPT (OLE2): D0 CF 11 E0 A1 B1 1A E1
const MAGIC_NUMBERS = {
  pptx: [0x50, 0x4B, 0x03, 0x04], // ZIP/PPTX
  ppt: [0xD0, 0xCF, 0x11, 0xE0]   // OLE2/PPT
};

// 허용된 MIME 타입
const ALLOWED_MIME_TYPES = [
  'application/vnd.ms-powerpoint',                                           // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/octet-stream' // 일부 브라우저에서 전송
];

// ===================
// Helper Functions
// ===================

/**
 * 파일 Magic Number 검증
 */
function validateMagicNumber(buffer, ext) {
  if (buffer.length < 4) return false;
  
  const magicBytes = Array.from(buffer.slice(0, 4));
  
  if (ext === '.pptx') {
    return magicBytes.every((byte, i) => byte === MAGIC_NUMBERS.pptx[i]);
  } else if (ext === '.ppt') {
    return magicBytes.every((byte, i) => byte === MAGIC_NUMBERS.ppt[i]);
  }
  
  return false;
}

/**
 * 파일명 정제
 */
function sanitizeFilename(filename) {
  // 경로 구분자 및 위험 문자 제거
  let sanitized = filename
    .replace(/\.\./g, '_')           // Path traversal 방지
    .replace(/[\/\\]/g, '_')         // 경로 구분자 제거
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 안전한 문자만 허용
    .replace(/_{2,}/g, '_');         // 연속 언더스코어 정리
  
  // 길이 제한
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
  }
  
  return sanitized;
}

// ===================
// Multer Configuration
// ===================

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
    // 파일명 정제
    const sanitizedName = sanitizeFilename(file.originalname);
    cb(null, sanitizedName);
  }
});

// File filter - 확장자 및 MIME 타입 검증
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // 1. 확장자 검증
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
  
  // 2. MIME 타입 검증
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Invalid MIME type'), false);
  }
  
  // 3. 파일명 길이 검증
  if (file.originalname.length > MAX_FILENAME_LENGTH * 2) {
    return cb(new Error('Filename too long'), false);
  }
  
  cb(null, true);
};

// Export multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // 단일 파일만 허용
  }
});

// ===================
// Post-upload Validation
// ===================

/**
 * 업로드 후 Magic Number 검증 미들웨어
 */
upload.validateMagicNumber = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    
    if (!validateMagicNumber(buffer, ext)) {
      // 파일 삭제
      fs.unlinkSync(req.file.path);
      if (req.requestDir) {
        fs.rmSync(req.requestDir, { recursive: true, force: true });
      }
      return res.status(400).json({ error: 'Invalid file content. File appears to be corrupted or fake.' });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = upload;
