package services

import (
	"gorm.io/gorm"
)

// YatraAnalyticsService handles analytics and statistics for yatras
type YatraAnalyticsService struct {
	db *gorm.DB
}

// NewYatraAnalyticsService creates a new analytics service
func NewYatraAnalyticsService(db *gorm.DB) *YatraAnalyticsService {
	return &YatraAnalyticsService{db: db}
}

// OrganizerRanking represents an organizer with stats for ranking
type OrganizerRanking struct {
	UserID            uint    `json:"userId"`
	Name              string  `json:"name"`
	Avatar            string  `json:"avatar"`
	TotalYatras       int     `json:"totalYatras"`
	CompletedYatras   int     `json:"completedYatras"`
	AverageRating     float64 `json:"averageRating"`
	TotalReviews      int     `json:"totalReviews"`
	TotalParticipants int     `json:"totalParticipants"`
}

// GeographyPoint represents a geographic data point for map visualization
type GeographyPoint struct {
	City      string  `json:"city"`
	Country   string  `json:"country"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Count     int     `json:"count"`
	Theme     string  `json:"theme"` // Most popular theme in this location
}

// ThemeTrend represents popularity of each yatra theme
type ThemeTrend struct {
	Theme  string  `json:"theme"`
	Count  int     `json:"count"`
	Growth float64 `json:"growth"` // % change from previous period
}

// TimeTrend represents yatra creation trend over time
type TimeTrend struct {
	Period string `json:"period"` // "2024-01", "2024-02", etc.
	Count  int    `json:"count"`
	Status string `json:"status"` // optional status filter
}

// GetTopOrganizers returns top organizers by various metrics
func (s *YatraAnalyticsService) GetTopOrganizers(limit int, orderBy string) ([]OrganizerRanking, error) {
	if limit < 1 || limit > 50 {
		limit = 10
	}

	var rankings []OrganizerRanking

	query := s.db.Table("users").
		Select(`
			users.id as user_id,
			COALESCE(users.karmic_name || ' ' || users.spiritual_name, users.email) as name,
			users.avatar_url as avatar,
			COUNT(DISTINCT yatras.id) as total_yatras,
			COUNT(DISTINCT CASE WHEN yatras.status = 'completed' THEN yatras.id END) as completed_yatras,
			COALESCE(AVG(yatra_reviews.overall_rating), 0) as average_rating,
			COUNT(DISTINCT yatra_reviews.id) as total_reviews,
			COUNT(DISTINCT yatra_participants.id) as total_participants
		`).
		Joins("LEFT JOIN yatras ON yatras.organizer_id = users.id").
		Joins("LEFT JOIN yatra_reviews ON yatra_reviews.yatra_id = yatras.id").
		Joins("LEFT JOIN yatra_participants ON yatra_participants.yatra_id = yatras.id AND yatra_participants.status = 'approved'").
		Group("users.id").
		Having("COUNT(DISTINCT yatras.id) > 0")

	// Order by requested criterion
	switch orderBy {
	case "rating":
		query = query.Order("average_rating DESC, total_reviews DESC")
	case "participants":
		query = query.Order("total_participants DESC")
	case "completed":
		query = query.Order("completed_yatras DESC")
	default: // "total"
		query = query.Order("total_yatras DESC")
	}

	err := query.Limit(limit).Scan(&rankings).Error
	return rankings, err
}

// GetGeographyData returns geographic distribution of yatras
func (s *YatraAnalyticsService) GetGeographyData() ([]GeographyPoint, error) {
	var points []GeographyPoint

	err := s.db.Table("yatras").
		Select(`
			start_city as city,
			'India' as country,
			start_latitude as latitude,
			start_longitude as longitude,
			COUNT(*) as count,
			MODE() WITHIN GROUP (ORDER BY theme) as theme
		`).
		Where("start_latitude IS NOT NULL AND start_longitude IS NOT NULL").
		Where("status IN ?", []string{"open", "full", "active", "completed"}).
		Group("start_city, start_latitude, start_longitude").
		Having("COUNT(*) > 0").
		Order("count DESC").
		Limit(100). // Top 100 locations
		Scan(&points).Error

	return points, err
}

// GetThemeTrends returns popularity trends for each yatra theme
func (s *YatraAnalyticsService) GetThemeTrends() ([]ThemeTrend, error) {
	var trends []ThemeTrend

	// Current period (last 30 days)
	err := s.db.Table("yatras").
		Select("theme, COUNT(*) as count").
		Where("created_at >= NOW() - INTERVAL '30 days'").
		Group("theme").
		Order("count DESC").
		Scan(&trends).Error

	if err != nil {
		return nil, err
	}

	// Calculate growth (compare with previous 30 days)
	for i := range trends {
		var prevCount int64
		s.db.Table("yatras").
			Where("theme = ?", trends[i].Theme).
			Where("created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'").
			Count(&prevCount)

		if prevCount > 0 {
			trends[i].Growth = float64(trends[i].Count-int(prevCount)) / float64(prevCount) * 100
		} else if trends[i].Count > 0 {
			trends[i].Growth = 100 // New theme
		}
	}

	return trends, nil
}

// GetTimeTrends returns yatra creation trends over time
func (s *YatraAnalyticsService) GetTimeTrends(period string, months int) ([]TimeTrend, error) {
	if months < 1 || months > 24 {
		months = 12
	}

	var trends []TimeTrend

	// Group by month
	err := s.db.Table("yatras").
		Select(`
			TO_CHAR(created_at, 'YYYY-MM') as period,
			COUNT(*) as count,
			status
		`).
		Where("created_at >= NOW() - INTERVAL '? months'", months).
		Group("period, status").
		Order("period DESC").
		Scan(&trends).Error

	return trends, err
}

// GetStatusDistribution returns distribution of yatras by status
func (s *YatraAnalyticsService) GetStatusDistribution() (map[string]int, error) {
	var results []struct {
		Status string
		Count  int
	}

	err := s.db.Table("yatras").
		Select("status, COUNT(*) as count").
		Group("status").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	distribution := make(map[string]int)
	for _, r := range results {
		distribution[r.Status] = r.Count
	}

	return distribution, nil
}

// GetAverageMetrics returns average metrics across all yatras
func (s *YatraAnalyticsService) GetAverageMetrics() (map[string]float64, error) {
	metrics := make(map[string]float64)

	var result struct {
		AvgParticipants float64
		AvgRating       float64
		AvgDuration     float64 // days
		AvgViews        float64
	}

	err := s.db.Table("yatras").
		Select(`
			AVG(participant_count) as avg_participants,
			AVG((SELECT AVG(overall_rating) FROM yatra_reviews WHERE yatra_reviews.yatra_id = yatras.id)) as avg_rating,
			AVG(EXTRACT(DAY FROM (end_date - start_date))) as avg_duration,
			AVG(views_count) as avg_views
		`).
		Scan(&result).Error

	if err != nil {
		return nil, err
	}

	metrics["avgParticipants"] = result.AvgParticipants
	metrics["avgRating"] = result.AvgRating
	metrics["avgDuration"] = result.AvgDuration
	metrics["avgViews"] = result.AvgViews

	return metrics, nil
}
