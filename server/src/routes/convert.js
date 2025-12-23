const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload');
const { removeDir } = require('../utils/cleanup');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

// LibreOffice 실행 파일 경로 (OS별)
const SOFFICE_PATH = process.platform === 'win32' 
  ? 'soffice' 
  : '/usr/bin/soffice';

/**
 * POST /api/convert/ppt-to-pdf
 * Convert PPT/PPTX to PDF using LibreOffice
 */
router.post('/ppt-to-pdf', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { requestDir } = req;
  const inputFile = req.file.path;
  const originalName = path.basename(req.file.originalname, path.extname(req.file.originalname));

  // 파일 경로 유효성 검증 (Path Traversal 방지)
  const normalizedInput = path.resolve(inputFile);
  const normalizedDir = path.resolve(requestDir);
  
  if (!normalizedInput.startsWith(normalizedDir)) {
    removeDir(requestDir);
    return res.status(400).json({ error: 'Invalid file path' });
  }

  try {
    // execFile 사용 - 쉘 인젝션 방지
    const args = [
      '--headless',
      '--nologo',
      '--nofirststartwizard',
      '--convert-to', 'pdf',
      '--outdir', requestDir,
      inputFile
    ];

    await new Promise((resolve, reject) => {
      execFile(SOFFICE_PATH, args, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          if (!isProduction) {
            console.error('LibreOffice error:', stderr);
          }
          reject(new Error('Conversion failed'));
        } else {
          resolve(stdout);
        }
      });
    });

    // Find the generated PDF
    const pdfFileName = `${originalName}.pdf`;
    let pdfPath = path.join(requestDir, pdfFileName);

    if (!fs.existsSync(pdfPath)) {
      // Try to find any PDF in the directory
      const files = fs.readdirSync(requestDir);
      const pdfFile = files.find(f => f.endsWith('.pdf'));
      
      if (!pdfFile) {
        throw new Error('PDF file not generated');
      }
      
      pdfPath = path.join(requestDir, pdfFile);
    }

    // 파일 존재 및 크기 확인
    const pdfStats = fs.statSync(pdfPath);
    if (pdfStats.size === 0) {
      throw new Error('Generated PDF is empty');
    }

    // 안전한 파일명 생성
    const safePdfFileName = path.basename(pdfPath).replace(/[^a-zA-Z0-9._-]/g, '_');

    // Send PDF file with proper error handling
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safePdfFileName)}"`);
    res.setHeader('Content-Length', pdfStats.size);

    const fileStream = fs.createReadStream(pdfPath);
    
    // 스트림 에러 핸들링
    fileStream.on('error', (streamError) => {
      if (!isProduction) {
        console.error('Stream error:', streamError);
      }
      removeDir(requestDir);
      if (!res.headersSent) {
        res.status(500).json({ error: 'File transfer failed' });
      }
    });

    // 클라이언트 연결 종료 시 정리
    res.on('close', () => {
      fileStream.destroy();
      setTimeout(() => removeDir(requestDir), 1000);
    });

    fileStream.on('end', () => {
      setTimeout(() => removeDir(requestDir), 1000);
    });

    fileStream.pipe(res);

  } catch (error) {
    if (!isProduction) {
      console.error('Conversion error:', error.message);
    }
    removeDir(requestDir);
    
    // 일반화된 에러 메시지 (내부 정보 숨김)
    res.status(500).json({ error: 'Failed to convert file. Please check the file format.' });
  }
});

module.exports = router;
