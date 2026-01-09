# Specification: Centralized Document Management API

## 1. Overview
This track aims to implement a set of RESTful API endpoints in the Go backend to manage the document lifecycle. This will allow the Admin Dashboard and Mobile App to upload documents, trigger the Python-based indexing process, and retrieve document status, replacing manual script execution.

## 2. Goals
- Create API endpoints for document upload (supporting PDF, TXT).
- Integrate with the existing Python indexing scripts (triggering them via `os/exec` or a queue).
- Store document metadata in the PostgreSQL database.
- Provide status updates on indexing progress.

## 3. User Stories
- As an Admin, I want to upload a PDF file via the dashboard so that it can be added to the knowledge base.
- As an Admin, I want to see the list of indexed documents and their status (indexed, processing, error).
- As a Developer, I want a standard API to trigger the indexing pipeline without SSH-ing into the server.

## 4. API Definition
- `POST /api/documents`: Upload a file.
- `GET /api/documents`: List all documents.
- `GET /api/documents/:id`: Get specific document details.
- `DELETE /api/documents/:id`: Remove a document and its embeddings.

## 5. Technical Details
- **Database Schema**: Add `documents` table (id, filename, s3_key, status, created_at, updated_at).
- **Storage**: Use the existing S3-compatible logic (minio/local) for file storage.
- **Python Integration**: The Go server will execute the Python scripts (e.g., `src/rag_agent/main.py` or a wrapper) to process the uploaded file.
- **Authentication**: Ensure existing JWT middleware protects these routes.
