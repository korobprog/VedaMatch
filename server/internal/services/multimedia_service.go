package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"gorm.io/gorm"
)

type MultimediaService struct {
	db        *gorm.DB
	s3Client  *s3.Client
	bucket    string
	publicURL string
}

func NewMultimediaService() *MultimediaService {
	service := &MultimediaService{
		db:        database.DB,
		bucket:    os.Getenv("S3_BUCKET_NAME"),
		publicURL: os.Getenv("S3_PUBLIC_URL"),
	}

	// Initialize S3 client
	endpoint := os.Getenv("S3_ENDPOINT")
	region := os.Getenv("S3_REGION")
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_SECRET_KEY")

	if endpoint != "" && accessKey != "" && secretKey != "" {
		customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
			return aws.Endpoint{
				URL:           endpoint,
				SigningRegion: region,
			}, nil
		})

		cfg, err := config.LoadDefaultConfig(context.TODO(),
			config.WithRegion(region),
			config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
			config.WithEndpointResolverWithOptions(customResolver),
		)
		if err != nil {
			log.Printf("[MultimediaService] Failed to load S3 config: %v", err)
		} else {
			service.s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
				o.UsePathStyle = true // Required for many S3-compatible services
			})
			log.Println("[MultimediaService] S3 client initialized")
		}
	} else {
		log.Println("[MultimediaService] S3 not configured, file uploads disabled")
	}

	return service
}

// --- Categories ---

func (s *MultimediaService) GetCategories(mediaType string) ([]models.MediaCategory, error) {
	var categories []models.MediaCategory
	query := s.db.Where("is_active = ?", true).Order("sort_order ASC, name ASC")

	if mediaType != "" {
		query = query.Where("type = ?", mediaType)
	}

	err := query.Find(&categories).Error
	return categories, err
}

func (s *MultimediaService) CreateCategory(category *models.MediaCategory) error {
	return s.db.Create(category).Error
}

func (s *MultimediaService) UpdateCategory(id uint, updates map[string]interface{}) error {
	return s.db.Model(&models.MediaCategory{}).Where("id = ?", id).Updates(updates).Error
}

func (s *MultimediaService) DeleteCategory(id uint) error {
	return s.db.Delete(&models.MediaCategory{}, id).Error
}

// --- Tracks ---

type TrackFilter struct {
	MediaType  string
	CategoryID uint
	Madh       string
	YogaStyle  string
	Language   string
	Search     string
	Featured   bool
	Page       int
	Limit      int
}

type TrackListResponse struct {
	Tracks     []models.MediaTrack `json:"tracks"`
	Total      int64               `json:"total"`
	Page       int                 `json:"page"`
	TotalPages int                 `json:"totalPages"`
}

func (s *MultimediaService) GetTracks(filter TrackFilter) (*TrackListResponse, error) {
	var tracks []models.MediaTrack
	var total int64

	query := s.db.Model(&models.MediaTrack{}).Where("is_active = ?", true)

	if filter.MediaType != "" {
		query = query.Where("media_type = ?", filter.MediaType)
	}
	if filter.CategoryID > 0 {
		query = query.Where("category_id = ?", filter.CategoryID)
	}
	if filter.Madh != "" {
		query = query.Where("madh = ?", filter.Madh)
	}
	if filter.YogaStyle != "" {
		query = query.Where("yoga_style = ?", filter.YogaStyle)
	}
	if filter.Language != "" {
		query = query.Where("language = ?", filter.Language)
	}
	if filter.Search != "" {
		searchTerm := "%" + strings.ToLower(filter.Search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(artist) LIKE ? OR LOWER(album) LIKE ?",
			searchTerm, searchTerm, searchTerm)
	}
	if filter.Featured {
		query = query.Where("is_featured = ?", true)
	}

	// Count total
	query.Count(&total)

	// Pagination
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	offset := (filter.Page - 1) * filter.Limit

	err := query.Preload("Category").
		Order("is_featured DESC, created_at DESC").
		Offset(offset).
		Limit(filter.Limit).
		Find(&tracks).Error

	if err != nil {
		return nil, err
	}

	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit > 0 {
		totalPages++
	}

	return &TrackListResponse{
		Tracks:     tracks,
		Total:      total,
		Page:       filter.Page,
		TotalPages: totalPages,
	}, nil
}

func (s *MultimediaService) GetTrackByID(id uint) (*models.MediaTrack, error) {
	var track models.MediaTrack
	err := s.db.Preload("Category").First(&track, id).Error
	if err != nil {
		return nil, err
	}

	// Increment view count
	s.db.Model(&track).Update("view_count", gorm.Expr("view_count + 1"))

	return &track, nil
}

func (s *MultimediaService) CreateTrack(track *models.MediaTrack) error {
	now := time.Now()
	track.PublishedAt = &now
	return s.db.Create(track).Error
}

func (s *MultimediaService) UpdateTrack(id uint, updates map[string]interface{}) error {
	return s.db.Model(&models.MediaTrack{}).Where("id = ?", id).Updates(updates).Error
}

func (s *MultimediaService) DeleteTrack(id uint) error {
	return s.db.Delete(&models.MediaTrack{}, id).Error
}

// --- Radio Stations ---

func (s *MultimediaService) GetRadioStations(madh string) ([]models.RadioStation, error) {
	var stations []models.RadioStation
	query := s.db.Where("is_active = ?", true).Order("sort_order ASC, name ASC")

	if madh != "" {
		query = query.Where("madh = ?", madh)
	}

	err := query.Find(&stations).Error
	return stations, err
}

func (s *MultimediaService) GetRadioStationByID(id uint) (*models.RadioStation, error) {
	var station models.RadioStation
	err := s.db.First(&station, id).Error
	return &station, err
}

func (s *MultimediaService) CreateRadioStation(station *models.RadioStation) error {
	return s.db.Create(station).Error
}

func (s *MultimediaService) UpdateRadioStation(id uint, updates map[string]interface{}) error {
	return s.db.Model(&models.RadioStation{}).Where("id = ?", id).Updates(updates).Error
}

func (s *MultimediaService) DeleteRadioStation(id uint) error {
	return s.db.Delete(&models.RadioStation{}, id).Error
}

// --- TV Channels ---

func (s *MultimediaService) GetTVChannels(madh string) ([]models.TVChannel, error) {
	var channels []models.TVChannel
	query := s.db.Where("is_active = ?", true).Order("sort_order ASC, name ASC")

	if madh != "" {
		query = query.Where("madh = ?", madh)
	}

	err := query.Find(&channels).Error
	return channels, err
}

func (s *MultimediaService) GetTVChannelByID(id uint) (*models.TVChannel, error) {
	var channel models.TVChannel
	err := s.db.First(&channel, id).Error
	return &channel, err
}

func (s *MultimediaService) CreateTVChannel(channel *models.TVChannel) error {
	return s.db.Create(channel).Error
}

func (s *MultimediaService) UpdateTVChannel(id uint, updates map[string]interface{}) error {
	return s.db.Model(&models.TVChannel{}).Where("id = ?", id).Updates(updates).Error
}

func (s *MultimediaService) DeleteTVChannel(id uint) error {
	return s.db.Delete(&models.TVChannel{}, id).Error
}

// --- User Suggestions (UGC) ---

func (s *MultimediaService) CreateSuggestion(suggestion *models.UserMediaSuggestion) error {
	return s.db.Create(suggestion).Error
}

func (s *MultimediaService) GetPendingSuggestions() ([]models.UserMediaSuggestion, error) {
	var suggestions []models.UserMediaSuggestion
	err := s.db.Preload("User").Where("status = ?", "pending").
		Order("created_at ASC").Find(&suggestions).Error
	return suggestions, err
}

func (s *MultimediaService) ReviewSuggestion(id uint, status string, adminNote string, reviewerID uint) error {
	now := time.Now()
	return s.db.Model(&models.UserMediaSuggestion{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":         status,
		"admin_note":     adminNote,
		"reviewed_by_id": reviewerID,
		"reviewed_at":    now,
	}).Error
}

// --- S3 Upload ---

func (s *MultimediaService) UploadToS3(file *multipart.FileHeader, folder string) (string, error) {
	if s.s3Client == nil {
		return "", fmt.Errorf("S3 client not configured")
	}

	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	// Read file content
	content, err := io.ReadAll(src)
	if err != nil {
		return "", fmt.Errorf("failed to read file: %w", err)
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	timestamp := time.Now().UnixNano()
	key := fmt.Sprintf("%s/%d%s", folder, timestamp, ext)

	// Determine content type
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Upload to S3
	_, err = s.s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        strings.NewReader(string(content)),
		ContentType: aws.String(contentType),
		ACL:         "public-read",
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	// Return public URL
	url := fmt.Sprintf("%s/%s", s.publicURL, key)
	return url, nil
}

// --- Favorites ---

func (s *MultimediaService) AddToFavorites(userID, trackID uint) error {
	favorite := models.UserMediaFavorite{
		UserID:       userID,
		MediaTrackID: trackID,
	}
	return s.db.Create(&favorite).Error
}

func (s *MultimediaService) RemoveFromFavorites(userID, trackID uint) error {
	return s.db.Where("user_id = ? AND media_track_id = ?", userID, trackID).
		Delete(&models.UserMediaFavorite{}).Error
}

func (s *MultimediaService) GetUserFavorites(userID uint, page, limit int) ([]models.MediaTrack, int64, error) {
	var tracks []models.MediaTrack
	var total int64

	subQuery := s.db.Model(&models.UserMediaFavorite{}).
		Select("media_track_id").
		Where("user_id = ?", userID)

	query := s.db.Model(&models.MediaTrack{}).Where("id IN (?)", subQuery)
	query.Count(&total)

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	err := query.Preload("Category").Offset(offset).Limit(limit).Find(&tracks).Error
	return tracks, total, err
}

// --- Playback History ---

func (s *MultimediaService) UpdatePlaybackHistory(userID, trackID uint, progress int) error {
	var history models.UserMediaHistory
	err := s.db.Where("user_id = ? AND media_track_id = ?", userID, trackID).First(&history).Error

	if err == gorm.ErrRecordNotFound {
		history = models.UserMediaHistory{
			UserID:       userID,
			MediaTrackID: trackID,
			Progress:     progress,
		}
		return s.db.Create(&history).Error
	}

	return s.db.Model(&history).Update("progress", progress).Error
}

func (s *MultimediaService) GetPlaybackHistory(userID uint, limit int) ([]models.MediaTrack, error) {
	var tracks []models.MediaTrack

	if limit < 1 {
		limit = 20
	}

	err := s.db.Raw(`
		SELECT mt.* FROM media_tracks mt
		INNER JOIN user_media_history umh ON mt.id = umh.media_track_id
		WHERE umh.user_id = ?
		ORDER BY umh.updated_at DESC
		LIMIT ?
	`, userID, limit).Scan(&tracks).Error

	return tracks, err
}

// --- Stats for Admin ---

type MultimediaStats struct {
	TotalTracks        int64 `json:"totalTracks"`
	TotalAudioTracks   int64 `json:"totalAudioTracks"`
	TotalVideoTracks   int64 `json:"totalVideoTracks"`
	TotalRadioStations int64 `json:"totalRadioStations"`
	TotalTVChannels    int64 `json:"totalTVChannels"`
	TotalCategories    int64 `json:"totalCategories"`
	PendingSuggestions int64 `json:"pendingSuggestions"`
}

func (s *MultimediaService) GetStats() (*MultimediaStats, error) {
	var stats MultimediaStats

	s.db.Model(&models.MediaTrack{}).Count(&stats.TotalTracks)
	s.db.Model(&models.MediaTrack{}).Where("media_type = ?", "audio").Count(&stats.TotalAudioTracks)
	s.db.Model(&models.MediaTrack{}).Where("media_type = ?", "video").Count(&stats.TotalVideoTracks)
	s.db.Model(&models.RadioStation{}).Count(&stats.TotalRadioStations)
	s.db.Model(&models.TVChannel{}).Count(&stats.TotalTVChannels)
	s.db.Model(&models.MediaCategory{}).Count(&stats.TotalCategories)
	s.db.Model(&models.UserMediaSuggestion{}).Where("status = ?", "pending").Count(&stats.PendingSuggestions)

	return &stats, nil
}
