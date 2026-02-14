package handlers

import (
	"log"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"mime/multipart"
)

type RAGHandler struct {
	ragService *services.RAGPipelineService
}

func NewRAGHandler(ragService *services.RAGPipelineService) *RAGHandler {
	return &RAGHandler{
		ragService: ragService,
	}
}

// UploadDocument uploads a document for RAG
func (h *RAGHandler) UploadDocument(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// Calculate deterministic UUID from uint ID for RAG service
	userUUID := uuid.NewMD5(uuid.NameSpaceDNS, []byte(strconv.Itoa(int(userID))))

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file uploaded"})
	}

	title := c.FormValue("title")
	if title == "" {
		title = file.Filename
	}

	req := services.UploadDocumentRequest{
		Title:  title,
		File:   file,
		UserID: userUUID,
	}

	result, err := h.ragService.UploadDocument(c.Context(), req)
	if err != nil {
		log.Printf("[RAG] Failed to upload document: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

// QueryDocuments performs a RAG query
func (h *RAGHandler) QueryDocuments(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userUUID := uuid.NewMD5(uuid.NameSpaceDNS, []byte(strconv.Itoa(int(userID))))

	type QueryRequest struct {
		Query      string `json:"query"`
		DocumentID string `json:"documentId"`
		TopK       int    `json:"topK"`
	}

	var req QueryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Query is required"})
	}

	result, err := h.ragService.QueryDocuments(c.Context(), userUUID, req.Query, req.DocumentID, req.TopK)
	if err != nil {
		log.Printf("[RAG] Failed to query documents: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

// ListDocuments lists all documents for a user
func (h *RAGHandler) ListDocuments(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userUUID := uuid.NewMD5(uuid.NameSpaceDNS, []byte(strconv.Itoa(int(userID))))

	documents, err := h.ragService.ListDocuments(userUUID)
	if err != nil {
		log.Printf("[RAG] Failed to list documents: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(documents)
}

// GetDocument retrieves a single document
func (h *RAGHandler) GetDocument(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userIDStr := strconv.Itoa(int(userID))
	documentID := c.Params("id")
	if documentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Document ID is required"})
	}

	document, err := h.ragService.GetDocument(documentID, userIDStr)
	if err != nil {
		log.Printf("[RAG] Failed to get document: %v", err)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Document not found"})
	}

	return c.JSON(document)
}

// DeleteDocument deletes a document
func (h *RAGHandler) DeleteDocument(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userIDStr := strconv.Itoa(int(userID))
	documentID := c.Params("id")
	if documentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Document ID is required"})
	}

	if err := h.ragService.DeleteDocument(documentID, userIDStr); err != nil {
		log.Printf("[RAG] Failed to delete document: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Document deleted successfully"})
}

// GetStatistics returns RAG system statistics
func (h *RAGHandler) GetStatistics(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userUUID := uuid.NewMD5(uuid.NameSpaceDNS, []byte(strconv.Itoa(int(userID))))

	stats, err := h.ragService.GetStatistics(userUUID)
	if err != nil {
		log.Printf("[RAG] Failed to get statistics: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(stats)
}

// CreateChatSession creates a new chat session
func (h *RAGHandler) CreateChatSession(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userUUID := uuid.NewMD5(uuid.NameSpaceDNS, []byte(strconv.Itoa(int(userID))))

	type CreateSessionRequest struct {
		DocumentIDs []string `json:"documentIds"`
		Title       string   `json:"title"`
	}

	var req CreateSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Title == "" {
		req.Title = "New Chat Session"
	}

	session, err := h.ragService.CreateChatSession(userUUID, req.DocumentIDs, req.Title)
	if err != nil {
		log.Printf("[RAG] Failed to create chat session: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(session)
}

// ListChatSessions lists all chat sessions for a user
func (h *RAGHandler) ListChatSessions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	userUUID := uuid.NewMD5(uuid.NameSpaceDNS, []byte(strconv.Itoa(int(userID))))

	sessions, err := h.ragService.ListChatSessions(userUUID)
	if err != nil {
		log.Printf("[RAG] Failed to list chat sessions: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(sessions)
}

// GetDomains lists available Domain Assistant domains and statuses
func (h *RAGHandler) GetDomains(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"domains": h.ragService.GetDomains(),
	})
}

// QueryHybrid performs hybrid retrieval (FTS + Vector + RRF) over domain data
func (h *RAGHandler) QueryHybrid(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req services.HybridQueryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Query is required"})
	}

	resp, err := h.ragService.QueryHybrid(c.Context(), userID, req)
	if err != nil {
		log.Printf("[RAG] Failed to query hybrid: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(resp)
}

// GetSource returns a single source by ID for citation detail pages
func (h *RAGHandler) GetSource(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	sourceID := c.Params("id")
	if sourceID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Source ID is required"})
	}

	includePrivate := c.Query("includePrivate") == "true"
	source, err := h.ragService.GetHybridSource(sourceID, userID, includePrivate)
	if err != nil {
		log.Printf("[RAG] Failed to get source: %v", err)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(source)
}

// FileHeader wraps multipart.FileHeader for the services
type FileHeader struct {
	Filename string
	Header   *multipart.FileHeader
	Size     int64
}

func (f *FileHeader) Open() (multipart.File, error) {
	return f.Header.Open()
}
