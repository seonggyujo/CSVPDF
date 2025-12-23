const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/upload');
const { removeDir } = require('../utils/cleanup');

const router = express.Router();

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

  try {
    // Convert using LibreOffice headless
    const command = `soffice --headless --nologo --nofirststartwizard --convert-to pdf --outdir "${requestDir}" "${inputFile}"`;
    
    await new Promise((resolve, reject) => {
      exec(command, { timeout: 120000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('LibreOffice error:', stderr);
          reject(new Error('Conversion failed'));
        } else {
          resolve(stdout);
        }
      });
    });

    // Find the generated PDF
    const pdfFileName = `${originalName}.pdf`;
    const pdfPath = path.join(requestDir, pdfFileName);

    if (!fs.existsSync(pdfPath)) {
      // Try to find any PDF in the directory
      const files = fs.readdirSync(requestDir);
      const pdfFile = files.find(f => f.endsWith('.pdf'));
      
      if (!pdfFile) {
        throw new Error('PDF file not generated');
      }
      
      const actualPdfPath = path.join(requestDir, pdfFile);
      
      // Send PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfFile)}"`);
      
      const fileStream = fs.createReadStream(actualPdfPath);
      fileStream.pipe(res);
      
      fileStream.on('end', () => {
        // Cleanup after sending
        setTimeout(() => removeDir(requestDir), 1000);
      });
    } else {
      // Send PDF file
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfFileName)}"`);
      
      const fileStream = fs.createReadStream(pdfPath);
      fileStream.pipe(res);
      
      fileStream.on('end', () => {
        // Cleanup after sending
        setTimeout(() => removeDir(requestDir), 1000);
      });
    }

  } catch (error) {
    console.error('Conversion error:', error.message);
    removeDir(requestDir);
    res.status(500).json({ error: error.message || 'Conversion failed' });
  }
});

module.exports = router;
