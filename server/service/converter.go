package service

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

// GetLibreOfficePath returns the path to LibreOffice executable
func GetLibreOfficePath() string {
	if runtime.GOOS == "windows" {
		return "soffice"
	}
	return "/usr/bin/soffice"
}

// ConvertToPDF converts a PPT/PPTX file to PDF using LibreOffice
func ConvertToPDF(inputPath, outputDir string) (string, error) {
	// Validate input path (prevent path traversal)
	absInput, err := filepath.Abs(inputPath)
	if err != nil {
		return "", fmt.Errorf("invalid input path")
	}
	absOutput, err := filepath.Abs(outputDir)
	if err != nil {
		return "", fmt.Errorf("invalid output path")
	}

	// Ensure input is within output directory
	if !strings.HasPrefix(absInput, absOutput) {
		return "", fmt.Errorf("path traversal detected")
	}

	// LibreOffice command
	soffice := GetLibreOfficePath()
	args := []string{
		"--headless",
		"--nologo",
		"--nofirststartwizard",
		"--convert-to", "pdf",
		"--outdir", outputDir,
		inputPath,
	}

	// Execute with timeout
	cmd := exec.Command(soffice, args...)
	
	// Set timeout
	done := make(chan error, 1)
	go func() {
		done <- cmd.Run()
	}()

	select {
	case err := <-done:
		if err != nil {
			return "", fmt.Errorf("conversion failed: %v", err)
		}
	case <-time.After(120 * time.Second):
		cmd.Process.Kill()
		return "", fmt.Errorf("conversion timeout")
	}

	// Find the generated PDF
	baseName := strings.TrimSuffix(filepath.Base(inputPath), filepath.Ext(inputPath))
	pdfPath := filepath.Join(outputDir, baseName+".pdf")

	// Check if PDF exists
	if _, err := os.Stat(pdfPath); err != nil {
		// Try to find any PDF in the directory
		files, err := os.ReadDir(outputDir)
		if err != nil {
			return "", fmt.Errorf("failed to read output directory")
		}

		for _, f := range files {
			if strings.HasSuffix(strings.ToLower(f.Name()), ".pdf") {
				pdfPath = filepath.Join(outputDir, f.Name())
				break
			}
		}

		// Check again
		if _, err := os.Stat(pdfPath); err != nil {
			return "", fmt.Errorf("PDF file not generated")
		}
	}

	return pdfPath, nil
}
