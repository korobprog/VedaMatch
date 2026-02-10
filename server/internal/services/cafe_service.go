package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/websocket"
	"strings"
	"time"

	"gorm.io/gorm"
)

// CafeService handles cafe-related operations
type CafeService struct {
	db         *gorm.DB
	mapService *MapService
}

// NewCafeService creates a new cafe service instance
func NewCafeService(db *gorm.DB, mapService *MapService) *CafeService {
	return &CafeService{
		db:         db,
		mapService: mapService,
	}
}

// ===== Cafe CRUD =====

// CreateCafe creates a new cafe
func (s *CafeService) CreateCafe(ownerID uint, req models.CafeCreateRequest) (*models.Cafe, error) {
	// Generate slug
	slug := s.generateSlug(req.Name)

	// Geocode if coordinates not provided
	lat := req.Latitude
	lng := req.Longitude
	if lat == nil || lng == nil {
		query := req.Address
		if req.City != "" {
			if query != "" {
				query = req.City + ", " + query
			} else {
				query = req.City
			}
		}

		if query != "" {
			// Try to geocode using the full address/city
			if geocoded, err := s.mapService.GeocodeLocation(query); err == nil {
				lat = &geocoded.Latitude
				lng = &geocoded.Longitude
			}
		}
	}

	cafe := &models.Cafe{
		OwnerID:      ownerID,
		Name:         req.Name,
		Slug:         slug,
		Description:  req.Description,
		City:         req.City,
		Address:      req.Address,
		Latitude:     lat,
		Longitude:    lng,
		Phone:        req.Phone,
		Email:        req.Email,
		Website:      req.Website,
		Telegram:     req.Telegram,
		Instagram:    req.Instagram,
		WorkingHours: req.WorkingHours,
		LogoURL:      req.LogoURL,
		CoverURL:     req.CoverURL,
		HasDelivery:  req.HasDelivery,
		HasTakeaway:  req.HasTakeaway,
		HasDineIn:    req.HasDineIn,
		Status:       models.CafeStatusActive,
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(cafe).Error; err != nil {
			return err
		}

		// Keep owner permissions consistent with created cafe.
		staff := &models.CafeStaff{
			CafeID:   cafe.ID,
			UserID:   ownerID,
			Role:     models.CafeStaffRoleAdmin,
			IsActive: true,
		}
		if err := tx.Create(staff).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return cafe, nil
}

// GetCafe retrieves a cafe by ID
func (s *CafeService) GetCafe(cafeID uint) (*models.CafeDetailResponse, error) {
	var cafe models.Cafe
	err := s.db.Preload("Owner").
		Preload("Categories", "is_active = ?", true).
		Preload("Categories.Dishes", "is_active = ? AND is_available = ?", true, true).
		Preload("Tables", "is_active = ?", true).
		First(&cafe, cafeID).Error

	if err != nil {
		return nil, err
	}

	response := &models.CafeDetailResponse{
		Cafe:       cafe,
		Categories: cafe.Categories,
		Tables:     cafe.Tables,
	}

	if cafe.Owner != nil {
		response.OwnerInfo = &models.CafeOwnerInfo{
			ID:            cafe.Owner.ID,
			SpiritualName: cafe.Owner.SpiritualName,
			KarmicName:    cafe.Owner.KarmicName,
			AvatarURL:     cafe.Owner.AvatarURL,
		}
	}

	return response, nil
}

// GetCafeBySlug retrieves a cafe by slug
func (s *CafeService) GetCafeBySlug(slug string) (*models.CafeDetailResponse, error) {
	var cafe models.Cafe
	err := s.db.Where("slug = ?", slug).First(&cafe).Error
	if err != nil {
		return nil, err
	}
	return s.GetCafe(cafe.ID)
}

// ListCafes returns a paginated list of cafes
func (s *CafeService) ListCafes(filters models.CafeFilters) (*models.CafeListResponse, error) {
	query := s.db.Model(&models.Cafe{})

	// Apply filters
	if filters.City != "" {
		query = query.Where("city ILIKE ?", "%"+filters.City+"%")
	}
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	} else {
		query = query.Where("status = ?", models.CafeStatusActive)
	}
	if filters.OwnerID != nil {
		query = query.Where("owner_id = ?", *filters.OwnerID)
	}
	if filters.Search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?",
			"%"+filters.Search+"%", "%"+filters.Search+"%")
	}
	if filters.MinRating != nil {
		query = query.Where("rating >= ?", *filters.MinRating)
	}
	if filters.HasDelivery != nil && *filters.HasDelivery {
		query = query.Where("has_delivery = ?", true)
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

	// Sorting
	switch filters.Sort {
	case "rating":
		query = query.Order("rating DESC")
	case "popular":
		query = query.Order("orders_count DESC")
	case "newest":
		query = query.Order("created_at DESC")
	default:
		query = query.Order("rating DESC, created_at DESC")
	}

	var cafes []models.Cafe
	err := query.Preload("Owner").
		Offset(offset).Limit(limit).
		Find(&cafes).Error
	if err != nil {
		return nil, err
	}

	// Build response
	responses := make([]models.CafeResponse, len(cafes))
	for i, cafe := range cafes {
		responses[i] = models.CafeResponse{Cafe: cafe}
		if cafe.Owner != nil {
			responses[i].OwnerInfo = &models.CafeOwnerInfo{
				ID:            cafe.Owner.ID,
				SpiritualName: cafe.Owner.SpiritualName,
				KarmicName:    cafe.Owner.KarmicName,
				AvatarURL:     cafe.Owner.AvatarURL,
			}
		}
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return &models.CafeListResponse{
		Cafes:      responses,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	}, nil
}

// GetMyCafe retrieves the cafe owned or managed by the user
func (s *CafeService) GetMyCafe(userID uint) (*models.Cafe, error) {
	var cafe models.Cafe
	// First try to find cafe where user is the owner
	err := s.db.Where("owner_id = ?", userID).First(&cafe).Error
	if err == nil {
		return &cafe, nil
	}

	// If not owner, try to find cafe where user is active staff
	var staff models.CafeStaff
	err = s.db.Where("user_id = ? AND is_active = ?", userID, true).First(&staff).Error
	if err == nil {
		err = s.db.First(&cafe, staff.CafeID).Error
		if err == nil {
			return &cafe, nil
		}
	}

	return nil, errors.New("cafe not found")
}

// UpdateCafe updates a cafe
func (s *CafeService) UpdateCafe(cafeID uint, req models.CafeUpdateRequest) (*models.Cafe, error) {
	var cafe models.Cafe
	if err := s.db.First(&cafe, cafeID).Error; err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
		updates["slug"] = s.generateSlug(*req.Name)
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.City != nil {
		updates["city"] = *req.City
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.Latitude != nil {
		updates["latitude"] = *req.Latitude
	}
	if req.Longitude != nil {
		updates["longitude"] = *req.Longitude
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Website != nil {
		updates["website"] = *req.Website
	}
	if req.Telegram != nil {
		updates["telegram"] = *req.Telegram
	}
	if req.Instagram != nil {
		updates["instagram"] = *req.Instagram
	}
	if req.WorkingHours != nil {
		updates["working_hours"] = *req.WorkingHours
	}
	if req.LogoURL != nil {
		updates["logo_url"] = *req.LogoURL
	}
	if req.CoverURL != nil {
		updates["cover_url"] = *req.CoverURL
	}
	if req.HasDelivery != nil {
		updates["has_delivery"] = *req.HasDelivery
	}
	if req.HasTakeaway != nil {
		updates["has_takeaway"] = *req.HasTakeaway
	}
	if req.HasDineIn != nil {
		updates["has_dine_in"] = *req.HasDineIn
	}
	if req.DeliveryRadiusM != nil {
		updates["delivery_radius_m"] = *req.DeliveryRadiusM
	}
	if req.MinOrderAmount != nil {
		updates["min_order_amount"] = *req.MinOrderAmount
	}
	if req.DeliveryFee != nil {
		updates["delivery_fee"] = *req.DeliveryFee
	}
	if req.AvgPrepTime != nil {
		updates["avg_prep_time"] = *req.AvgPrepTime
	}

	// Automatic geocoding on update if location changes and specific coords not provided
	if req.Latitude == nil && req.Longitude == nil {
		shouldGeocode := false
		newCity := cafe.City
		newAddress := cafe.Address

		if req.City != nil {
			newCity = *req.City
			shouldGeocode = true
		}
		if req.Address != nil {
			newAddress = *req.Address
			shouldGeocode = true
		}

		if shouldGeocode {
			query := newAddress
			if newCity != "" {
				if query != "" {
					query = newCity + ", " + query
				} else {
					query = newCity
				}
			}

			if query != "" {
				if geocoded, err := s.mapService.GeocodeLocation(query); err == nil {
					updates["latitude"] = geocoded.Latitude
					updates["longitude"] = geocoded.Longitude
				}
			}
		}
	}

	if len(updates) > 0 {
		if err := s.db.Model(&cafe).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	return &cafe, nil
}

// DeleteCafe deletes a cafe
func (s *CafeService) DeleteCafe(cafeID uint) error {
	return s.db.Delete(&models.Cafe{}, cafeID).Error
}

// ===== Tables =====

// CreateTable creates a new table
func (s *CafeService) CreateTable(cafeID uint, req models.CafeTableCreateRequest) (*models.CafeTable, error) {
	qrCodeID := s.generateQRCode(cafeID, req.Number)

	table := &models.CafeTable{
		CafeID:   cafeID,
		Number:   req.Number,
		Name:     req.Name,
		PosX:     req.PosX,
		PosY:     req.PosY,
		Seats:    req.Seats,
		IsActive: req.IsActive,
		QRCodeID: qrCodeID,
	}

	if table.Seats == 0 {
		table.Seats = 4
	}

	if err := s.db.Create(table).Error; err != nil {
		return nil, err
	}

	return table, nil
}

// GetTables returns all tables for a cafe
func (s *CafeService) GetTables(cafeID uint) ([]models.CafeTable, error) {
	var tables []models.CafeTable
	err := s.db.Where("cafe_id = ?", cafeID).Order("number").Find(&tables).Error
	if err != nil {
		return nil, err
	}

	for i := range tables {
		var reservation models.TableReservation
		now := time.Now()
		// Find next confirmed reservation starting after now
		if err := s.db.Where("table_id = ? AND start_time > ? AND status = ?", tables[i].ID, now, "confirmed").
			Order("start_time asc").First(&reservation).Error; err == nil {
			tables[i].UpcomingReservation = &reservation
		}
	}

	return tables, nil
}

// UpdateTable updates a table
func (s *CafeService) UpdateTable(tableID uint, req models.CafeTableUpdateRequest) (*models.CafeTable, error) {
	var table models.CafeTable
	if err := s.db.First(&table, tableID).Error; err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if req.Number != nil {
		updates["number"] = *req.Number
	}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.PosX != nil {
		updates["pos_x"] = *req.PosX
	}
	if req.PosY != nil {
		updates["pos_y"] = *req.PosY
	}
	if req.Seats != nil {
		updates["seats"] = *req.Seats
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		if err := s.db.Model(&table).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	return &table, nil
}

// UpdateFloorLayout updates multiple table positions
func (s *CafeService) UpdateFloorLayout(cafeID uint, req models.CafeFloorLayoutRequest) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		for _, pos := range req.Tables {
			if err := tx.Model(&models.CafeTable{}).
				Where("id = ? AND cafe_id = ?", pos.ID, cafeID).
				Updates(map[string]interface{}{
					"pos_x": pos.PosX,
					"pos_y": pos.PosY,
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// DeleteTable deletes a table
func (s *CafeService) DeleteTable(tableID uint) error {
	return s.db.Delete(&models.CafeTable{}, tableID).Error
}

// GetTableByQRCode finds a table by QR code
func (s *CafeService) GetTableByQRCode(qrCodeID string) (*models.QRCodeScanResponse, error) {
	var table models.CafeTable
	err := s.db.Where("qr_code_id = ?", qrCodeID).First(&table).Error
	if err != nil {
		return nil, err
	}

	var cafe models.Cafe
	if err := s.db.First(&cafe, table.CafeID).Error; err != nil {
		return nil, err
	}

	// Fetch upcoming reservation for this table
	var reservation models.TableReservation
	now := time.Now()
	if err := s.db.Where("table_id = ? AND start_time > ? AND status = ?", table.ID, now, "confirmed").
		Order("start_time asc").First(&reservation).Error; err == nil {
		table.UpcomingReservation = &reservation
	}

	response := &models.QRCodeScanResponse{
		CafeID:      cafe.ID,
		CafeName:    cafe.Name,
		TableID:     table.ID,
		TableNumber: table.Number,
		OrderType:   models.CafeOrderTypeDineIn,
		Table:       &table,
	}

	// Check for active order at this table
	if table.CurrentOrderID != nil {
		var order models.CafeOrder
		if err := s.db.Preload("Items").First(&order, *table.CurrentOrderID).Error; err == nil {
			response.ActiveOrder = &models.CafeOrderResponse{CafeOrder: order}
		}
	}

	return response, nil
}

// ===== Waiter Calls =====

// CreateWaiterCall creates a new waiter call
func (s *CafeService) CreateWaiterCall(cafeID uint, userID *uint, req models.WaiterCallRequest) (*models.WaiterCall, error) {
	call := &models.WaiterCall{
		CafeID:  cafeID,
		TableID: req.TableID,
		UserID:  userID,
		Reason:  req.Reason,
		Note:    req.Note,
		Status:  models.WaiterCallStatusPending,
	}

	if err := s.db.Create(call).Error; err != nil {
		return nil, err
	}

	// Get table info for notification
	var table models.CafeTable
	if err := s.db.First(&table, req.TableID).Error; err == nil {
		// Send WebSocket notification to cafe staff
		websocket.NotifyWaiterCall(cafeID, map[string]interface{}{
			"callId":      call.ID,
			"tableId":     req.TableID,
			"tableNumber": table.Number,
			"tableName":   table.Name,
			"reason":      call.Reason,
			"note":        call.Note,
		})
	}

	return call, nil
}

// GetActiveWaiterCalls returns active waiter calls for a cafe
func (s *CafeService) GetActiveWaiterCalls(cafeID uint) ([]models.WaiterCall, error) {
	var calls []models.WaiterCall
	err := s.db.Where("cafe_id = ? AND status IN ?", cafeID,
		[]models.WaiterCallStatus{models.WaiterCallStatusPending, models.WaiterCallStatusAcknowledged}).
		Preload("Table").Preload("User").
		Order("created_at ASC").
		Find(&calls).Error
	return calls, err
}

// AcknowledgeWaiterCall acknowledges a waiter call
func (s *CafeService) AcknowledgeWaiterCall(callID uint, staffUserID uint) error {
	now := time.Now()
	return s.db.Model(&models.WaiterCall{}).Where("id = ?", callID).
		Updates(map[string]interface{}{
			"status":     models.WaiterCallStatusAcknowledged,
			"handled_by": staffUserID,
			"handled_at": now,
		}).Error
}

// CompleteWaiterCall completes a waiter call
func (s *CafeService) CompleteWaiterCall(callID uint) error {
	now := time.Now()
	return s.db.Model(&models.WaiterCall{}).Where("id = ?", callID).
		Updates(map[string]interface{}{
			"status":       models.WaiterCallStatusCompleted,
			"completed_at": now,
		}).Error
}

// ===== Staff Management =====

// AddStaff adds a staff member to a cafe
func (s *CafeService) AddStaff(cafeID, userID uint, role models.CafeStaffRole) error {
	staff := &models.CafeStaff{
		CafeID:   cafeID,
		UserID:   userID,
		Role:     role,
		IsActive: true,
	}
	return s.db.Create(staff).Error
}

// RemoveStaff removes a staff member from a cafe
func (s *CafeService) RemoveStaff(cafeID, userID uint) error {
	return s.db.Where("cafe_id = ? AND user_id = ?", cafeID, userID).
		Delete(&models.CafeStaff{}).Error
}

// GetStaff returns all staff for a cafe
func (s *CafeService) GetStaff(cafeID uint) ([]models.CafeStaff, error) {
	var staff []models.CafeStaff
	err := s.db.Where("cafe_id = ? AND is_active = ?", cafeID, true).
		Preload("User").Find(&staff).Error
	return staff, err
}

// IsStaff checks if a user is staff of a cafe
func (s *CafeService) IsStaff(cafeID, userID uint) (bool, models.CafeStaffRole) {
	var staff models.CafeStaff
	err := s.db.Where("cafe_id = ? AND user_id = ? AND is_active = ?", cafeID, userID, true).
		First(&staff).Error
	if err != nil {
		return false, ""
	}
	return true, staff.Role
}

// IsCafeOwner checks if a user is the owner of a cafe
func (s *CafeService) IsCafeOwner(cafeID, userID uint) bool {
	var cafe models.Cafe
	err := s.db.First(&cafe, cafeID).Error
	if err != nil {
		return false
	}
	return cafe.OwnerID == userID
}

// ===== Helpers =====

func (s *CafeService) generateSlug(name string) string {
	// Simple slug generation
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	// Remove special characters
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		return -1
	}, slug)

	// Check uniqueness
	baseSlug := slug
	counter := 1
	for {
		var count int64
		s.db.Model(&models.Cafe{}).Where("slug = ?", slug).Count(&count)
		if count == 0 {
			break
		}
		slug = fmt.Sprintf("%s-%d", baseSlug, counter)
		counter++
	}

	return slug
}

func (s *CafeService) generateQRCode(cafeID uint, tableNumber string) string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return fmt.Sprintf("cafe_%d_table_%s_%s", cafeID, tableNumber, hex.EncodeToString(bytes))
}

// GetCafeMarkers returns cafe markers for the map
func (s *CafeService) GetCafeMarkers(bbox models.MapBoundingBox, userLat, userLng *float64, limit int) ([]models.MapMarker, int) {
	var cafes []models.Cafe
	query := s.db.Model(&models.Cafe{}).
		Where("status = ?", models.CafeStatusActive).
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Where("latitude >= ? AND latitude <= ?", bbox.LatMin, bbox.LatMax).
		Where("longitude >= ? AND longitude <= ?", bbox.LngMin, bbox.LngMax)

	var total int64
	query.Count(&total)

	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&cafes).Error; err != nil {
		log.Printf("[CafeService] Error getting cafe markers: %v", err)
		return nil, 0
	}

	markers := make([]models.MapMarker, len(cafes))
	for i, cafe := range cafes {
		markers[i] = models.MapMarker{
			ID:        cafe.ID,
			Type:      models.MarkerTypeCafe,
			Title:     cafe.Name,
			Subtitle:  cafe.Address,
			Latitude:  *cafe.Latitude,
			Longitude: *cafe.Longitude,
			AvatarURL: cafe.LogoURL,
			Category:  "cafe",
			Rating:    cafe.Rating,
			Status:    string(cafe.Status),
		}

		if userLat != nil && userLng != nil {
			markers[i].Distance = haversineDistance(*userLat, *userLng, *cafe.Latitude, *cafe.Longitude)
		}
	}

	truncated := 0
	if int(total) > len(markers) {
		truncated = int(total) - len(markers)
	}

	return markers, truncated
}

// GetCafeSummary returns cafe count by city for map clusters
func (s *CafeService) GetCafeSummary() (map[string]int, error) {
	var results []struct {
		City  string
		Count int
	}

	err := s.db.Model(&models.Cafe{}).
		Select("city, COUNT(*) as count").
		Where("status = ?", models.CafeStatusActive).
		Where("latitude IS NOT NULL AND longitude IS NOT NULL").
		Group("city").
		Find(&results).Error

	if err != nil {
		return nil, err
	}

	summary := make(map[string]int)
	for _, r := range results {
		summary[r.City] = r.Count
	}

	return summary, nil
}

// IncrementViews increments the views count for a cafe
func (s *CafeService) IncrementViews(cafeID uint) {
	s.db.Model(&models.Cafe{}).Where("id = ?", cafeID).
		UpdateColumn("views_count", gorm.Expr("views_count + 1"))
}

// ValidateDeliveryAddress checks if address is within delivery radius
func (s *CafeService) ValidateDeliveryAddress(cafeID uint, lat, lng float64) (bool, error) {
	var cafe models.Cafe
	if err := s.db.First(&cafe, cafeID).Error; err != nil {
		return false, err
	}

	if !cafe.HasDelivery {
		return false, errors.New("cafe does not offer delivery")
	}

	if cafe.Latitude == nil || cafe.Longitude == nil {
		return false, errors.New("cafe location not set")
	}

	distance := haversineDistance(*cafe.Latitude, *cafe.Longitude, lat, lng) * 1000 // Convert to meters
	return distance <= cafe.DeliveryRadiusM, nil
}
