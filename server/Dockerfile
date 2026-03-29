FROM golang:1.23-alpine AS builder

WORKDIR /app

# Download dependencies first for a stable cached layer.
COPY go.mod go.sum ./
RUN go mod download

# Copy sources after dependencies are cached.
COPY . .

# Build applications
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/api/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/feed-worker ./cmd/feed_worker/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/media-worker ./cmd/media_worker/main.go
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/dating-moderation-worker ./cmd/dating_moderation_worker/main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates ffmpeg

WORKDIR /root/

COPY --from=builder /app/server .
COPY --from=builder /app/feed-worker .
COPY --from=builder /app/media-worker .
COPY --from=builder /app/dating-moderation-worker .

EXPOSE 8000

CMD ["./server"]
