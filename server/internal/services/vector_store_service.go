package services

import (
	"fmt"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

// VectorStoreService handles storing and retrieving embeddings
type VectorStoreService struct {
	db *gorm.DB
}

// NewVectorStoreService creates a new vector store service
func NewVectorStoreService(db *gorm.DB) *VectorStoreService {
	return &VectorStoreService{db: db}
}

// SearchRequest represents a vector search request
type SearchRequest struct {
	Query      []float64
	DocumentID string
	TopK       int
	Threshold  float64
	UserID     string
}

// SearchResult represents a vector search result
type SearchResult struct {
	Chunk      models.Chunk
	Similarity float64
}

// Search performs similarity search for chunks
func (s *VectorStoreService) Search(req SearchRequest) ([]SearchResult, error) {
	if req.TopK == 0 {
		req.TopK = 5
	}

	// Get all chunks with embeddings
	var chunks []models.Chunk
	query := s.db.Where("embedding IS NOT NULL")

	if req.DocumentID != "" {
		query = query.Where("document_id = ?", req.DocumentID)
	}

	if req.UserID != "" {
		// Only get chunks from documents owned by the user
		var doc models.Document
		if err := s.db.Where("id = ? AND user_id = ?", req.DocumentID, req.UserID).First(&doc).Error; err == nil {
			query = query.Where("document_id IN (?)",
				s.db.Model(&models.Document{}).
					Select("id").
					Where("user_id = ?", req.UserID),
			)
		}
	}

	if err := query.Find(&chunks).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch chunks: %w", err)
	}

	// Calculate similarities
	var results []SearchResult
	for _, chunk := range chunks {
		if len(chunk.Embedding) == 0 {
			continue
		}

		similarity := s.calculateCosineSimilarity(req.Query, chunk.Embedding)

		if req.Threshold > 0 && similarity < req.Threshold {
			continue
		}

		results = append(results, SearchResult{
			Chunk:      chunk,
			Similarity: similarity,
		})
	}

	// Sort by similarity (descending)
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Similarity > results[i].Similarity {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	// Return top K results
	if len(results) > req.TopK {
		results = results[:req.TopK]
	}

	return results, nil
}

// SaveChunk saves a chunk with its embedding
func (s *VectorStoreService) SaveChunk(chunk *models.Chunk) error {
	return s.db.Save(chunk).Error
}

// SaveChunks saves multiple chunks with embeddings
func (s *VectorStoreService) SaveChunks(chunks []models.Chunk) error {
	if len(chunks) == 0 {
		return nil
	}

	return s.db.Create(&chunks).Error
}

// GetChunksByDocumentID retrieves all chunks for a document
func (s *VectorStoreService) GetChunksByDocumentID(documentID string) ([]models.Chunk, error) {
	var chunks []models.Chunk
	err := s.db.Where("document_id = ?", documentID).Order("index ASC").Find(&chunks).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get chunks: %w", err)
	}
	return chunks, nil
}

// GetChunksByUserID retrieves all chunks for a user
func (s *VectorStoreService) GetChunksByUserID(userID string) ([]models.Chunk, error) {
	var chunks []models.Chunk
	err := s.db.Joins("JOIN documents ON chunks.document_id = documents.id").
		Where("documents.user_id = ?", userID).
		Order("chunks.created_at DESC").
		Find(&chunks).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get chunks: %w", err)
	}
	return chunks, nil
}

// DeleteChunksByDocumentID deletes all chunks for a document
func (s *VectorStoreService) DeleteChunksByDocumentID(documentID string) error {
	return s.db.Where("document_id = ?", documentID).Delete(&models.Chunk{}).Error
}

// calculateCosineSimilarity calculates cosine similarity between two embeddings
func (s *VectorStoreService) calculateCosineSimilarity(a, b []float64) float64 {
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

// GetEmbeddingStatistics returns statistics about stored embeddings
func (s *VectorStoreService) GetEmbeddingStatistics() (map[string]interface{}, error) {
	var totalChunks int64
	var chunksWithEmbeddings int64
	var totalDocuments int64

	s.db.Model(&models.Chunk{}).Count(&totalChunks)
	s.db.Model(&models.Chunk{}).Where("embedding IS NOT NULL").Count(&chunksWithEmbeddings)
	s.db.Model(&models.Document{}).Count(&totalDocuments)

	return map[string]interface{}{
		"total_chunks":              totalChunks,
		"chunks_with_embeddings":    chunksWithEmbeddings,
		"chunks_without_embeddings": totalChunks - chunksWithEmbeddings,
		"total_documents":           totalDocuments,
	}, nil
}
