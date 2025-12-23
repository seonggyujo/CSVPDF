package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders adds security headers (equivalent to Helmet in Node.js)
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Content Security Policy
		c.Header("Content-Security-Policy", 
			"default-src 'self'; "+
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
			"font-src 'self' https://fonts.gstatic.com; "+
			"script-src 'self'; "+
			"img-src 'self' data: blob:; "+
			"connect-src 'self'; "+
			"object-src 'none'; "+
			"frame-src 'none'; "+
			"frame-ancestors 'none'")

		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")

		// XSS Protection (legacy, but still useful)
		c.Header("X-XSS-Protection", "1; mode=block")

		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions Policy (formerly Feature-Policy)
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		// Remove X-Powered-By (Gin doesn't add this by default, but just in case)
		c.Header("X-Powered-By", "")

		// HSTS (only enable in production with HTTPS)
		// c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		c.Next()
	}
}
