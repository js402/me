package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/js402/me/backend/handlers"
	"github.com/js402/me/backend/middleware"
	"github.com/js402/me/backend/services"
)

func main() {
	// Load .env file from parent directory if present
	if err := godotenv.Load("../.env.local"); err != nil {
		log.Println("Warning: .env.local file not found")
		// Try loading .env
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("Warning: .env file not found")
		}
	}

	// Initialize Services
	openaiSvc := services.NewOpenAIService()
	supabaseSvc := services.NewSupabaseService()

	// Initialize Handlers
	analysisHandler := handlers.NewAnalysisHandler(openaiSvc, supabaseSvc)

	// Setup Router
	r := gin.Default()

	// CORS Middleware (Simple version)
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Routes
	r.POST("/analyze-cv", middleware.AuthMiddleware(), analysisHandler.HandleAnalyzeCV)

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
