package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// Client represents a rate-limited client
type Client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiter manages per-IP rate limiting
type RateLimiter struct {
	clients map[string]*Client
	mu      sync.Mutex
	rate    rate.Limit
	burst   int
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {
	rl := &RateLimiter{
		clients: make(map[string]*Client),
		rate:    r,
		burst:   burst,
	}

	// Cleanup old clients every minute
	go rl.cleanupLoop()

	return rl
}

func (rl *RateLimiter) cleanupLoop() {
	for {
		time.Sleep(time.Minute)
		rl.mu.Lock()
		for ip, client := range rl.clients {
			if time.Since(client.lastSeen) > 3*time.Minute {
				delete(rl.clients, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// GetLimiter returns the rate limiter for the given IP
func (rl *RateLimiter) GetLimiter(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	client, exists := rl.clients[ip]
	if !exists {
		limiter := rate.NewLimiter(rl.rate, rl.burst)
		rl.clients[ip] = &Client{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}

	client.lastSeen = time.Now()
	return client.limiter
}

// RateLimit returns a rate limiting middleware
// maxRequests: maximum requests allowed
// windowMinutes: time window in minutes
func RateLimit(maxRequests int, windowMinutes int) gin.HandlerFunc {
	// Calculate rate: requests per second
	ratePerSecond := float64(maxRequests) / (float64(windowMinutes) * 60)
	limiter := NewRateLimiter(rate.Limit(ratePerSecond), maxRequests)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		
		if !limiter.GetLimiter(ip).Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many requests. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
