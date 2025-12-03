package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/js402/me/backend/models"
	"github.com/js402/me/backend/services"
)

type AnalysisHandler struct {
	openaiSvc   *services.OpenAIService
	supabaseSvc *services.SupabaseService
}

func NewAnalysisHandler(openaiSvc *services.OpenAIService, supabaseSvc *services.SupabaseService) *AnalysisHandler {
	return &AnalysisHandler{
		openaiSvc:   openaiSvc,
		supabaseSvc: supabaseSvc,
	}
}

func (h *AnalysisHandler) HandleAnalyzeCV(c *gin.Context) {
	var req models.AnalyzeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	// 1. Hash CV Content
	hash := sha256.Sum256([]byte(req.CVContent))
	cvHash := hex.EncodeToString(hash[:])

	// 2. Check Cache
	cached, err := h.supabaseSvc.GetCachedAnalysis(userID, cvHash)
	if err != nil {
		// Log error but continue? Or fail?
		// For now, let's log and continue as cache miss
		fmt.Printf("Error checking cache: %v\n", err)
	}

	if cached != nil {
		c.JSON(http.StatusOK, models.AnalyzeResponse{
			Analysis:  cached.Analysis,
			FromCache: true,
			CachedAt:  cached.CreatedAt.Format(time.RFC3339),
			Filename:  cached.Filename,
		})
		return
	}

	// 3. Call OpenAI
	analysis, err := h.openaiSvc.AnalyzeCV(c.Request.Context(), req.CVContent, req.Prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate analysis", "details": err.Error()})
		return
	}

	// 4. Store in Cache (Async-ish)
	// In Go, we can just launch a goroutine, but we need to be careful with context.
	// For simplicity, we'll do it synchronously or use a background context.
	go func() {
		filename := fmt.Sprintf("CV-%s", time.Now().Format("2006-01-02"))
		_, err := h.supabaseSvc.StoreAnalysis(userID, cvHash, req.CVContent, filename, analysis)
		if err != nil {
			fmt.Printf("Error storing analysis: %v\n", err)
		}
	}()

	c.JSON(http.StatusOK, models.AnalyzeResponse{
		Analysis:  analysis,
		FromCache: false,
	})
}
