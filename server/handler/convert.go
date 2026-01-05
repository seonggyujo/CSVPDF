package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"csvpdf-server/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	maxFileSize = 50 * 1024 * 1024 // 50MB
)

// Allowed MIME types
var allowedMimeTypes = map[string]bool{
	"application/vnd.ms-powerpoint":                                             true,
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": true,
	"application/octet-stream":                                                  true,
}

// Magic numbers for file validation
var magicNumbers = map[string][]byte{
	"pptx": {0x50, 0x4B, 0x03, 0x04}, // ZIP (Office Open XML)
	"ppt":  {0xD0, 0xCF, 0x11, 0xE0}, // OLE2 Compound Document
}

// ConvertPPTToPDF handles PPT to PDF conversion
func ConvertPPTToPDF(c *gin.Context) {
	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Validate file size
	if file.Size > maxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 50MB limit"})
		return
	}

	// Validate file extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".ppt" && ext != ".pptx" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only PPT and PPTX files are allowed"})
		return
	}

	// Create unique directory for this request
	requestID := uuid.New().String()
	tempDir := filepath.Join(os.TempDir(), "csvpdf", requestID)
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create temp directory"})
		return
	}

	// Sanitize filename
	safeFilename := sanitizeFilename(file.Filename)
	inputPath := filepath.Join(tempDir, safeFilename)

	// Save uploaded file
	if err := c.SaveUploadedFile(file, inputPath); err != nil {
		os.RemoveAll(tempDir)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
		return
	}

	// Validate magic number
	if !validateMagicNumber(inputPath, ext) {
		os.RemoveAll(tempDir)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file format"})
		return
	}

	// Validate MIME type
	mimeType := file.Header.Get("Content-Type")
	if !allowedMimeTypes[mimeType] {
		os.RemoveAll(tempDir)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid MIME type"})
		return
	}

	// Convert to PDF
	pdfPath, err := service.ConvertToPDF(inputPath, tempDir)
	if err != nil {
		os.RemoveAll(tempDir)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert file. Please check the file format."})
		return
	}

	// Get PDF file info
	pdfInfo, err := os.Stat(pdfPath)
	if err != nil || pdfInfo.Size() == 0 {
		os.RemoveAll(tempDir)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Generated PDF is invalid"})
		return
	}

	// Generate safe PDF filename
	baseName := strings.TrimSuffix(filepath.Base(safeFilename), ext)
	safePDFName := sanitizeFilename(baseName + ".pdf")

	// Set headers and send file
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename=\""+safePDFName+"\"")
	c.File(pdfPath)

	// Cleanup after sending (deferred with delay to ensure file transfer completes)
	go func() {
		// Wait 10 seconds to ensure file is fully sent to client
		time.Sleep(10 * time.Second)
		os.RemoveAll(tempDir)
	}()
}

// sanitizeFilename removes dangerous characters from filename
func sanitizeFilename(filename string) string {
	// Remove path traversal attempts
	filename = filepath.Base(filename)

	// Replace dangerous characters
	replacer := strings.NewReplacer(
		"..", "",
		"/", "",
		"\\", "",
		"\x00", "",
	)
	return replacer.Replace(filename)
}

// validateMagicNumber checks if file has correct magic number
func validateMagicNumber(filePath, ext string) bool {
	file, err := os.Open(filePath)
	if err != nil {
		return false
	}
	defer file.Close()

	// Read first 4 bytes
	header := make([]byte, 4)
	if _, err := file.Read(header); err != nil {
		return false
	}

	// Check magic number based on extension
	var expected []byte
	if ext == ".pptx" {
		expected = magicNumbers["pptx"]
	} else if ext == ".ppt" {
		expected = magicNumbers["ppt"]
	} else {
		return false
	}

	for i, b := range expected {
		if header[i] != b {
			return false
		}
	}

	return true
}
