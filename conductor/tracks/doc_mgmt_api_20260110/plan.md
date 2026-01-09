# Plan: Centralized Document Management API

## Phase 1: Database & Storage Layer
- [ ] Task: Create `Document` model in Go (GORM) and run migrations.
    - [ ] Subtask: Write Tests for Document model
    - [ ] Subtask: Implement Document model
- [ ] Task: Implement S3/Storage service interface for file uploads.
    - [ ] Subtask: Write Tests for Storage service
    - [ ] Subtask: Implement Storage service
- [ ] Task: Conductor - User Manual Verification 'Database & Storage Layer' (Protocol in workflow.md)

## Phase 2: API Endpoints (Upload & List)
- [ ] Task: Implement `POST /api/documents` handler for file upload.
    - [ ] Subtask: Write Tests for Upload handler
    - [ ] Subtask: Implement Upload handler
- [ ] Task: Implement `GET /api/documents` handler for listing.
    - [ ] Subtask: Write Tests for List handler
    - [ ] Subtask: Implement List handler
- [ ] Task: Conductor - User Manual Verification 'API Endpoints (Upload & List)' (Protocol in workflow.md)

## Phase 3: Python Pipeline Integration
- [ ] Task: Create a Go service to trigger Python indexing scripts.
    - [ ] Subtask: Write Tests for Python Runner service
    - [ ] Subtask: Implement Python Runner service
- [ ] Task: Connect Upload handler to trigger indexing after successful save.
    - [ ] Subtask: Write Tests for Integration
    - [ ] Subtask: Implement Integration logic
- [ ] Task: Conductor - User Manual Verification 'Python Pipeline Integration' (Protocol in workflow.md)

## Phase 4: Final Polish
- [ ] Task: Add error handling and status updates (Processing -> Indexed).
    - [ ] Subtask: Write Tests for Status updates
    - [ ] Subtask: Implement Status updates
- [ ] Task: Update `README.md` with new API documentation.
    - [ ] Subtask: Update Documentation
- [ ] Task: Conductor - User Manual Verification 'Final Polish' (Protocol in workflow.md)
