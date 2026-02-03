package services

import (
	"errors"
	"log"
	"rag-agent-server/internal/models"
	"time"

	"gorm.io/gorm"
)

// ShelterService handles shelter (accommodation) operations
type ShelterService struct {
	db         *gorm.DB
	mapService *MapService
}

// NewShelterService creates a new shelter service instance
func NewShelterService(db *gorm.DB, mapService *MapService) *ShelterService {
	return &ShelterService{
		db:         db,
		mapService: mapService,
	}
}

// ==================== SHELTER CRUD ====================

// CreateShelter creates a new shelter listing
func (s *ShelterService) CreateShelter(hostID uint, req models.ShelterCreateRequest) (*models.Shelter, error) {
	// Geocode if coordinates not provided
	lat := req.Latitude
	lng := req.Longitude
	if (lat == nil || lng == nil) && req.City != "" {
		if geocoded, err := s.mapService.GeocodeCity(req.City); err == nil {
			lat = &geocoded.Latitude
			lng = &geocoded.Longitude
		}
	}

	shelter := &models.Shelter{
		HostID:          hostID,
		Title:           req.Title,
		Description:     req.Description,
		Type:            req.Type,
		City:            req.City,
		Country:         req.Country,
		Address:         req.Address,
		Latitude:        lat,
		Longitude:       lng,
		NearTemple:      req.NearTemple,
		Capacity:        req.Capacity,
		Rooms:           req.Rooms,
		PricePerNight:   req.PricePerNight,
		MinStay:         req.MinStay,
		Amenities:       req.Amenities,
		VegetarianOnly:  req.VegetarianOnly,
		NoSmoking:       req.NoSmoking,
		NoAlcohol:       req.NoAlcohol,
		HouseRules:      req.HouseRules,
		Phone:           req.Phone,
		WhatsApp:        req.WhatsApp,
		Email:           req.Email,
		Photos:          req.Photos,
		SevaExchange:    req.SevaExchange,
		SevaDescription: req.SevaDescription,
		Status:          models.ShelterStatusActive, // Auto-approve for now
	}

	if shelter.Capacity == 0 {
		shelter.Capacity = 2
	}
	if shelter.Rooms == 0 {
		shelter.Rooms = 1
	}
	if shelter.MinStay == 0 {
		shelter.MinStay = 1
	}

	if err := s.db.Create(shelter).Error; err != nil {
		return nil, err
	}

	return shelter, nil
}

// GetShelter retrieves a shelter by ID
func (s *ShelterService) GetShelter(shelterID uint) (*models.Shelter, error) {
	var shelter models.Shelter
	err := s.db.Preload("Host").
		Preload("Reviews", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(10)
		}).
		Preload("Reviews.Author").
		First(&shelter, shelterID).Error
	if err != nil {
		return nil, err
	}

	// Increment views
	s.db.Model(&shelter).UpdateColumn("views_count", gorm.Expr("views_count + 1"))

	return &shelter, nil
}

// ListShelters returns a paginated list of shelters
func (s *ShelterService) ListShelters(filters models.ShelterFilters) ([]models.Shelter, int64, error) {
	query := s.db.Model(&models.Shelter{}).Where("status = ?", models.ShelterStatusActive)

	// Apply filters
	if filters.City != "" {
		query = query.Where("city ILIKE ?", "%"+filters.City+"%")
	}
	if filters.Type != "" {
		query = query.Where("type = ?", filters.Type)
	}
	if filters.MinRating != nil {
		query = query.Where("rating >= ?", *filters.MinRating)
	}
	if filters.SevaOnly {
		query = query.Where("seva_exchange = ?", true)
	}
	if filters.Search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ? OR near_temple ILIKE ?",
			"%"+filters.Search+"%", "%"+filters.Search+"%", "%"+filters.Search+"%")
	}

	// Geo filtering
	if filters.NearLat != nil && filters.NearLng != nil && filters.RadiusKm != nil {
		// Using Haversine approximation for bounding box
		latDelta := *filters.RadiusKm / 111.0         // ~111km per degree latitude
		lngDelta := *filters.RadiusKm / (111.0 * 0.7) // approximate for middle latitudes

		query = query.Where("latitude IS NOT NULL AND longitude IS NOT NULL").
			Where("latitude BETWEEN ? AND ?", *filters.NearLat-latDelta, *filters.NearLat+latDelta).
			Where("longitude BETWEEN ? AND ?", *filters.NearLng-lngDelta, *filters.NearLng+lngDelta)
	}

	// Count total
	var total int64
	query.Count(&total)

	// Pagination
	page := filters.Page
	if page < 1 {
		page = 1
	}
	limit := filters.Limit
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	var shelters []models.Shelter
	err := query.Preload("Host").
		Order("rating DESC, created_at DESC").
		Offset(offset).Limit(limit).
		Find(&shelters).Error

	return shelters, total, err
}

// UpdateShelter updates a shelter
func (s *ShelterService) UpdateShelter(shelterID uint, hostID uint, updates map[string]interface{}) (*models.Shelter, error) {
	var shelter models.Shelter
	if err := s.db.First(&shelter, shelterID).Error; err != nil {
		return nil, err
	}

	// Check ownership
	if shelter.HostID != hostID {
		return nil, errors.New("not authorized to update this shelter")
	}

	if err := s.db.Model(&shelter).Updates(updates).Error; err != nil {
		return nil, err
	}

	return &shelter, nil
}

// DeleteShelter soft deletes a shelter
func (s *ShelterService) DeleteShelter(shelterID uint, hostID uint) error {
	var shelter models.Shelter
	if err := s.db.First(&shelter, shelterID).Error; err != nil {
		return err
	}

	if shelter.HostID != hostID {
		return errors.New("not authorized to delete this shelter")
	}

	return s.db.Delete(&shelter).Error
}

// GetMyShelters returns shelters owned by user
func (s *ShelterService) GetMyShelters(hostID uint) ([]models.Shelter, error) {
	var shelters []models.Shelter
	err := s.db.Where("host_id = ?", hostID).
		Order("created_at DESC").
		Find(&shelters).Error
	return shelters, err
}

// ==================== REVIEWS ====================

// CreateReview creates a review for a shelter
func (s *ShelterService) CreateReview(shelterID uint, authorID uint, req models.ShelterReviewCreateRequest) (*models.ShelterReview, error) {
	// Check if shelter exists
	var shelter models.Shelter
	if err := s.db.First(&shelter, shelterID).Error; err != nil {
		return nil, err
	}

	// Check if user is the host (can't review own shelter)
	if shelter.HostID == authorID {
		return nil, errors.New("cannot review your own shelter")
	}

	// Check if already reviewed
	var existing models.ShelterReview
	if err := s.db.Where("shelter_id = ? AND author_id = ?", shelterID, authorID).First(&existing).Error; err == nil {
		return nil, errors.New("you have already reviewed this shelter")
	}

	review := &models.ShelterReview{
		ShelterID:         shelterID,
		AuthorID:          authorID,
		Rating:            req.Rating,
		CleanlinessRating: req.CleanlinessRating,
		LocationRating:    req.LocationRating,
		ValueRating:       req.ValueRating,
		HospitalityRating: req.HospitalityRating,
		Comment:           req.Comment,
		Photos:            req.Photos,
		SevaVerified:      req.SevaVerified,
	}

	// Parse dates if provided
	if req.StayedFrom != "" {
		if date, err := time.Parse("2006-01-02", req.StayedFrom); err == nil {
			review.StayedFrom = &date
		}
	}
	if req.StayedTo != "" {
		if date, err := time.Parse("2006-01-02", req.StayedTo); err == nil {
			review.StayedTo = &date
		}
	}

	if err := s.db.Create(review).Error; err != nil {
		return nil, err
	}

	// Update shelter rating
	s.updateShelterRating(shelterID)

	return review, nil
}

// GetShelterReviews returns reviews for a shelter
func (s *ShelterService) GetShelterReviews(shelterID uint, page, limit int) ([]models.ShelterReview, int64, error) {
	query := s.db.Model(&models.ShelterReview{}).Where("shelter_id = ?", shelterID)

	var total int64
	query.Count(&total)

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}
	offset := (page - 1) * limit

	var reviews []models.ShelterReview
	err := query.Preload("Author").
		Order("created_at DESC").
		Offset(offset).Limit(limit).
		Find(&reviews).Error

	return reviews, total, err
}

// DeleteReview deletes a review
func (s *ShelterService) DeleteReview(reviewID uint, authorID uint) error {
	var review models.ShelterReview
	if err := s.db.First(&review, reviewID).Error; err != nil {
		return err
	}

	if review.AuthorID != authorID {
		return errors.New("not authorized to delete this review")
	}

	shelterID := review.ShelterID

	if err := s.db.Delete(&review).Error; err != nil {
		return err
	}

	// Update shelter rating
	s.updateShelterRating(shelterID)

	return nil
}

// ==================== HELPERS ====================

func (s *ShelterService) updateShelterRating(shelterID uint) {
	var result struct {
		AvgRating float64
		Count     int64
	}

	s.db.Model(&models.ShelterReview{}).
		Select("AVG(rating) as avg_rating, COUNT(*) as count").
		Where("shelter_id = ?", shelterID).
		Scan(&result)

	s.db.Model(&models.Shelter{}).Where("id = ?", shelterID).
		Updates(map[string]interface{}{
			"rating":        result.AvgRating,
			"reviews_count": result.Count,
		})
}

// GetShelterMarkers returns shelter markers for map display
func (s *ShelterService) GetShelterMarkers(bbox models.MapBoundingBox, limit int) ([]models.MapMarker, int) {
	var shelters []models.Shelter
	query := s.db.Model(&models.Shelter{}).
		Where("status = ?", models.ShelterStatusActive).
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("latitude >= ? AND latitude <= ?", bbox.LatMin, bbox.LatMax).
		Where("longitude >= ? AND longitude <= ?", bbox.LngMin, bbox.LngMax)

	var total int64
	query.Count(&total)

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&shelters).Error; err != nil {
		log.Printf("[ShelterService] Error getting shelter markers: %v", err)
		return nil, 0
	}

	markers := make([]models.MapMarker, len(shelters))
	for i, shelter := range shelters {
		subtitle := shelter.City
		if shelter.NearTemple != "" {
			subtitle = "Near " + shelter.NearTemple
		}

		markers[i] = models.MapMarker{
			ID:        shelter.ID,
			Type:      "shelter",
			Title:     shelter.Title,
			Subtitle:  subtitle,
			Latitude:  *shelter.Latitude,
			Longitude: *shelter.Longitude,
			Category:  string(shelter.Type),
			Rating:    shelter.Rating,
			Status:    string(shelter.Status),
		}
	}

	truncated := 0
	if int(total) > len(markers) {
		truncated = int(total) - len(markers)
	}

	return markers, truncated
}

// GetSheltersByCity returns shelters in a specific city
func (s *ShelterService) GetSheltersByCity(city string, limit int) ([]models.Shelter, error) {
	var shelters []models.Shelter

	query := s.db.Where("city ILIKE ? AND status = ?", "%"+city+"%", models.ShelterStatusActive).
		Order("rating DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&shelters).Error
	return shelters, err
}
