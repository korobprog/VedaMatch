# RAG System Documentation

## Overview

This RAG (Retrieval-Augmented Generation) system provides a complete solution for uploading documents, creating embeddings, and performing semantic search with AI-powered responses.

## Features

- **Multi-format Document Support**: Parse and process PDF, text, and markdown files
- **Automatic Chunking**: Intelligently split documents into overlapping chunks
- **Vector Embeddings**: Create OpenAI embeddings for semantic similarity search
- **Similarity Search**: Retrieve the most relevant document chunks based on queries
- **AI-Powered Responses**: Generate contextual responses using retrieved information
- **Document Management**: Upload, list, retrieve, and delete documents
- **Chat Sessions**: Create and manage chat sessions with document context

## Architecture

### Core Components

1. **Document Parser** (`document_parser.go`)
   - Extracts text from PDF, text, and markdown files
   - Splits text into manageable chunks with overlap
   - Preserves metadata (page numbers, sections, etc.)

2. **Embedding Service** (`embedding_service.go`)
   - Creates vector embeddings using OpenAI API
   - Supports batch processing for efficiency
   - Calculates cosine similarity between embeddings

3. **Vector Store** (`vector_store_service.go`)
   - Stores embeddings in PostgreSQL database
   - Performs similarity search with configurable thresholds
   - Manages chunk metadata and statistics

4. **Retrieval Service** (`retrieval_service.go`)
   - Orchestrates the retrieval process
   - Generates contextual responses using OpenAI
   - Combines retrieval with generation

5. **RAG Pipeline Service** (`rag_pipeline_service.go`)
   - End-to-end document processing pipeline
   - Manages document lifecycle
   - Provides high-level RAG operations

## Database Schema

### Document
```go
type Document struct {
    ID        uuid.UUID      // Primary key
    Title     string         // Document title
    FileName  string         // Original filename
    FilePath  string         // File storage path
    FileSize  int64          // File size in bytes
    MimeType  string         // Content type
    Content   string         // Extracted text
    UserID    uuid.UUID      // Owner
    Status    string         // processing, ready
    Chunks    []Chunk        // Associated chunks
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### Chunk
```go
type Chunk struct {
    ID         uuid.UUID      // Primary key
    DocumentID uuid.UUID      // Parent document
    Content    string         // Chunk text
    Index      int           // Chunk index
    Embedding  []float64     // Vector embedding
    Metadata   ChunkMetadata // Additional info
    CreatedAt time.Time
}
```

### ChatSession
```go
type ChatSession struct {
    ID          uuid.UUID     // Primary key
    UserID      uuid.UUID     // Owner
    DocumentIDs []string      // Associated documents
    Title       string        // Session title
    Messages    []ChatMessage // Messages
    CreatedAt   time.Time
}
```

## API Endpoints

### Upload Document
```
POST /api/rag/documents/upload
Content-Type: multipart/form-data

Form Data:
- file: Document file (PDF, TXT, MD)
- title: Document title (optional)

Response:
{
  "documentId": "uuid",
  "chunkCount": 25,
  "status": "success"
}
```

### List Documents
```
GET /api/rag/documents

Response:
[
  {
    "id": "uuid",
    "title": "Document Title",
    "fileName": "doc.pdf",
    "status": "ready",
    "createdAt": "2024-01-07T10:00:00Z"
  }
]
```

### Get Document
```
GET /api/rag/documents/:id

Response:
{
  "id": "uuid",
  "title": "Document Title",
  "content": "Document content...",
  "chunks": [...]
}
```

### Delete Document
```
DELETE /api/rag/documents/:id

Response:
{
  "message": "Document deleted successfully"
}
```

### Query Documents (RAG)
```
POST /api/rag/query

Request Body:
{
  "query": "What is the main topic?",
  "documentId": "uuid",  // Optional
  "topK": 5              // Number of chunks to retrieve
}

Response:
{
  "answer": "The main topic is...",
  "query": "What is the main topic?",
  "sources": [
    {
      "content": "Document content...",
      "similarity": 0.89,
      "metadata": {...}
    }
  ],
  "chunkCount": 3,
  "totalRelevance": 2.67
}
```

### Get Statistics
```
GET /api/rag/statistics

Response:
{
  "totalChunks": 1250,
  "chunksWithEmbeddings": 1250,
  "totalDocuments": 25,
  "userDocuments": 10
}
```

### Create Chat Session
```
POST /api/rag/sessions

Request Body:
{
  "documentIds": ["uuid1", "uuid2"],
  "title": "My Chat Session"
}

Response:
{
  "id": "uuid",
  "title": "My Chat Session",
  "documentIds": [...]
}
```

### List Chat Sessions
```
GET /api/rag/sessions

Response:
[
  {
    "id": "uuid",
    "title": "My Chat Session",
    "createdAt": "2024-01-07T10:00:00Z"
  }
]
```

## Configuration

### Environment Variables

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...
API_OPEN_AI=sk-...

# OpenAI Embedding Model (optional, default: text-embedding-ada-002)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# OpenAI Chat Model (optional, default: gpt-4o)
OPENAI_CHAT_MODEL=gpt-4o
```

## Usage Examples

### 1. Upload a Document

```bash
curl -X POST http://localhost:3000/api/rag/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "title=My Document"
```

### 2. Query Documents

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the key features?",
    "topK": 5
  }'
```

### 3. List Documents

```bash
curl -X GET http://localhost:3000/api/rag/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Development

### Running the Server

```bash
cd server
go run cmd/api/main.go
```

### Running Tests

```bash
cd server
go test ./...
```

### Database Migration

The system requires PostgreSQL with the following tables:
- documents
- chunks
- chat_sessions
- chat_messages

Create tables using GORM auto-migration:

```go
database.DB.AutoMigrate(
  &models.Document{},
  &models.Chunk{},
  &models.ChatSession{},
  &models.ChatMessage{},
)
```

## Performance Considerations

### Chunking Strategy
- **Chunk Size**: 1000 characters (configurable)
- **Overlap**: 200 characters between chunks
- **Splitting**: Natural boundaries (paragraphs, sentences, words)

### Embedding Optimization
- Batch processing (up to 100 texts per request)
- Cached embeddings for repeated queries
- Efficient storage using PostgreSQL JSONB

### Search Performance
- Similarity threshold filtering
- Configurable top-K results
- Index on document_id for fast filtering

## Troubleshooting

### Document Upload Fails
- Check file format (PDF, TXT, MD only)
- Verify file size limits
- Check OpenAI API key is set
- Review server logs for errors

### No Results Returned
- Verify embeddings were created successfully
- Adjust similarity threshold
- Increase top-K parameter
- Check document content quality

### Slow Response Times
- Check OpenAI API rate limits
- Consider batch processing for multiple queries
- Monitor database query performance
- Implement caching for frequent queries

## Security Considerations

1. **Authentication**: All endpoints require valid user authentication
2. **Authorization**: Users can only access their own documents
3. **File Upload**: Validate file types and sizes
4. **API Keys**: Never expose OpenAI API keys in client code
5. **Rate Limiting**: Implement rate limiting for API endpoints

## Future Enhancements

- [ ] Support for additional document formats (DOCX, PPTX, etc.)
- [ ] Web scraping integration
- [ ] Advanced chunking strategies (semantic, fixed-size, custom)
- [ ] Hybrid search (keyword + semantic)
- [ ] Document summarization
- [ ] Multi-document comparison
- [ ] Export chat sessions
- [ ] Real-time streaming responses
- [ ] Custom RAG prompts
- [ ] Document versioning

## License

MIT
