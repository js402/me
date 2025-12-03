package services

import (
	"context"
	"os"

	"github.com/sashabaranov/go-openai"
)

const DefaultModel = "gpt-4o-mini"
const SystemPrompt = `You are an expert career advisor and technical recruiter with deep knowledge of the tech industry. 
Your role is to analyze CVs/resumes and provide actionable, personalized career guidance.

When analyzing a CV, you should:
1. Identify the candidate's current level (junior, mid, senior, lead, etc.)
2. Highlight key strengths and technical skills
3. Identify areas for improvement or skill gaps
4. Suggest specific next steps for career advancement
5. Recommend relevant technologies or certifications to learn
6. Provide insights on market demand for their skill set
7. Suggest potential career paths or role transitions

Be specific, actionable, and encouraging in your feedback. Focus on practical advice that the candidate can implement.`

type OpenAIService struct {
	client *openai.Client
}

func NewOpenAIService() *OpenAIService {
	apiKey := os.Getenv("OPENAI_API_KEY")
	client := openai.NewClient(apiKey)
	return &OpenAIService{client: client}
}

func (s *OpenAIService) AnalyzeCV(ctx context.Context, cvContent, userPrompt string) (string, error) {
	prompt := userPrompt
	if prompt == "" {
		prompt = "Please analyze the following CV and provide detailed career guidance:\n\n" + cvContent
	}

	resp, err := s.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: DefaultModel,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: SystemPrompt,
				},
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
			Temperature: 0.7,
			MaxTokens:   2000,
		},
	)

	if err != nil {
		return "", err
	}

	return resp.Choices[0].Message.Content, nil
}
