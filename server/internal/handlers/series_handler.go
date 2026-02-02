package handlers

import (
	"context"
	"log"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type SeriesHandler struct {
	db *gorm.DB
}

func NewSeriesHandler() *SeriesHandler {
	return &SeriesHandler{
		db: database.DB,
	}
}

// ==================== SERIES ====================

// GetAllSeries returns all series with seasons count
func (h *SeriesHandler) GetAllSeries(c *fiber.Ctx) error {
	var series []models.Series

	err := h.db.Preload("Seasons").Order("sort_order ASC, title ASC").Find(&series).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"series": series})
}

// GetSeriesDetails returns a series with all seasons and episodes
func (h *SeriesHandler) GetSeriesDetails(c *fiber.Ctx) error {
	id := c.Params("id")

	var series models.Series
	err := h.db.Preload("Seasons", func(db *gorm.DB) *gorm.DB {
		return db.Order("seasons.number ASC")
	}).Preload("Seasons.Episodes", func(db *gorm.DB) *gorm.DB {
		return db.Order("episodes.number ASC")
	}).First(&series, id).Error

	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Series not found"})
	}

	// Increment view count
	h.db.Model(&series).Update("view_count", gorm.Expr("view_count + 1"))

	// Presign URLs for private S3 access
	s3Svc := services.GetS3Service()
	if s3Svc != nil {
		for i := range series.Seasons {
			for j := range series.Seasons[i].Episodes {
				url := series.Seasons[i].Episodes[j].VideoURL
				// Check if URL belongs to our S3
				key := s3Svc.ExtractS3Path(url)
				if key != url { // If extraction worked (meaning it's our S3 URL)
					// Verify key is not just the full URL (simple check)
					if !strings.HasPrefix(key, "http") {
						// Decode key if needed (it might be encoded in DB now)
						decodedKey, err := urlDecode(key)
						if err == nil {
							key = decodedKey
						}

						signedURL, err := s3Svc.GeneratePresignedURL(context.Background(), key, 4*time.Hour)
						if err == nil {
							series.Seasons[i].Episodes[j].VideoURL = signedURL
						} else {
							log.Printf("Failed to sign URL for key %s: %v", key, err)
						}
					}
				}
			}
		}
	}

	return c.JSON(series)
}

func urlDecode(str string) (string, error) {
	return url.QueryUnescape(str)
}

// CreateSeries creates a new series
func (h *SeriesHandler) CreateSeries(c *fiber.Ctx) error {
	var series models.Series
	if err := c.BodyParser(&series); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if series.Title == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Title is required"})
	}

	if err := h.db.Create(&series).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(series)
}

// UpdateSeries updates a series
func (h *SeriesHandler) UpdateSeries(c *fiber.Ctx) error {
	id := c.Params("id")

	var series models.Series
	if err := h.db.First(&series, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Series not found"})
	}

	var updates models.Series
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	h.db.Model(&series).Updates(updates)

	return c.JSON(series)
}

// DeleteSeries deletes a series and all its seasons/episodes
func (h *SeriesHandler) DeleteSeries(c *fiber.Ctx) error {
	id := c.Params("id")

	// Delete cascades: episodes -> seasons -> series
	h.db.Where("season_id IN (SELECT id FROM seasons WHERE series_id = ?)", id).Delete(&models.Episode{})
	h.db.Where("series_id = ?", id).Delete(&models.Season{})
	h.db.Delete(&models.Series{}, id)

	return c.JSON(fiber.Map{"message": "Series deleted"})
}

// ==================== SEASONS ====================

// CreateSeason creates a new season
func (h *SeriesHandler) CreateSeason(c *fiber.Ctx) error {
	seriesID := c.Params("seriesId")

	var season models.Season
	if err := c.BodyParser(&season); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	sid, _ := strconv.ParseUint(seriesID, 10, 32)
	season.SeriesID = uint(sid)

	// Auto-assign number if not provided
	if season.Number == 0 {
		var maxNum int
		h.db.Model(&models.Season{}).Where("series_id = ?", sid).Select("COALESCE(MAX(number), 0)").Scan(&maxNum)
		season.Number = maxNum + 1
	}

	if err := h.db.Create(&season).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(season)
}

// UpdateSeason updates a season
func (h *SeriesHandler) UpdateSeason(c *fiber.Ctx) error {
	id := c.Params("seasonId")

	var season models.Season
	if err := h.db.First(&season, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Season not found"})
	}

	var updates models.Season
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	h.db.Model(&season).Updates(updates)

	return c.JSON(season)
}

// DeleteSeason deletes a season and all its episodes
func (h *SeriesHandler) DeleteSeason(c *fiber.Ctx) error {
	id := c.Params("seasonId")

	h.db.Where("season_id = ?", id).Delete(&models.Episode{})
	h.db.Delete(&models.Season{}, id)

	return c.JSON(fiber.Map{"message": "Season deleted"})
}

// ==================== EPISODES ====================

// CreateEpisode creates a new episode
func (h *SeriesHandler) CreateEpisode(c *fiber.Ctx) error {
	seasonID := c.Params("seasonId")

	var episode models.Episode
	if err := c.BodyParser(&episode); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	sid, _ := strconv.ParseUint(seasonID, 10, 32)
	episode.SeasonID = uint(sid)

	// Auto-assign number if not provided
	if episode.Number == 0 {
		var maxNum int
		h.db.Model(&models.Episode{}).Where("season_id = ?", sid).Select("COALESCE(MAX(number), 0)").Scan(&maxNum)
		episode.Number = maxNum + 1
	}

	if err := h.db.Create(&episode).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(episode)
}

// UpdateEpisode updates an episode
func (h *SeriesHandler) UpdateEpisode(c *fiber.Ctx) error {
	id := c.Params("episodeId")

	var episode models.Episode
	if err := h.db.First(&episode, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Episode not found"})
	}

	var updates models.Episode
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	h.db.Model(&episode).Updates(updates)

	return c.JSON(episode)
}

// DeleteEpisode deletes an episode
func (h *SeriesHandler) DeleteEpisode(c *fiber.Ctx) error {
	id := c.Params("episodeId")

	h.db.Delete(&models.Episode{}, id)

	return c.JSON(fiber.Map{"message": "Episode deleted"})
}

// ReorderEpisodes updates the sort order of episodes
func (h *SeriesHandler) ReorderEpisodes(c *fiber.Ctx) error {
	var body struct {
		EpisodeIDs []uint `json:"episodeIds"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	for i, id := range body.EpisodeIDs {
		h.db.Model(&models.Episode{}).Where("id = ?", id).Update("sort_order", i)
	}

	return c.JSON(fiber.Map{"message": "Episodes reordered"})
}

// ==================== BULK UPLOAD ====================

type BulkEpisodeRequest struct {
	SeasonID     uint   `json:"seasonId"`
	Filename     string `json:"filename"`
	VideoURL     string `json:"videoURL"`
	ThumbnailURL string `json:"thumbnailURL,omitempty"`
}

type ParsedEpisode struct {
	Filename string `json:"filename"`
	Season   int    `json:"season"`
	Episode  int    `json:"episode"`
	Title    string `json:"title"`
	VideoURL string `json:"videoURL"`
}

// ParseFilenames parses episode info from filenames
func (h *SeriesHandler) ParseFilenames(c *fiber.Ctx) error {
	var body struct {
		Filenames []string `json:"filenames"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Regex patterns for episode parsing
	patterns := []*regexp.Regexp{
		regexp.MustCompile(`[Ss](\d{1,2})[Ee](\d{1,3})`),            // S01E01, s1e10
		regexp.MustCompile(`(\d{1,2})[xX](\d{1,3})`),                // 1x01, 01x10
		regexp.MustCompile(`[Ss]eason\s*(\d+).*[Ee]pisode\s*(\d+)`), // Season 1 Episode 1
	}

	var parsed []ParsedEpisode

	for _, filename := range body.Filenames {
		p := ParsedEpisode{Filename: filename}

		for _, re := range patterns {
			matches := re.FindStringSubmatch(filename)
			if len(matches) >= 3 {
				p.Season, _ = strconv.Atoi(matches[1])
				p.Episode, _ = strconv.Atoi(matches[2])
				break
			}
		}

		// Extract title (remove extension and episode info)
		title := filename
		title = regexp.MustCompile(`\.[^.]+$`).ReplaceAllString(title, "")       // Remove extension
		title = regexp.MustCompile(`[Ss]\d+[Ee]\d+`).ReplaceAllString(title, "") // Remove S01E01
		title = regexp.MustCompile(`\d+[xX]\d+`).ReplaceAllString(title, "")     // Remove 1x01
		title = strings.TrimSpace(strings.Trim(title, "._- "))

		if title != "" && p.Title == "" {
			p.Title = title
		}

		parsed = append(parsed, p)
	}

	return c.JSON(fiber.Map{"parsed": parsed})
}

// BulkCreateEpisodes creates multiple episodes at once
func (h *SeriesHandler) BulkCreateEpisodes(c *fiber.Ctx) error {
	var body struct {
		SeriesID uint            `json:"seriesId"`
		SeasonID uint            `json:"seasonId,omitempty"` // If provided, use this season
		Episodes []ParsedEpisode `json:"episodes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(body.Episodes) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "No episodes provided"})
	}

	log.Printf("[SeriesHandler] Bulk creating %d episodes for series %d", len(body.Episodes), body.SeriesID)

	// Group episodes by season
	seasonEpisodes := make(map[int][]ParsedEpisode)
	for _, ep := range body.Episodes {
		seasonNum := ep.Season
		if seasonNum == 0 {
			seasonNum = 1 // Default to season 1
		}
		seasonEpisodes[seasonNum] = append(seasonEpisodes[seasonNum], ep)
	}

	var createdEpisodes []models.Episode

	for seasonNum, episodes := range seasonEpisodes {
		// Find or create season
		var season models.Season
		if body.SeasonID != 0 {
			h.db.First(&season, body.SeasonID)
		} else {
			err := h.db.Where("series_id = ? AND number = ?", body.SeriesID, seasonNum).First(&season).Error
			if err != nil {
				// Create season
				season = models.Season{
					SeriesID: body.SeriesID,
					Number:   seasonNum,
					Title:    "",
				}
				h.db.Create(&season)
			}
		}

		// Create episodes
		for _, ep := range episodes {
			episode := models.Episode{
				SeasonID:     season.ID,
				Number:       ep.Episode,
				Title:        ep.Title,
				VideoURL:     ep.VideoURL,
				ThumbnailURL: "",
				IsActive:     true,
			}

			if episode.Number == 0 {
				var maxNum int
				h.db.Model(&models.Episode{}).Where("season_id = ?", season.ID).Select("COALESCE(MAX(number), 0)").Scan(&maxNum)
				episode.Number = maxNum + 1
			}

			h.db.Create(&episode)
			createdEpisodes = append(createdEpisodes, episode)
		}
	}

	return c.Status(201).JSON(fiber.Map{
		"message":  "Episodes created",
		"count":    len(createdEpisodes),
		"episodes": createdEpisodes,
	})
}

// GetSeriesStats returns statistics for series
func (h *SeriesHandler) GetSeriesStats(c *fiber.Ctx) error {
	var totalSeries int64
	var totalSeasons int64
	var totalEpisodes int64

	h.db.Model(&models.Series{}).Count(&totalSeries)
	h.db.Model(&models.Season{}).Count(&totalSeasons)
	h.db.Model(&models.Episode{}).Count(&totalEpisodes)

	return c.JSON(fiber.Map{
		"totalSeries":   totalSeries,
		"totalSeasons":  totalSeasons,
		"totalEpisodes": totalEpisodes,
	})
}

// ==================== S3 IMPORT ====================

// S3File represents a file in S3
type S3File struct {
	Key      string `json:"key"`
	Filename string `json:"filename"`
	URL      string `json:"url"`
	Size     int64  `json:"size"`
	Season   int    `json:"season"`
	Episode  int    `json:"episode"`
	Title    string `json:"title"`
}

// ListS3Files lists video files in S3 with a given prefix
func (h *SeriesHandler) ListS3Files(c *fiber.Ctx) error {
	prefix := c.Query("prefix", "series/")

	s3Svc := services.GetS3Service()
	if s3Svc == nil {
		return c.Status(500).JSON(fiber.Map{"error": "S3 service not initialized"})
	}

	files, err := s3Svc.ListFiles(context.Background(), prefix)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Parse filenames and sort
	patterns := []*regexp.Regexp{
		regexp.MustCompile(`[Ss](\\d{1,2})[Ee](\\d{1,3})`),
		regexp.MustCompile(`(\\d{1,2})[xX](\\d{1,3})`),
		regexp.MustCompile(`[Ee]pisode[._-]?(\\d{1,3})`),
		regexp.MustCompile(`[Ss]eriya[._-]?(\\d{1,3})`),
		regexp.MustCompile(`(\\d{1,3})\\.mp4$`),
	}

	var result []S3File
	for _, f := range files {
		// Skip non-video files
		if !strings.HasSuffix(strings.ToLower(f.Key), ".mp4") &&
			!strings.HasSuffix(strings.ToLower(f.Key), ".mkv") &&
			!strings.HasSuffix(strings.ToLower(f.Key), ".webm") {
			continue
		}

		filename := f.Key
		if idx := strings.LastIndex(f.Key, "/"); idx >= 0 {
			filename = f.Key[idx+1:]
		}

		sf := S3File{
			Key:      f.Key,
			Filename: filename,
			URL:      f.URL,
			Size:     f.Size,
		}

		// Parse episode info
		for _, re := range patterns {
			matches := re.FindStringSubmatch(filename)
			if len(matches) >= 2 {
				if len(matches) >= 3 {
					sf.Season, _ = strconv.Atoi(matches[1])
					sf.Episode, _ = strconv.Atoi(matches[2])
				} else {
					sf.Episode, _ = strconv.Atoi(matches[1])
					sf.Season = 1
				}
				break
			}
		}

		// Extract title
		title := filename
		title = regexp.MustCompile(`\.[^.]+$`).ReplaceAllString(title, "")
		title = regexp.MustCompile(`[Ss]\d+[Ee]\d+`).ReplaceAllString(title, "")
		title = regexp.MustCompile(`\d+[xX]\d+`).ReplaceAllString(title, "")
		title = regexp.MustCompile(`[Ee]pisode[._-]?\d+`).ReplaceAllString(title, "")
		title = regexp.MustCompile(`[Ss]eriya[._-]?\d+`).ReplaceAllString(title, "")
		title = strings.TrimSpace(strings.Trim(title, "._- "))
		sf.Title = title

		result = append(result, sf)
	}

	// Sort by episode number
	sort.Slice(result, func(i, j int) bool {
		if result[i].Season != result[j].Season {
			return result[i].Season < result[j].Season
		}
		return result[i].Episode < result[j].Episode
	})

	return c.JSON(fiber.Map{
		"files": result,
		"count": len(result),
	})
}

// ImportS3Episodes imports S3 files as episodes into a series
func (h *SeriesHandler) ImportS3Episodes(c *fiber.Ctx) error {
	var body struct {
		SeriesID uint     `json:"seriesId"`
		Files    []S3File `json:"files"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if body.SeriesID == 0 || len(body.Files) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "SeriesID and files are required"})
	}

	log.Printf("[SeriesHandler] Importing %d S3 files into series %d", len(body.Files), body.SeriesID)

	// Group by season
	seasonFiles := make(map[int][]S3File)
	for _, f := range body.Files {
		seasonNum := f.Season
		if seasonNum == 0 {
			seasonNum = 1
		}
		seasonFiles[seasonNum] = append(seasonFiles[seasonNum], f)
	}

	var createdEpisodes []models.Episode

	for seasonNum, files := range seasonFiles {
		// Find or create season
		var season models.Season
		err := h.db.Where("series_id = ? AND number = ?", body.SeriesID, seasonNum).First(&season).Error
		if err != nil {
			season = models.Season{
				SeriesID: body.SeriesID,
				Number:   seasonNum,
			}
			h.db.Create(&season)
		}

		// Sort files by episode number
		sort.Slice(files, func(i, j int) bool {
			return files[i].Episode < files[j].Episode
		})

		for _, f := range files {
			episodeNum := f.Episode
			if episodeNum == 0 {
				var maxNum int
				h.db.Model(&models.Episode{}).Where("season_id = ?", season.ID).Select("COALESCE(MAX(number), 0)").Scan(&maxNum)
				episodeNum = maxNum + 1
			}

			// Check if episode already exists
			var existing models.Episode
			if h.db.Where("season_id = ? AND number = ?", season.ID, episodeNum).First(&existing).Error == nil {
				log.Printf("[SeriesHandler] Episode S%dE%d already exists, updating URL", seasonNum, episodeNum)
				h.db.Model(&existing).Updates(models.Episode{VideoURL: f.URL})
				createdEpisodes = append(createdEpisodes, existing)
				continue
			}

			episode := models.Episode{
				SeasonID: season.ID,
				Number:   episodeNum,
				Title:    f.Title,
				VideoURL: f.URL,
				IsActive: true,
			}
			h.db.Create(&episode)
			createdEpisodes = append(createdEpisodes, episode)
		}
	}

	return c.Status(201).JSON(fiber.Map{
		"message":  "Episodes imported from S3",
		"count":    len(createdEpisodes),
		"episodes": createdEpisodes,
	})
}
