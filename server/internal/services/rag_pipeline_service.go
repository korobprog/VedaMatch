package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"rag-agent-server/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RAGPipelineService orchestrates the complete RAG pipeline
type RAGPipelineService struct {
	db               *gorm.DB
	parser           *DocumentParser
	embeddingService *EmbeddingService
	vectorStore      *VectorStoreService
	retrievalService *RetrievalService
	domainAssistant  *DomainAssistantService
}

// NewRAGPipelineService creates a new RAG pipeline service
func NewRAGPipelineService(db *gorm.DB) *RAGPipelineService {
	parser := NewDocumentParser()
	embeddingService := NewEmbeddingService()
	vectorStore := NewVectorStoreService(db)
	retrievalService := NewRetrievalService(embeddingService, vectorStore)

	return &RAGPipelineService{
		db:               db,
		parser:           parser,
		embeddingService: embeddingService,
		vectorStore:      vectorStore,
		retrievalService: retrievalService,
		domainAssistant:  GetDomainAssistantService(),
	}
}

// UploadDocumentRequest represents a document upload request
type UploadDocumentRequest struct {
	Title  string
	File   *multipart.FileHeader
	UserID uuid.UUID
}

// UploadDocumentResult represents the result of document upload
type UploadDocumentResult struct {
	DocumentID     uuid.UUID
	ChunkCount     int
	Status         string
	ProcessingTime string
}

// UploadDocument uploads and processes a document
func (s *RAGPipelineService) UploadDocument(ctx context.Context, req UploadDocumentRequest) (*UploadDocumentResult, error) {
	// Open uploaded file
	src, err := req.File.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	// Create upload directory if it doesn't exist
	uploadDir := "uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Generate unique filename
	fileExt := filepath.Ext(req.File.Filename)
	uniqueFilename := uuid.New().String() + fileExt
	filePath := filepath.Join(uploadDir, uniqueFilename)

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := dst.ReadFrom(src); err != nil {
		return nil, fmt.Errorf("failed to save file: %w", err)
	}

	// Read file content
	content := make([]byte, req.File.Size)
	src.Seek(0, 0)
	if _, err := src.Read(content); err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Parse document
	docContent, err := s.parser.ParseDocument(content, req.File.Header.Get("Content-Type"), req.File.Filename)
	if err != nil {
		return nil, fmt.Errorf("failed to parse document: %w", err)
	}

	// Create document record
	document := &models.Document{
		ID:       uuid.New(),
		Title:    req.Title,
		FileName: req.File.Filename,
		FilePath: filePath,
		FileSize: req.File.Size,
		MimeType: req.File.Header.Get("Content-Type"),
		Content:  docContent.Text,
		UserID:   req.UserID,
		Status:   "processing",
	}

	if err := s.db.Create(document).Error; err != nil {
		return nil, fmt.Errorf("failed to create document record: %w", err)
	}

	// Chunk document
	chunksWithMetadata := s.parser.ChunkWithMetadata(docContent.Text, map[string]interface{}{
		"document_id": document.ID,
		"page_count":  docContent.PageCount,
	})

	// Create chunk records
	chunks := make([]models.Chunk, len(chunksWithMetadata))
	for i, chunkData := range chunksWithMetadata {
		chunkID := uuid.New()
		metadata := chunkData["metadata"].(map[string]interface{})

		chunks[i] = models.Chunk{
			ID:         chunkID,
			DocumentID: document.ID,
			Content:    chunkData["text"].(string),
			Index:      i,
			Metadata: models.ChunkMetadata{
				PageNumber:   getIntFromMetadata(metadata, "page_number", 0),
				SectionTitle: getStringFromMetadata(metadata, "section_title", ""),
				TokenCount:   len(chunkData["text"].(string)),
			},
		}
	}

	// Create embeddings
	if err := s.embeddingService.EmbedChunks(ctx, chunks); err != nil {
		return nil, fmt.Errorf("failed to create embeddings: %w", err)
	}

	// Save chunks
	if err := s.vectorStore.SaveChunks(chunks); err != nil {
		return nil, fmt.Errorf("failed to save chunks: %w", err)
	}

	// Update document status
	document.Status = "ready"
	if err := s.db.Save(document).Error; err != nil {
		return nil, fmt.Errorf("failed to update document status: %w", err)
	}

	return &UploadDocumentResult{
		DocumentID: document.ID,
		ChunkCount: len(chunks),
		Status:     "success",
	}, nil
}

// QueryDocuments performs a RAG query
func (s *RAGPipelineService) QueryDocuments(ctx context.Context, userID uuid.UUID, query string, documentID string, topK int) (*RAGResponse, error) {
	if topK == 0 {
		topK = 5
	}

	req := RAGRequest{
		Query:      query,
		DocumentID: documentID,
		TopK:       topK,
		Threshold:  0.7,
		UserID:     userID.String(),
	}

	return s.retrievalService.ExecuteRAG(ctx, req)
}

// SearchProducts performs a semantic search for products in the market
func (s *RAGPipelineService) SearchProducts(ctx context.Context, query string, topK int) ([]SearchResult, error) {
	if topK == 0 {
		topK = 5
	}

	embeddings, err := s.embeddingService.CreateEmbedding(ctx, query)
	if err != nil {
		return nil, err
	}

	req := SearchRequest{
		Query:     embeddings,
		TopK:      topK,
		Threshold: 0.5, // Lower threshold for products to get more results
	}

	// Optionally filter by document_id if we have a fixed one for products
	// doc, err := s.GetDocumentByTitle("Sattva Market AI Index", "")
	// if err == nil { req.DocumentID = doc.ID.String() }

	return s.vectorStore.Search(req)
}

// ListDocuments lists all documents for a user
func (s *RAGPipelineService) ListDocuments(userID uuid.UUID) ([]models.Document, error) {
	var documents []models.Document
	err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&documents).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list documents: %w", err)
	}
	return documents, nil
}

// GetDocument retrieves a document by ID
func (s *RAGPipelineService) GetDocument(documentID, userID string) (*models.Document, error) {
	var document models.Document
	err := s.db.Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}
	return &document, nil
}

// DeleteDocument deletes a document and all its chunks
func (s *RAGPipelineService) DeleteDocument(documentID, userID string) error {
	// Get document to verify ownership
	var document models.Document
	if err := s.db.Where("id = ? AND user_id = ?", documentID, userID).First(&document).Error; err != nil {
		return fmt.Errorf("document not found or access denied")
	}

	// Delete file
	if err := os.Remove(document.FilePath); err != nil {
		// Log but continue
		fmt.Printf("Warning: failed to delete file %s: %v\n", document.FilePath, err)
	}

	// Delete chunks
	if err := s.vectorStore.DeleteChunksByDocumentID(documentID); err != nil {
		return fmt.Errorf("failed to delete chunks: %w", err)
	}

	// Delete document
	if err := s.db.Delete(&document).Error; err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}

	return nil
}

// GetStatistics returns statistics about the RAG system
func (s *RAGPipelineService) GetStatistics(userID uuid.UUID) (map[string]interface{}, error) {
	stats, err := s.vectorStore.GetEmbeddingStatistics()
	if err != nil {
		return nil, err
	}

	// Add user-specific stats
	var userDocCount int64
	s.db.Model(&models.Document{}).Where("user_id = ?", userID).Count(&userDocCount)
	stats["user_documents"] = userDocCount

	return stats, nil
}

// CreateChatSession creates a new chat session
func (s *RAGPipelineService) CreateChatSession(userID uuid.UUID, documentIDs []string, title string) (*models.ChatSession, error) {
	session := &models.ChatSession{
		ID:          uuid.New(),
		UserID:      userID,
		DocumentIDs: models.StringArray(documentIDs),
		Title:       title,
	}

	if err := s.db.Create(session).Error; err != nil {
		return nil, fmt.Errorf("failed to create chat session: %w", err)
	}

	return session, nil
}

// ListChatSessions lists all chat sessions for a user
func (s *RAGPipelineService) ListChatSessions(userID uuid.UUID) ([]models.ChatSession, error) {
	var sessions []models.ChatSession
	err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&sessions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list chat sessions: %w", err)
	}
	return sessions, nil
}

// GetDomains returns domain availability for Domain Assistant hybrid retrieval.
func (s *RAGPipelineService) GetDomains() []DomainDescriptor {
	if s.domainAssistant == nil {
		return nil
	}
	return s.domainAssistant.ListDomains()
}

// QueryHybrid performs Domain Assistant hybrid retrieval (FTS + Vector + RRF).
func (s *RAGPipelineService) QueryHybrid(ctx context.Context, userID uint, req HybridQueryRequest) (*HybridQueryResponse, error) {
	if s.domainAssistant == nil {
		return nil, fmt.Errorf("domain assistant is not initialized")
	}
	return s.domainAssistant.QueryHybrid(ctx, req, userID)
}

// GetHybridSource returns source document details by source id.
func (s *RAGPipelineService) GetHybridSource(sourceID string, userID uint, includePrivate bool) (*models.AssistantDocument, error) {
	if s.domainAssistant == nil {
		return nil, fmt.Errorf("domain assistant is not initialized")
	}
	return s.domainAssistant.GetSourceByID(sourceID, userID, includePrivate)
}

// Helper functions
func getIntFromMetadata(m map[string]interface{}, key string, defaultValue int) int {
	if val, ok := m[key]; ok {
		if intVal, ok := val.(int); ok {
			return intVal
		}
		if floatVal, ok := val.(float64); ok {
			return int(floatVal)
		}
	}
	return defaultValue
}

func getStringFromMetadata(m map[string]interface{}, key, defaultValue string) string {
	if val, ok := m[key]; ok {
		if strVal, ok := val.(string); ok {
			return strVal
		}
	}
	return defaultValue
}
