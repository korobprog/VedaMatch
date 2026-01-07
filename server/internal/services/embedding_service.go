package services

import (
	"context"
	"fmt"
	"os"
	"rag-agent-server/internal/models"

	"github.com/sashabaranov/go-openai"
)

// EmbeddingService handles creating embeddings using OpenAI
type EmbeddingService struct {
	client *openai.Client
	model  openai.EmbeddingModel
}

// NewEmbeddingService creates a new embedding service
func NewEmbeddingService() *EmbeddingService {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("API_OPEN_AI")
	}

	client := openai.NewClient(apiKey)

	modelStr := os.Getenv("OPENAI_EMBEDDING_MODEL")
	var model openai.EmbeddingModel
	if modelStr == "" {
		model = openai.AdaEmbeddingV2
	} else {
		model = openai.EmbeddingModel(modelStr)
	}

	return &EmbeddingService{
		client: client,
		model:  model,
	}
}

// CreateEmbedding creates an embedding for a single text
func (s *EmbeddingService) CreateEmbedding(ctx context.Context, text string) ([]float64, error) {
	if text == "" {
		return nil, fmt.Errorf("text cannot be empty")
	}

	resp, err := s.client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
		Input: []string{text},
		Model: s.model,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to create embedding: %w", err)
	}

	if len(resp.Data) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}

	// Convert []float32 to []float64
	embedding := make([]float64, len(resp.Data[0].Embedding))
	for i, v := range resp.Data[0].Embedding {
		embedding[i] = float64(v)
	}

	return embedding, nil
}

// CreateEmbeddings creates embeddings for multiple texts
func (s *EmbeddingService) CreateEmbeddings(ctx context.Context, texts []string) ([][]float64, error) {
	if len(texts) == 0 {
		return nil, fmt.Errorf("texts cannot be empty")
	}

	// Create embeddings in batches
	batchSize := 100
	allEmbeddings := make([][]float64, 0, len(texts))

	for i := 0; i < len(texts); i += batchSize {
		end := i + batchSize
		if end > len(texts) {
			end = len(texts)
		}

		batch := texts[i:end]

		resp, err := s.client.CreateEmbeddings(ctx, openai.EmbeddingRequest{
			Input: batch,
			Model: s.model,
		})

		if err != nil {
			return nil, fmt.Errorf("failed to create embeddings for batch %d: %w", i/batchSize, err)
		}

		for _, data := range resp.Data {
			// Convert []float32 to []float64
			embedding := make([]float64, len(data.Embedding))
			for i, v := range data.Embedding {
				embedding[i] = float64(v)
			}
			allEmbeddings = append(allEmbeddings, embedding)
		}
	}

	return allEmbeddings, nil
}

// EmbedChunk creates an embedding for a document chunk
func (s *EmbeddingService) EmbedChunk(ctx context.Context, chunk *models.Chunk) error {
	embedding, err := s.CreateEmbedding(ctx, chunk.Content)
	if err != nil {
		return err
	}

	chunk.Embedding = models.Float64Array(embedding)
	return nil
}

// EmbedChunks creates embeddings for multiple chunks
func (s *EmbeddingService) EmbedChunks(ctx context.Context, chunks []models.Chunk) error {
	if len(chunks) == 0 {
		return nil
	}

	texts := make([]string, len(chunks))
	for i, chunk := range chunks {
		texts[i] = chunk.Content
	}

	embeddings, err := s.CreateEmbeddings(ctx, texts)
	if err != nil {
		return err
	}

	for i, embedding := range embeddings {
		chunks[i].Embedding = models.Float64Array(embedding)
	}

	return nil
}

// GetModel returns the embedding model being used
func (s *EmbeddingService) GetModel() string {
	return string(s.model)
}

// CalculateCosineSimilarity calculates cosine similarity between two embeddings
func (s *EmbeddingService) CalculateCosineSimilarity(a, b []float64) float64 {
	if len(a) != len(b) {
		return 0
	}

	var dotProduct, normA, normB float64
	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	if normA == 0 || normB == 0 {
		return 0
	}

	return dotProduct / (sqrt(normA) * sqrt(normB))
}

func sqrt(x float64) float64 {
	var z float64
	z = 1.0

	for i := 0; i < 10; i++ {
		z = (z + x/z) / 2
	}

	return z
}
