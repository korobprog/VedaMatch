package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisService manages Redis connections and operations
type RedisService struct {
	client *redis.Client
	ctx    context.Context
}

// TranscodingJob represents a video transcoding task
type TranscodingJob struct {
	ID          string    `json:"id"`
	VideoID     uint      `json:"video_id"`
	InputPath   string    `json:"input_path"`
	OutputPath  string    `json:"output_path"`
	Qualities   []string  `json:"qualities"`
	Status      string    `json:"status"` // pending, processing, completed, failed
	Progress    int       `json:"progress"`
	Error       string    `json:"error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	StartedAt   time.Time `json:"started_at,omitempty"`
	CompletedAt time.Time `json:"completed_at,omitempty"`
}

// Queue names
const (
	TranscodingQueue    = "transcoding:queue"
	TranscodingProgress = "transcoding:progress"
	VideoCache          = "video:cache"
	UserProgress        = "user:progress"
)

var redisInstance *RedisService

// NewRedisService creates a new Redis service instance
func NewRedisService() *RedisService {
	if redisInstance != nil {
		return redisInstance
	}

	host := os.Getenv("REDIS_HOST")
	if host == "" {
		host = "localhost"
	}

	port := os.Getenv("REDIS_PORT")
	if port == "" {
		port = "6379"
	}

	password := os.Getenv("REDIS_PASSWORD")

	db := 0
	if dbStr := os.Getenv("REDIS_DB"); dbStr != "" {
		if parsed, err := strconv.Atoi(dbStr); err == nil {
			db = parsed
		}
	}

	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: password,
		DB:       db,
	})

	ctx := context.Background()

	// Test connection
	_, err := client.Ping(ctx).Result()
	if err != nil {
		log.Printf("⚠️ Redis connection failed: %v (continuing without Redis)", err)
		// Return service anyway - will work in degraded mode
	} else {
		log.Println("✅ Redis connected successfully")
	}

	redisInstance = &RedisService{
		client: client,
		ctx:    ctx,
	}

	return redisInstance
}

// GetClient returns the underlying Redis client
func (r *RedisService) GetClient() *redis.Client {
	return r.client
}

// IsConnected checks if Redis is available
func (r *RedisService) IsConnected() bool {
	if r.client == nil {
		return false
	}
	_, err := r.client.Ping(r.ctx).Result()
	return err == nil
}

// ==================== Transcoding Queue ====================

// AddTranscodingJob adds a new job to the transcoding queue
func (r *RedisService) AddTranscodingJob(job *TranscodingJob) error {
	if !r.IsConnected() {
		return fmt.Errorf("redis not connected")
	}

	job.CreatedAt = time.Now()
	job.Status = "pending"

	data, err := json.Marshal(job)
	if err != nil {
		return err
	}

	// Add to queue (LPUSH for FIFO with RPOP)
	return r.client.LPush(r.ctx, TranscodingQueue, data).Err()
}

// GetNextTranscodingJob retrieves and removes the next job from queue
func (r *RedisService) GetNextTranscodingJob() (*TranscodingJob, error) {
	if !r.IsConnected() {
		return nil, fmt.Errorf("redis not connected")
	}

	// Blocking pop with 5 second timeout
	result, err := r.client.BRPop(r.ctx, 5*time.Second, TranscodingQueue).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // No job available
		}
		return nil, err
	}

	var job TranscodingJob
	if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
		return nil, err
	}

	return &job, nil
}

// UpdateTranscodingProgress updates job progress
func (r *RedisService) UpdateTranscodingProgress(jobID string, progress int, status string) error {
	if !r.IsConnected() {
		return nil // Silently ignore if Redis not available
	}

	key := fmt.Sprintf("%s:%s", TranscodingProgress, jobID)
	data := map[string]interface{}{
		"progress": progress,
		"status":   status,
		"updated":  time.Now().Unix(),
	}

	return r.client.HSet(r.ctx, key, data).Err()
}

// GetTranscodingProgress gets current job progress
func (r *RedisService) GetTranscodingProgress(jobID string) (int, string, error) {
	if !r.IsConnected() {
		return 0, "unknown", nil
	}

	key := fmt.Sprintf("%s:%s", TranscodingProgress, jobID)
	result, err := r.client.HGetAll(r.ctx, key).Result()
	if err != nil {
		return 0, "unknown", err
	}

	progress := 0
	if p, ok := result["progress"]; ok {
		progress, _ = strconv.Atoi(p)
	}

	status := result["status"]
	if status == "" {
		status = "unknown"
	}

	return progress, status, nil
}

// GetQueueLength returns number of pending jobs
func (r *RedisService) GetQueueLength() (int64, error) {
	if !r.IsConnected() {
		return 0, nil
	}
	return r.client.LLen(r.ctx, TranscodingQueue).Result()
}

// ==================== Video Cache ====================

// CacheVideoMetadata caches video metadata for fast access
func (r *RedisService) CacheVideoMetadata(videoID uint, data interface{}, ttl time.Duration) error {
	if !r.IsConnected() {
		return nil
	}

	key := fmt.Sprintf("%s:%d", VideoCache, videoID)
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return r.client.Set(r.ctx, key, jsonData, ttl).Err()
}

// GetCachedVideoMetadata retrieves cached video metadata
func (r *RedisService) GetCachedVideoMetadata(videoID uint, dest interface{}) error {
	if !r.IsConnected() {
		return fmt.Errorf("redis not connected")
	}

	key := fmt.Sprintf("%s:%d", VideoCache, videoID)
	data, err := r.client.Get(r.ctx, key).Result()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(data), dest)
}

// InvalidateVideoCache removes video from cache
func (r *RedisService) InvalidateVideoCache(videoID uint) error {
	if !r.IsConnected() {
		return nil
	}

	key := fmt.Sprintf("%s:%d", VideoCache, videoID)
	return r.client.Del(r.ctx, key).Err()
}

// ==================== User Watch Progress ====================

// SaveUserProgress saves user's video watch progress (fast, in Redis)
func (r *RedisService) SaveUserProgress(userID, videoID uint, position int) error {
	if !r.IsConnected() {
		return nil // Will fallback to DB
	}

	key := fmt.Sprintf("%s:%d:%d", UserProgress, userID, videoID)
	data := map[string]interface{}{
		"position": position,
		"updated":  time.Now().Unix(),
	}

	// TTL 7 days - sync to DB periodically
	return r.client.HSet(r.ctx, key, data).Err()
}

// GetUserProgress gets user's video watch progress from Redis
func (r *RedisService) GetUserProgress(userID, videoID uint) (int, error) {
	if !r.IsConnected() {
		return 0, fmt.Errorf("redis not connected")
	}

	key := fmt.Sprintf("%s:%d:%d", UserProgress, userID, videoID)
	result, err := r.client.HGet(r.ctx, key, "position").Result()
	if err != nil {
		return 0, err
	}

	return strconv.Atoi(result)
}

// ==================== Rate Limiting ====================

// CheckRateLimit checks if user exceeded rate limit
func (r *RedisService) CheckRateLimit(key string, limit int, window time.Duration) (bool, error) {
	if !r.IsConnected() {
		return true, nil // Allow if Redis not available
	}

	current, err := r.client.Incr(r.ctx, key).Result()
	if err != nil {
		return true, err
	}

	if current == 1 {
		r.client.Expire(r.ctx, key, window)
	}

	return current <= int64(limit), nil
}

// ==================== Pub/Sub for Real-time Updates ====================

// PublishProgress publishes transcoding progress for real-time updates
func (r *RedisService) PublishProgress(jobID string, progress int, status string) error {
	if !r.IsConnected() {
		return nil
	}

	data := map[string]interface{}{
		"job_id":   jobID,
		"progress": progress,
		"status":   status,
	}

	jsonData, _ := json.Marshal(data)
	return r.client.Publish(r.ctx, "transcoding:updates", jsonData).Err()
}

// Close closes the Redis connection
func (r *RedisService) Close() error {
	if r.client != nil {
		return r.client.Close()
	}
	return nil
}
