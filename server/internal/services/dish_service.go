package services

import (
	"log"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

// DishService handles dish/menu-related operations
type DishService struct {
	db *gorm.DB
}

// NewDishService creates a new dish service instance
func NewDishService(db *gorm.DB) *DishService {
	return &DishService{db: db}
}

// ===== Categories =====

// CreateCategory creates a new dish category
func (s *DishService) CreateCategory(cafeID uint, req models.DishCategoryCreateRequest) (*models.DishCategory, error) {
	category := &models.DishCategory{
		CafeID:      cafeID,
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		SortOrder:   req.SortOrder,
		IsActive:    true,
	}

	if err := s.db.Create(category).Error; err != nil {
		return nil, err
	}

	return category, nil
}

// GetCategories returns all categories for a cafe
func (s *DishService) GetCategories(cafeID uint, includeInactive bool) ([]models.DishCategory, error) {
	var categories []models.DishCategory
	query := s.db.Where("cafe_id = ?", cafeID)
	if !includeInactive {
		query = query.Where("is_active = ?", true)
	}
	err := query.Order("sort_order, name").Find(&categories).Error
	return categories, err
}

// UpdateCategory updates a category
func (s *DishService) UpdateCategory(categoryID uint, req models.DishCategoryUpdateRequest) (*models.DishCategory, error) {
	var category models.DishCategory
	if err := s.db.First(&category, categoryID).Error; err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		if err := s.db.Model(&category).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	return &category, nil
}

// DeleteCategory deletes a category
func (s *DishService) DeleteCategory(categoryID uint) error {
	return s.db.Delete(&models.DishCategory{}, categoryID).Error
}

// ===== Dishes =====

// CreateDish creates a new dish
func (s *DishService) CreateDish(cafeID uint, req models.DishCreateRequest) (*models.Dish, error) {
	dish := &models.Dish{
		CafeID:       cafeID,
		CategoryID:   req.CategoryID,
		Name:         req.Name,
		Description:  req.Description,
		Type:         req.Type,
		Price:        req.Price,
		OldPrice:     req.OldPrice,
		ImageURL:     req.ImageURL,
		ThumbURL:     req.ThumbURL,
		Calories:     req.Calories,
		Weight:       req.Weight,
		CookingTime:  req.CookingTime,
		IsVegetarian: req.IsVegetarian,
		IsVegan:      req.IsVegan,
		IsSpicy:      req.IsSpicy,
		IsGlutenFree: req.IsGlutenFree,
		IsActive:     true,
		IsAvailable:  true,
		IsFeatured:   req.IsFeatured,
		SortOrder:    req.SortOrder,
	}

	if dish.Type == "" {
		dish.Type = models.DishTypeFood
	}

	if err := s.db.Create(dish).Error; err != nil {
		return nil, err
	}

	return dish, nil
}

// GetDish returns a dish by ID
func (s *DishService) GetDish(dishID uint) (*models.Dish, error) {
	var dish models.Dish
	err := s.db.Preload("Category").
		Preload("Ingredients").
		Preload("Modifiers").
		First(&dish, dishID).Error
	return &dish, err
}

// ListDishes returns a paginated list of dishes
func (s *DishService) ListDishes(filters models.DishFilters) (*models.DishListResponse, error) {
	query := s.db.Model(&models.Dish{}).Where("cafe_id = ?", filters.CafeID)

	// Apply filters
	if filters.CategoryID != nil {
		query = query.Where("category_id = ?", *filters.CategoryID)
	}
	if filters.Type != "" {
		query = query.Where("type = ?", filters.Type)
	}
	if filters.IsVegetarian != nil && *filters.IsVegetarian {
		query = query.Where("is_vegetarian = ?", true)
	}
	if filters.IsVegan != nil && *filters.IsVegan {
		query = query.Where("is_vegan = ?", true)
	}
	if filters.IsAvailable != nil {
		query = query.Where("is_available = ?", *filters.IsAvailable)
	} else {
		query = query.Where("is_active = ? AND is_available = ?", true, true)
	}
	if filters.IsFeatured != nil && *filters.IsFeatured {
		query = query.Where("is_featured = ?", true)
	}
	if filters.Search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?",
			"%"+filters.Search+"%", "%"+filters.Search+"%")
	}
	if filters.MinPrice != nil {
		query = query.Where("price >= ?", *filters.MinPrice)
	}
	if filters.MaxPrice != nil {
		query = query.Where("price <= ?", *filters.MaxPrice)
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
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	// Sorting
	switch filters.Sort {
	case "popular":
		query = query.Order("orders_count DESC")
	case "price_asc":
		query = query.Order("price ASC")
	case "price_desc":
		query = query.Order("price DESC")
	case "rating":
		query = query.Order("rating DESC")
	default:
		query = query.Order("sort_order, name")
	}

	var dishes []models.Dish
	err := query.Preload("Category").
		Offset(offset).Limit(limit).
		Find(&dishes).Error
	if err != nil {
		return nil, err
	}

	// Build response
	responses := make([]models.DishResponse, len(dishes))
	for i, dish := range dishes {
		responses[i] = models.DishResponse{Dish: dish}
		if dish.Category != nil {
			responses[i].CategoryName = dish.Category.Name
		}
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	return &models.DishListResponse{
		Dishes:     responses,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	}, nil
}

// UpdateDish updates a dish
func (s *DishService) UpdateDish(dishID uint, req models.DishUpdateRequest) (*models.Dish, error) {
	var dish models.Dish
	if err := s.db.First(&dish, dishID).Error; err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	if req.CategoryID != nil {
		updates["category_id"] = *req.CategoryID
	}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Type != nil {
		updates["type"] = *req.Type
	}
	if req.Price != nil {
		updates["price"] = *req.Price
	}
	if req.OldPrice != nil {
		updates["old_price"] = *req.OldPrice
	}
	if req.ImageURL != nil {
		updates["image_url"] = *req.ImageURL
	}
	if req.ThumbURL != nil {
		updates["thumb_url"] = *req.ThumbURL
	}
	if req.Calories != nil {
		updates["calories"] = *req.Calories
	}
	if req.Weight != nil {
		updates["weight"] = *req.Weight
	}
	if req.CookingTime != nil {
		updates["cooking_time"] = *req.CookingTime
	}
	if req.IsVegetarian != nil {
		updates["is_vegetarian"] = *req.IsVegetarian
	}
	if req.IsVegan != nil {
		updates["is_vegan"] = *req.IsVegan
	}
	if req.IsSpicy != nil {
		updates["is_spicy"] = *req.IsSpicy
	}
	if req.IsGlutenFree != nil {
		updates["is_gluten_free"] = *req.IsGlutenFree
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.IsAvailable != nil {
		updates["is_available"] = *req.IsAvailable
	}
	if req.IsFeatured != nil {
		updates["is_featured"] = *req.IsFeatured
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	if len(updates) > 0 {
		if err := s.db.Model(&dish).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	return &dish, nil
}

// DeleteDish deletes a dish
func (s *DishService) DeleteDish(dishID uint) error {
	return s.db.Delete(&models.Dish{}, dishID).Error
}

// ===== Stop List =====

// UpdateStopList bulk updates dish availability
func (s *DishService) UpdateStopList(cafeID uint, req models.StopListUpdateRequest) error {
	return s.db.Model(&models.Dish{}).
		Where("cafe_id = ? AND id IN ?", cafeID, req.DishIDs).
		Update("is_available", req.IsAvailable).Error
}

// GetStopList returns all dishes that are unavailable
func (s *DishService) GetStopList(cafeID uint) ([]models.Dish, error) {
	var dishes []models.Dish
	err := s.db.Where("cafe_id = ? AND is_available = ?", cafeID, false).
		Preload("Category").
		Find(&dishes).Error
	return dishes, err
}

// ===== Ingredients =====

// AddIngredient adds an ingredient to a dish
func (s *DishService) AddIngredient(dishID uint, req models.DishIngredientRequest) (*models.DishIngredient, error) {
	ingredient := &models.DishIngredient{
		DishID:      dishID,
		Name:        req.Name,
		IsRemovable: req.IsRemovable,
		IsAllergen:  req.IsAllergen,
	}

	if err := s.db.Create(ingredient).Error; err != nil {
		return nil, err
	}

	return ingredient, nil
}

// GetIngredients returns all ingredients for a dish
func (s *DishService) GetIngredients(dishID uint) ([]models.DishIngredient, error) {
	var ingredients []models.DishIngredient
	err := s.db.Where("dish_id = ?", dishID).Find(&ingredients).Error
	return ingredients, err
}

// DeleteIngredient deletes an ingredient
func (s *DishService) DeleteIngredient(ingredientID uint) error {
	return s.db.Delete(&models.DishIngredient{}, ingredientID).Error
}

// ===== Modifiers =====

// AddModifier adds a modifier to a dish
func (s *DishService) AddModifier(dishID uint, req models.DishModifierRequest) (*models.DishModifier, error) {
	modifier := &models.DishModifier{
		DishID:      dishID,
		Name:        req.Name,
		Price:       req.Price,
		IsDefault:   req.IsDefault,
		IsAvailable: true,
		MaxQuantity: req.MaxQuantity,
		GroupName:   req.GroupName,
		IsRequired:  req.IsRequired,
	}

	if modifier.MaxQuantity == 0 {
		modifier.MaxQuantity = 1
	}

	if err := s.db.Create(modifier).Error; err != nil {
		return nil, err
	}

	return modifier, nil
}

// GetModifiers returns all modifiers for a dish
func (s *DishService) GetModifiers(dishID uint) ([]models.DishModifier, error) {
	var modifiers []models.DishModifier
	err := s.db.Where("dish_id = ?", dishID).Find(&modifiers).Error
	return modifiers, err
}

// UpdateModifier updates a modifier
func (s *DishService) UpdateModifier(modifierID uint, isAvailable bool) error {
	return s.db.Model(&models.DishModifier{}).Where("id = ?", modifierID).
		Update("is_available", isAvailable).Error
}

// DeleteModifier deletes a modifier
func (s *DishService) DeleteModifier(modifierID uint) error {
	return s.db.Delete(&models.DishModifier{}, modifierID).Error
}

// ===== Menu =====

// GetFullMenu returns the complete menu for a cafe
func (s *DishService) GetFullMenu(cafeID uint) (*models.MenuResponse, error) {
	var categories []models.DishCategory
	err := s.db.Where("cafe_id = ? AND is_active = ?", cafeID, true).
		Preload("Dishes", "is_active = ? AND is_available = ?", true, true).
		Preload("Dishes.Ingredients").
		Preload("Dishes.Modifiers", "is_available = ?", true).
		Order("sort_order, name").
		Find(&categories).Error

	if err != nil {
		return nil, err
	}

	menuCategories := make([]models.MenuCategory, len(categories))
	totalDishes := 0
	for i, cat := range categories {
		menuCategories[i] = models.MenuCategory{
			DishCategory: cat,
			Dishes:       cat.Dishes,
		}
		totalDishes += len(cat.Dishes)
	}

	return &models.MenuResponse{
		Categories:  menuCategories,
		TotalDishes: totalDishes,
	}, nil
}

// GetFeaturedDishes returns featured dishes for a cafe
func (s *DishService) GetFeaturedDishes(cafeID uint, limit int) ([]models.Dish, error) {
	if limit <= 0 {
		limit = 10
	}

	var dishes []models.Dish
	err := s.db.Where("cafe_id = ? AND is_active = ? AND is_available = ? AND is_featured = ?",
		cafeID, true, true, true).
		Preload("Category").
		Limit(limit).
		Order("orders_count DESC").
		Find(&dishes).Error

	return dishes, err
}

// IncrementDishOrders increments the order count for dishes
func (s *DishService) IncrementDishOrders(dishIDs []uint) {
	if len(dishIDs) == 0 {
		return
	}
	s.db.Model(&models.Dish{}).Where("id IN ?", dishIDs).
		UpdateColumn("orders_count", gorm.Expr("orders_count + 1"))
}

// SearchDishes searches dishes across all cafes or within a specific cafe
func (s *DishService) SearchDishes(query string, cafeID *uint, limit int) ([]models.DishResponse, error) {
	if limit <= 0 {
		limit = 20
	}

	dbQuery := s.db.Model(&models.Dish{}).
		Where("is_active = ? AND is_available = ?", true, true).
		Where("name ILIKE ? OR description ILIKE ?", "%"+query+"%", "%"+query+"%")

	if cafeID != nil {
		dbQuery = dbQuery.Where("cafe_id = ?", *cafeID)
	}

	var dishes []models.Dish
	err := dbQuery.Preload("Category").Limit(limit).Find(&dishes).Error
	if err != nil {
		log.Printf("[DishService] Error searching dishes: %v", err)
		return nil, err
	}

	responses := make([]models.DishResponse, len(dishes))
	for i, dish := range dishes {
		responses[i] = models.DishResponse{Dish: dish}
		if dish.Category != nil {
			responses[i].CategoryName = dish.Category.Name
		}
	}

	return responses, nil
}
