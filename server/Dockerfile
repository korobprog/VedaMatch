FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy all files first
COPY . .

# Download dependencies and generate go.sum
RUN go mod tidy && go mod download

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/api/main.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates ffmpeg

WORKDIR /root/

COPY --from=builder /app/server .

EXPOSE 8000

CMD ["./server"]
