package services

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/sashabaranov/go-openai"
)

// RetrievalService handles retrieving relevant chunks for RAG
type RetrievalService struct {
	embeddingService *EmbeddingService
	vectorStore      *VectorStoreService
	openaiClient     *openai.Client
	model            string
}

// NewRetrievalService creates a new retrieval service
func NewRetrievalService(embeddingService *EmbeddingService, vectorStore *VectorStoreService) *RetrievalService {
	apiKey := ""
	if os.Getenv("OPENAI_API_KEY") != "" {
		apiKey = os.Getenv("OPENAI_API_KEY")
	} else if os.Getenv("API_OPEN_AI") != "" {
		apiKey = os.Getenv("API_OPEN_AI")
	}

	client := openai.NewClient(apiKey)

	model := os.Getenv("OPENAI_CHAT_MODEL")
	if model == "" {
		model = openai.GPT4o
	}

	return &RetrievalService{
		embeddingService: embeddingService,
		vectorStore:      vectorStore,
		openaiClient:     client,
		model:            model,
	}
}

// RetrievalRequest represents a retrieval request
type RetrievalRequest struct {
	Query      string
	DocumentID string
	TopK       int
	Threshold  float64
	UserID     string
}

// RetrievalResponse represents the retrieval result
type RetrievalResponse struct {
	Query          string
	Chunks         []RetrievalChunk
	Context        string
	TotalRelevance float64
}

// RetrievalChunk represents a retrieved chunk with metadata
type RetrievalChunk struct {
	Content    string
	DocumentID string
	Similarity float64
	Metadata   map[string]interface{}
}

// Retrieve retrieves relevant chunks for a query
func (s *RetrievalService) Retrieve(ctx context.Context, req RetrievalRequest) (*RetrievalResponse, error) {
	// Create embedding for query
	embedding, err := s.embeddingService.CreateEmbedding(ctx, req.Query)
	if err != nil {
		return nil, fmt.Errorf("failed to create query embedding: %w", err)
	}

	// Search for similar chunks
	searchResults, err := s.vectorStore.Search(SearchRequest{
		Query:      embedding,
		DocumentID: req.DocumentID,
		TopK:       req.TopK,
		Threshold:  req.Threshold,
		UserID:     req.UserID,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to search chunks: %w", err)
	}

	// Build retrieval chunks
	chunks := make([]RetrievalChunk, len(searchResults))
	totalRelevance := 0.0

	for i, result := range searchResults {
		metadata := make(map[string]interface{})
		metadata["chunk_id"] = result.Chunk.ID.String()
		metadata["index"] = result.Chunk.Index
		if result.Chunk.Metadata.PageNumber != 0 {
			metadata["page_number"] = result.Chunk.Metadata.PageNumber
		}
		if result.Chunk.Metadata.SectionTitle != "" {
			metadata["section_title"] = result.Chunk.Metadata.SectionTitle
		}

		chunks[i] = RetrievalChunk{
			Content:    result.Chunk.Content,
			DocumentID: result.Chunk.DocumentID.String(),
			Similarity: result.Similarity,
			Metadata:   metadata,
		}

		totalRelevance += result.Similarity
	}

	// Build context string
	context := s.buildContext(chunks)

	return &RetrievalResponse{
		Query:          req.Query,
		Chunks:         chunks,
		Context:        context,
		TotalRelevance: totalRelevance,
	}, nil
}

// buildContext builds a context string from chunks
func (s *RetrievalService) buildContext(chunks []RetrievalChunk) string {
	if len(chunks) == 0 {
		return ""
	}

	var contextBuilder strings.Builder
	contextBuilder.WriteString("Context from documents:\n\n")

	for i, chunk := range chunks {
		contextBuilder.WriteString(fmt.Sprintf("[Document %d]", i+1))

		if page, ok := chunk.Metadata["page_number"].(int); ok {
			contextBuilder.WriteString(fmt.Sprintf(" (Page %d)", page))
		}

		if section, ok := chunk.Metadata["section_title"].(string); ok {
			contextBuilder.WriteString(fmt.Sprintf(" - %s", section))
		}

		contextBuilder.WriteString(fmt.Sprintf(" [Similarity: %.2f]\n", chunk.Similarity))
		contextBuilder.WriteString(chunk.Content)
		contextBuilder.WriteString("\n\n")
	}

	return contextBuilder.String()
}

// GenerateResponse generates a response using retrieved context
func (s *RetrievalService) GenerateResponse(ctx context.Context, query string, retrievalResp *RetrievalResponse) (string, error) {
	systemPrompt := `You are a helpful assistant that answers questions based on the provided context. 
When answering:
- Use only the information from the provided context
- If the context doesn't contain the answer, say "I don't have enough information to answer this question"
- Be concise and direct
- Cite the document numbers when referring to specific information`

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: fmt.Sprintf("Context:\n%s\n\nQuestion: %s", retrievalResp.Context, query),
		},
	}

	resp, err := s.openaiClient.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
		Model:       s.model,
		Messages:    messages,
		Temperature: 0.3,
	})

	if err != nil {
		return "", fmt.Errorf("failed to generate response: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response generated")
	}

	return resp.Choices[0].Message.Content, nil
}

// RAGRequest represents a complete RAG request
type RAGRequest struct {
	Query      string
	DocumentID string
	TopK       int
	Threshold  float64
	UserID     string
}

// RAGResponse represents a complete RAG response
type RAGResponse struct {
	Answer         string
	Query          string
	Sources        []RetrievalChunk
	TotalRelevance float64
	ChunkCount     int
}

// ExecuteRAG executes the full RAG pipeline
func (s *RetrievalService) ExecuteRAG(ctx context.Context, req RAGRequest) (*RAGResponse, error) {
	// Retrieve relevant chunks
	retrievalReq := RetrievalRequest{
		Query:      req.Query,
		DocumentID: req.DocumentID,
		TopK:       req.TopK,
		Threshold:  req.Threshold,
		UserID:     req.UserID,
	}

	retrievalResp, err := s.Retrieve(ctx, retrievalReq)
	if err != nil {
		return nil, err
	}

	// Generate response
	answer, err := s.GenerateResponse(ctx, req.Query, retrievalResp)
	if err != nil {
		return nil, err
	}

	return &RAGResponse{
		Answer:         answer,
		Query:          req.Query,
		Sources:        retrievalResp.Chunks,
		TotalRelevance: retrievalResp.TotalRelevance,
		ChunkCount:     len(retrievalResp.Chunks),
	}, nil
}
