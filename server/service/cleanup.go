package service

import (
	"log"
	"os"
	"path/filepath"
	"time"
)

const (
	cleanupInterval = 1 * time.Minute
	maxAge          = 5 * time.Minute
)

// StartCleanupJob starts a background job to clean up old temp files
func StartCleanupJob() {
	ticker := time.NewTicker(cleanupInterval)
	defer ticker.Stop()

	tempBaseDir := filepath.Join(os.TempDir(), "csvpdf")

	for range ticker.C {
		cleanupOldFiles(tempBaseDir)
	}
}

// cleanupOldFiles removes directories older than maxAge
func cleanupOldFiles(baseDir string) {
	// Check if base directory exists
	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		return
	}

	entries, err := os.ReadDir(baseDir)
	if err != nil {
		log.Printf("Cleanup: failed to read directory: %v", err)
		return
	}

	now := time.Now()

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		dirPath := filepath.Join(baseDir, entry.Name())

		// Security: Check for symlinks
		info, err := os.Lstat(dirPath)
		if err != nil {
			continue
		}

		// Skip symlinks
		if info.Mode()&os.ModeSymlink != 0 {
			log.Printf("Cleanup: skipping symlink: %s", dirPath)
			continue
		}

		// Get directory info
		fileInfo, err := entry.Info()
		if err != nil {
			continue
		}

		// Check if directory is old enough
		if now.Sub(fileInfo.ModTime()) > maxAge {
			// Security: Validate path before removal
			absPath, err := filepath.Abs(dirPath)
			if err != nil {
				continue
			}

			absBase, err := filepath.Abs(baseDir)
			if err != nil {
				continue
			}

			// Ensure we're only deleting within our temp directory
			if !isSubPath(absBase, absPath) {
				log.Printf("Cleanup: path traversal attempt blocked: %s", dirPath)
				continue
			}

			if err := os.RemoveAll(dirPath); err != nil {
				log.Printf("Cleanup: failed to remove %s: %v", dirPath, err)
			}
		}
	}
}

// isSubPath checks if child is a subdirectory of parent
func isSubPath(parent, child string) bool {
	rel, err := filepath.Rel(parent, child)
	if err != nil {
		return false
	}

	// Check if the relative path doesn't go up (..)
	return !filepath.IsAbs(rel) && rel != ".." && !startsWithDotDot(rel)
}

func startsWithDotDot(path string) bool {
	return len(path) >= 2 && path[0] == '.' && path[1] == '.'
}
