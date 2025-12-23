package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"csvpdf-server/handler"
	"csvpdf-server/middleware"
	"csvpdf-server/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// Environment
	env := os.Getenv("NODE_ENV")
	if env == "" {
		env = "development"
	}
	isProduction := env == "production"

	// Set Gin mode
	if isProduction {
		gin.SetMode(gin.ReleaseMode)
	}

	// Port
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	// Create Gin router
	r := gin.New()

	// Recovery middleware
	r.Use(gin.Recovery())

	// Logger (only in development)
	if !isProduction {
		r.Use(gin.Logger())
	}

	// Security middleware
	r.Use(middleware.SecurityHeaders())

	// CORS middleware
	allowedOrigins := []string{"http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "http://127.0.0.1:8080"}
	if isProduction {
		allowedOrigins = []string{"https://csvpdf.duckdns.org"}
	}
	r.Use(middleware.CORS(allowedOrigins))

	// API routes with rate limiting
	api := r.Group("/api")
	api.Use(middleware.RateLimit(100, 15)) // 100 requests per 15 minutes

	// Health check
	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Convert routes with stricter rate limit
	convert := api.Group("/convert")
	convert.Use(middleware.RateLimit(20, 15)) // 20 requests per 15 minutes
	convert.POST("/ppt-to-pdf", handler.ConvertPPTToPDF)

	// Static files (production only)
	if isProduction {
		clientDistPath := filepath.Join("..", "client", "dist")
		r.Use(staticServe(clientDistPath))
		r.NoRoute(func(c *gin.Context) {
			c.File(filepath.Join(clientDistPath, "index.html"))
		})
	}

	// Start cleanup job
	go service.StartCleanupJob()

	// Start server
	log.Printf("Server running on port %s", port)
	log.Printf("Environment: %s", env)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// staticServe serves static files
func staticServe(root string) gin.HandlerFunc {
	fileServer := http.FileServer(http.Dir(root))
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		
		// Skip API routes
		if len(path) >= 4 && path[:4] == "/api" {
			c.Next()
			return
		}

		// Check if file exists
		fullPath := filepath.Join(root, path)
		if _, err := os.Stat(fullPath); err == nil {
			fileServer.ServeHTTP(c.Writer, c.Request)
			c.Abort()
			return
		}
		
		c.Next()
	}
}
