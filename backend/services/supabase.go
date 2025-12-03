package services

import (
	"fmt"
	"os"

	"github.com/js402/me/backend/models"
	"github.com/nedpals/supabase-go"
)

type SupabaseService struct {
	client *supabase.Client
}

func NewSupabaseService() *SupabaseService {
	supabaseUrl := os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY") // Use service role key for backend operations if needed, or anon key + RLS

	// For backend, we might want to use the service role key to bypass RLS if we are handling auth manually,
	// BUT since we want to respect RLS, we should probably forward the user's token.
	// However, the supabase-go library is a bit basic.
	// Let's stick to using the anon key and we'll see how to handle auth context.
	// Actually, for the backend to act on behalf of the user, we should probably just use the service role key
	// and manually verify the user ID matches.
	// OR, we can pass the user's access token to the client if the library supports it.

	// Let's use the Service Role Key for now to ensure we can read/write,
	// and we will rely on our Auth Middleware to ensure the user is who they say they are.
	if supabaseKey == "" {
		supabaseKey = os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
	}

	client := supabase.CreateClient(supabaseUrl, supabaseKey)
	return &SupabaseService{client: client}
}

func (s *SupabaseService) GetCachedAnalysis(userID, cvHash string) (*models.CVAnalysis, error) {
	var results []models.CVAnalysis
	err := s.client.DB.From("cv_analyses").
		Select("*").
		Eq("user_id", userID).
		Eq("cv_hash", cvHash).
		Execute(&results)

	if err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, nil
	}

	return &results[0], nil
}

func (s *SupabaseService) StoreAnalysis(userID, cvHash, cvContent, filename, analysis string) (*models.CVAnalysis, error) {
	newAnalysis := models.CVAnalysis{
		UserID:    userID,
		CVHash:    cvHash,
		CVContent: cvContent,
		Filename:  filename,
		Analysis:  analysis,
		// CreatedAt and UpdatedAt are handled by DB defaults/triggers usually,
		// but we can set them here if needed.
	}

	var results []models.CVAnalysis
	err := s.client.DB.From("cv_analyses").
		Insert(newAnalysis).
		Execute(&results)

	if err != nil {
		return nil, err
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("failed to insert analysis")
	}

	return &results[0], nil
}
