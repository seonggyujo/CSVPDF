package middleware

import (
	"github.com/gin-gonic/gin"
)

// CORS returns a CORS middleware
func CORS(allowedOrigins []string) gin.HandlerFunc {
	originSet := make(map[string]bool)
	for _, origin := range allowedOrigins {
		originSet[origin] = true
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Allow if origin is in allowed list or no origin (same-origin request)
		if origin == "" || originSet[origin] {
			if origin != "" {
				c.Header("Access-Control-Allow-Origin", origin)
			}
			c.Header("Access-Control-Allow-Methods", "GET, POST")
			c.Header("Access-Control-Allow-Headers", "Content-Type")
			c.Header("Access-Control-Max-Age", "86400") // 24 hours cache
		}

		// Handle preflight request
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
