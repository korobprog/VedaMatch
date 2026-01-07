# Production Fix Notes

## What Was Fixed

### 1. **JWT Authentication Added**
- Added `github.com/golang-jwt/jwt/v5` library
- Implemented JWT token generation in `/api/login` endpoint
- Implemented JWT validation in `middleware.Protected()`
- Tokens expire after 7 days

### 2. **Security Fixes**
- Removed userId from URL parameters (prevents unauthorized access)
- Now userId is extracted from JWT token using `c.Locals("userId")`
- Protected routes now require valid JWT token

### 3. **Updated Routes**
Old routes → New routes:
- `/api/update-profile/:id` → `/api/update-profile`
- `/api/update-location/:id` → `/api/update-location`
- `/api/update-coordinates/:id` → `/api/update-coordinates`
- `/api/heartbeat/:id` → `/api/heartbeat`
- `/api/upload-avatar/:id` → `/api/upload-avatar`
- `/api/friends/:id` → `/api/friends`
- `/api/blocks/:id` → `/api/blocks`

### 4. **API Response Changes**
**Login endpoint (`/api/login`)** now returns:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### 5. **Required Environment Variables**
Add to `.env`:
```
JWT_SECRET=your-secret-key-change-this-in-production-min-32-chars
```

## Migration Steps for Production

### 1. Update Environment Variables
Add JWT_SECRET to your production server:
```bash
# Generate a secure random string
JWT_SECRET=$(openssl rand -base64 32)
```

### 2. Deploy New Code
1. Build new binary:
```bash
cd server
go build -o server ./cmd/api/main.go
```

2. Deploy to production server

3. Update `.env` with JWT_SECRET

4. Restart the server

### 3. Update Mobile App
Update API calls to:
1. **Include JWT token** in Authorization header:
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

2. **Remove userId from URL parameters**:
```typescript
// OLD
PUT /api/update-profile/5

// NEW
PUT /api/update-profile
```

## Testing

### Test Login
```bash
curl -X POST http://localhost:8081/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

Response should include `token` field.

### Test Protected Route
```bash
curl -X GET http://localhost:8081/api/friends \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Backend Changes Summary

### Modified Files:
1. `server/internal/middleware/auth.go` - Added JWT validation
2. `server/internal/handlers/auth_handler.go` - Added token generation, updated to use JWT userId
3. `server/internal/handlers/auth_location.go` - Updated to use JWT userId
4. `server/internal/handlers/location_handler.go` - Updated to use JWT userId
5. `server/cmd/api/main.go` - Updated routes to remove userId from URLs
6. `server/go.mod` - Added JWT dependency
7. `server/.env.example` - Added JWT_SECRET example

### Breaking Changes:
- **Frontend must be updated** to use new routes
- All protected endpoints now require valid JWT token
- Token must be sent in `Authorization: Bearer <token>` header
