package models

import "time"

type CVAnalysis struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	CVHash    string    `json:"cv_hash" db:"cv_hash"`
	CVContent string    `json:"cv_content" db:"cv_content"`
	Filename  string    `json:"filename" db:"filename"`
	Analysis  string    `json:"analysis" db:"analysis"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type AnalyzeRequest struct {
	CVContent string `json:"cvContent" binding:"required"`
	Prompt    string `json:"prompt"`
}

type AnalyzeResponse struct {
	Analysis  string `json:"analysis"`
	FromCache bool   `json:"fromCache"`
	CachedAt  string `json:"cachedAt,omitempty"`
	Filename  string `json:"filename,omitempty"`
	Error     string `json:"error,omitempty"`
}
