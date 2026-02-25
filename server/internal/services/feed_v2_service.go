package services

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"math"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"sort"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type FeedV2Filters struct {
	Cursor      string
	Limit       int
	Mode        string
	OrgFilter   []string
	IncludePost bool
	IncludeCirc bool
}

type feedV2Cursor struct {
	LastScore     float64   `json:"lastScore"`
	LastCreatedAt time.Time `json:"lastCreatedAt"`
	LastType      string    `json:"lastType"`
	LastItemID    uint      `json:"lastItemId"`
	OrgFilterHash string    `json:"orgFilterHash"`
	ExpiresAtUnix int64     `json:"exp"`
}

type feedCandidate struct {
	ID          string
	Type        string
	ItemID      uint
	OrgTypeID   uint
	OrgTypeKey  string
	OrgTypeName string
	AuthorID    uint
	Author      models.FeedV2ItemAuthor
	CreatedAt   time.Time
	Preview     models.FeedV2ItemPreview
	Counts      models.FeedV2ItemCounts
	Score       float64
	Reason      string
}

type FeedV2Service struct {
	db *gorm.DB
}

func NewFeedV2Service() *FeedV2Service {
	return &FeedV2Service{db: database.DB}
}

func (s *FeedV2Service) GetFeed(userID uint, filters FeedV2Filters) (*models.FeedV2Response, error) {
	if userID == 0 {
		return nil, errors.New("unauthorized")
	}
	if filters.Limit < 1 || filters.Limit > 50 {
		filters.Limit = 20
	}
	if !filters.IncludePost && !filters.IncludeCirc {
		filters.IncludePost = true
		filters.IncludeCirc = true
	}
	mode := strings.ToLower(strings.TrimSpace(filters.Mode))
	if mode == "" {
		mode = "auto"
	}

	isPro, err := s.isUserPro(userID)
	if err != nil {
		return nil, err
	}

	allowedOrgTypes, err := s.resolveAllowedOrgTypeIDs(userID, isPro, mode, filters.OrgFilter)
	if err != nil {
		return nil, err
	}
	if len(allowedOrgTypes) == 0 && !isPro {
		return &models.FeedV2Response{
			Items:   []models.FeedV2Item{},
			HasMore: false,
			Meta: models.FeedV2Meta{
				Mode:             mode,
				Pro:              isPro,
				OrgFilterApplied: filters.OrgFilter,
			},
		}, nil
	}

	cursor, _ := decodeFeedV2Cursor(filters.Cursor)
	now := time.Now().UTC()
	// Fast path: use materialized feed for first page reads.
	if cursor == nil {
		if materialized, err := s.loadMaterializedFeed(userID, filters.Limit+1); err == nil && len(materialized) > 0 {
			items := materialized
			hasMore := false
			if len(items) > filters.Limit {
				hasMore = true
				items = items[:filters.Limit]
			}
			resp := &models.FeedV2Response{
				Items:   items,
				HasMore: hasMore,
				Meta: models.FeedV2Meta{
					Mode:             mode,
					Pro:              isPro,
					OrgFilterApplied: filters.OrgFilter,
				},
			}
			if len(items) > 0 {
				last := items[len(items)-1]
				nextCursor := feedV2Cursor{
					LastScore:     last.Score,
					LastCreatedAt: last.CreatedAt,
					LastType:      last.Type,
					LastItemID:    last.ItemID,
					ExpiresAtUnix: now.Add(30 * time.Minute).Unix(),
				}
				encoded, _ := encodeFeedV2Cursor(nextCursor)
				resp.NextCursor = encoded
			}
			return resp, nil
		}
	}

	candidates := make([]feedCandidate, 0, filters.Limit*3)

	if filters.IncludePost {
		posts, err := s.loadPostCandidates(userID, allowedOrgTypes, isPro, filters.Limit*3)
		if err != nil {
			return nil, err
		}
		candidates = append(candidates, posts...)
	}
	if filters.IncludeCirc {
		circles, err := s.loadCircleCandidates(userID, allowedOrgTypes, isPro, filters.Limit*3)
		if err != nil {
			return nil, err
		}
		candidates = append(candidates, circles...)
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].Score == candidates[j].Score {
			return candidates[i].CreatedAt.After(candidates[j].CreatedAt)
		}
		return candidates[i].Score > candidates[j].Score
	})

	filtered := make([]feedCandidate, 0, len(candidates))
	for _, c := range candidates {
		if cursor != nil {
			if c.Score > cursor.LastScore {
				continue
			}
			if c.Score == cursor.LastScore && (c.CreatedAt.After(cursor.LastCreatedAt) || (c.CreatedAt.Equal(cursor.LastCreatedAt) && c.ItemID >= cursor.LastItemID)) {
				continue
			}
		}
		filtered = append(filtered, c)
	}

	if len(filtered) > filters.Limit {
		filtered = filtered[:filters.Limit]
	}

	items := make([]models.FeedV2Item, 0, len(filtered))
	for _, c := range filtered {
		items = append(items, models.FeedV2Item{
			ID:     c.ID,
			Type:   c.Type,
			ItemID: c.ItemID,
			OrgType: models.FeedV2OrgTypeInfo{
				ID:   c.OrgTypeID,
				Key:  c.OrgTypeKey,
				Name: c.OrgTypeName,
			},
			Author:    c.Author,
			CreatedAt: c.CreatedAt,
			Preview:   c.Preview,
			Counts:    c.Counts,
			Score:     c.Score,
			Reason:    c.Reason,
		})
	}

	resp := &models.FeedV2Response{
		Items:   items,
		HasMore: len(candidates) > len(filtered),
		Meta: models.FeedV2Meta{
			Mode:             mode,
			Pro:              isPro,
			OrgFilterApplied: filters.OrgFilter,
		},
	}
	if len(items) > 0 {
		last := items[len(items)-1]
		cursor := feedV2Cursor{
			LastScore:     last.Score,
			LastCreatedAt: last.CreatedAt,
			LastType:      last.Type,
			LastItemID:    last.ItemID,
			ExpiresAtUnix: now.Add(30 * time.Minute).Unix(),
		}
		encoded, _ := encodeFeedV2Cursor(cursor)
		resp.NextCursor = encoded
	}
	return resp, nil
}

func (s *FeedV2Service) RebuildForUser(userID uint, limit int) (int, error) {
	if userID == 0 {
		return 0, errors.New("user id is required")
	}
	if limit < 1 || limit > 500 {
		limit = 120
	}
	isPro, err := s.isUserPro(userID)
	if err != nil {
		return 0, err
	}
	allowedOrgTypes, err := s.resolveAllowedOrgTypeIDs(userID, isPro, "auto", nil)
	if err != nil {
		return 0, err
	}

	candidates := make([]feedCandidate, 0, limit*2)
	posts, err := s.loadPostCandidates(userID, allowedOrgTypes, isPro, limit)
	if err != nil {
		return 0, err
	}
	candidates = append(candidates, posts...)
	circles, err := s.loadCircleCandidates(userID, allowedOrgTypes, isPro, limit)
	if err != nil {
		return 0, err
	}
	candidates = append(candidates, circles...)

	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].Score == candidates[j].Score {
			return candidates[i].CreatedAt.After(candidates[j].CreatedAt)
		}
		return candidates[i].Score > candidates[j].Score
	})
	if len(candidates) > limit {
		candidates = candidates[:limit]
	}

	rows := make([]models.FeedItem, 0, len(candidates))
	for _, c := range candidates {
		rows = append(rows, models.FeedItem{
			UserID:      userID,
			ItemID:      c.ItemID,
			ItemType:    c.Type,
			OrgTypeID:   c.OrgTypeID,
			SourceRank:  c.Score,
			ReasonCode:  c.Reason,
			PublishedAt: c.CreatedAt,
			InsertedAt:  time.Now().UTC(),
		})
	}

	return len(rows), s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", userID).Delete(&models.FeedItem{}).Error; err != nil {
			return err
		}
		if len(rows) == 0 {
			return nil
		}
		return tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{
				{Name: "user_id"},
				{Name: "item_id"},
				{Name: "item_type"},
			},
			DoUpdates: clause.AssignmentColumns([]string{"org_type_id", "source_rank", "reason_code", "published_at", "inserted_at"}),
		}).Create(&rows).Error
	})
}

func (s *FeedV2Service) RebuildForOrg(orgTypeID uint, limit int) (int, error) {
	if orgTypeID == 0 {
		return 0, errors.New("org type id is required")
	}
	var users []uint
	if err := s.db.Model(&models.UserOrgMatch{}).
		Where("org_type_id = ? AND status = ?", orgTypeID, "active").
		Distinct("user_id").
		Pluck("user_id", &users).Error; err != nil {
		return 0, err
	}
	total := 0
	for _, userID := range users {
		count, err := s.RebuildForUser(userID, limit)
		if err != nil {
			return total, err
		}
		total += count
	}
	return total, nil
}

func (s *FeedV2Service) RebuildAll(limit int) (int, error) {
	var users []uint
	if err := s.db.Model(&models.User{}).Select("id").Pluck("id", &users).Error; err != nil {
		return 0, err
	}
	total := 0
	for _, userID := range users {
		count, err := s.RebuildForUser(userID, limit)
		if err != nil {
			return total, err
		}
		total += count
	}
	return total, nil
}

// RebuildBatchByUserID rebuilds feed for users with id > startAfterUserID ordered by id asc.
// Returns builtItemsTotal, processedUsers, lastUserID and whether cursor wrapped (no users in range).
func (s *FeedV2Service) RebuildBatchByUserID(startAfterUserID uint, batchSize int, limit int) (int, int, uint, bool, error) {
	if batchSize < 1 || batchSize > 5000 {
		batchSize = 200
	}
	var userIDs []uint
	query := s.db.Model(&models.User{}).Select("id")
	if startAfterUserID > 0 {
		query = query.Where("id > ?", startAfterUserID)
	}
	if err := query.Order("id ASC").Limit(batchSize).Pluck("id", &userIDs).Error; err != nil {
		return 0, 0, startAfterUserID, false, err
	}
	if len(userIDs) == 0 {
		return 0, 0, 0, true, nil
	}

	totalItems := 0
	for _, userID := range userIDs {
		count, err := s.RebuildForUser(userID, limit)
		if err != nil {
			return totalItems, len(userIDs), userIDs[len(userIDs)-1], false, err
		}
		totalItems += count
	}
	return totalItems, len(userIDs), userIDs[len(userIDs)-1], false, nil
}

func (s *FeedV2Service) loadMaterializedFeed(userID uint, limit int) ([]models.FeedV2Item, error) {
	var rows []models.FeedItem
	if err := s.db.Where("user_id = ?", userID).
		Order("source_rank DESC").
		Order("published_at DESC").
		Limit(limit).
		Find(&rows).Error; err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return []models.FeedV2Item{}, nil
	}

	postIDs := make([]uint, 0, len(rows))
	circleIDs := make([]uint, 0, len(rows))
	orgTypeIDs := make([]uint, 0, len(rows))
	for _, row := range rows {
		if row.ItemType == "post" {
			postIDs = append(postIDs, row.ItemID)
		} else if row.ItemType == "video_circle" {
			circleIDs = append(circleIDs, row.ItemID)
		}
		if row.OrgTypeID > 0 {
			orgTypeIDs = append(orgTypeIDs, row.OrgTypeID)
		}
	}

	postMap := map[uint]models.FeedPost{}
	if len(postIDs) > 0 {
		var posts []models.FeedPost
		if err := s.db.Preload("Author").Where("id IN ?", postIDs).Find(&posts).Error; err != nil {
			return nil, err
		}
		for _, p := range posts {
			postMap[p.ID] = p
		}
	}
	circleMap := map[uint]models.VideoCircle{}
	if len(circleIDs) > 0 {
		var circles []models.VideoCircle
		if err := s.db.Preload("Author").Where("id IN ?", circleIDs).Find(&circles).Error; err != nil {
			return nil, err
		}
		for _, c := range circles {
			circleMap[c.ID] = c
		}
	}
	orgMap := map[uint]models.OrgType{}
	if len(orgTypeIDs) > 0 {
		var orgs []models.OrgType
		if err := s.db.Where("id IN ?", orgTypeIDs).Find(&orgs).Error; err == nil {
			for _, o := range orgs {
				orgMap[o.ID] = o
			}
		}
	}
	mediaMap := map[uint]string{}
	if len(postIDs) > 0 {
		var assets []models.FeedMediaAsset
		_ = s.db.Where("post_id IN ?", postIDs).Order("sort_order ASC").Find(&assets).Error
		for _, a := range assets {
			if _, exists := mediaMap[a.PostID]; !exists {
				mediaMap[a.PostID] = a.CDNURL
			}
		}
	}

	items := make([]models.FeedV2Item, 0, len(rows))
	for _, row := range rows {
		item := models.FeedV2Item{
			ID:     row.ItemType + ":" + uintToString(row.ItemID),
			Type:   row.ItemType,
			ItemID: row.ItemID,
			Score:  row.SourceRank,
			Reason: row.ReasonCode,
		}
		if org, ok := orgMap[row.OrgTypeID]; ok {
			item.OrgType = models.FeedV2OrgTypeInfo{ID: org.ID, Key: org.Key, Name: org.Name}
		}
		if row.ItemType == "post" {
			if post, ok := postMap[row.ItemID]; ok {
				item.CreatedAt = post.PublishedAt
				item.Preview = models.FeedV2ItemPreview{Text: post.TextBody, Thumbnail: mediaMap[post.ID], Image: mediaMap[post.ID]}
				item.Author = models.FeedV2ItemAuthor{ID: post.AuthorUserID}
				if post.Author != nil {
					item.Author.SpiritualName = post.Author.SpiritualName
					item.Author.KarmicName = post.Author.KarmicName
					item.Author.AvatarURL = post.Author.AvatarURL
				}
			}
		}
		if row.ItemType == "video_circle" {
			if circle, ok := circleMap[row.ItemID]; ok {
				item.CreatedAt = circle.CreatedAt
				item.Preview = models.FeedV2ItemPreview{Video: circle.MediaURL, Thumbnail: circle.ThumbnailURL}
				item.Author = models.FeedV2ItemAuthor{ID: circle.AuthorID}
				if circle.Author != nil {
					item.Author.SpiritualName = circle.Author.SpiritualName
					item.Author.KarmicName = circle.Author.KarmicName
					item.Author.AvatarURL = circle.Author.AvatarURL
				}
			}
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *FeedV2Service) GetItem(userID uint, itemType string, itemID uint) (map[string]interface{}, error) {
	if userID == 0 {
		return nil, errors.New("unauthorized")
	}
	switch itemType {
	case "post":
		var post models.FeedPost
		if err := s.db.Preload("Author").First(&post, itemID).Error; err != nil {
			return nil, err
		}
		var media []models.FeedMediaAsset
		_ = s.db.Where("post_id = ?", post.ID).Order("sort_order ASC").Find(&media).Error
		return map[string]interface{}{
			"post":  post,
			"media": media,
		}, nil
	case "video_circle":
		var circle models.VideoCircle
		if err := s.db.Preload("Author").First(&circle, itemID).Error; err != nil {
			return nil, err
		}
		return map[string]interface{}{"circle": circle}, nil
	default:
		return nil, errors.New("unsupported item type")
	}
}

func (s *FeedV2Service) TrackImpression(userID uint, itemType string, itemID uint) error {
	metricKey := "feed_v2_impressions_total"
	if itemType == "video_circle" {
		metricKey = "feed_v2_circle_impressions_total"
	}
	return GetMetricsService().Increment(metricKey, 1)
}

func (s *FeedV2Service) AddReaction(userID uint, itemType string, itemID uint, req models.FeedV2ReactionRequest) error {
	reactionType := strings.TrimSpace(req.ReactionType)
	if reactionType == "" {
		reactionType = "like"
	}
	action := strings.ToLower(strings.TrimSpace(req.Action))
	if action == "" {
		action = "add"
	}

	switch itemType {
	case "post":
		if action == "remove" {
			return s.db.Where("post_id = ? AND user_id = ? AND reaction_type = ?", itemID, userID, reactionType).Delete(&models.FeedPostReaction{}).Error
		}
		return s.db.FirstOrCreate(
			&models.FeedPostReaction{},
			models.FeedPostReaction{PostID: itemID, UserID: userID, ReactionType: reactionType},
		).Error
	case "video_circle":
		vReq := models.VideoCircleInteractionRequest{Type: models.VideoCircleInteractionLike, Action: action}
		_, err := NewVideoCircleService().AddInteraction(itemID, userID, vReq)
		return err
	default:
		return errors.New("unsupported item type")
	}
}

func (s *FeedV2Service) ListComments(userID uint, itemType string, itemID uint, limit int) ([]models.FeedPostComment, error) {
	if limit < 1 || limit > 100 {
		limit = 30
	}
	if itemType != "post" {
		return []models.FeedPostComment{}, nil
	}
	var comments []models.FeedPostComment
	if err := s.db.Preload("User").
		Where("post_id = ? AND is_deleted = ?", itemID, false).
		Order("created_at DESC").
		Limit(limit).
		Find(&comments).Error; err != nil {
		return nil, err
	}
	return comments, nil
}

func (s *FeedV2Service) AddComment(userID uint, itemType string, itemID uint, req models.FeedV2CommentCreateRequest) (*models.FeedPostComment, error) {
	body := strings.TrimSpace(req.Body)
	if itemType != "post" {
		return nil, errors.New("comments are supported only for post")
	}
	if body == "" {
		return nil, errors.New("body is required")
	}
	comment := models.FeedPostComment{
		PostID:   itemID,
		UserID:   userID,
		Body:     body,
		ParentID: req.ParentID,
	}
	if err := s.db.Create(&comment).Error; err != nil {
		return nil, err
	}
	if err := s.db.Preload("User").First(&comment, comment.ID).Error; err != nil {
		return nil, err
	}
	return &comment, nil
}

func (s *FeedV2Service) resolveAllowedOrgTypeIDs(userID uint, isPro bool, mode string, orgFilter []string) ([]uint, error) {
	var orgTypes []models.OrgType
	query := s.db.Model(&models.OrgType{}).Where("is_active = ?", true)
	if len(orgFilter) > 0 {
		query = query.Where("key IN ?", orgFilter)
	}
	if err := query.Find(&orgTypes).Error; err != nil {
		return nil, err
	}
	if isPro && mode != "matched" {
		ids := make([]uint, 0, len(orgTypes))
		for _, t := range orgTypes {
			ids = append(ids, t.ID)
		}
		return ids, nil
	}

	var matches []models.UserOrgMatch
	mQuery := s.db.Model(&models.UserOrgMatch{}).
		Where("user_id = ? AND status = ?", userID, "active")
	if len(orgFilter) > 0 {
		mQuery = mQuery.Where("org_type_id IN (?)", s.db.Model(&models.OrgType{}).Select("id").Where("key IN ?", orgFilter))
	}
	if err := mQuery.Find(&matches).Error; err != nil {
		return nil, err
	}
	ids := make([]uint, 0, len(matches))
	for _, m := range matches {
		ids = append(ids, m.OrgTypeID)
	}
	return ids, nil
}

func (s *FeedV2Service) isUserPro(userID uint) (bool, error) {
	if userID == 0 {
		return false, nil
	}
	var user models.User
	if err := s.db.Select("id", "current_plan").First(&user, userID).Error; err != nil {
		return false, err
	}
	if strings.Contains(strings.ToLower(strings.TrimSpace(user.CurrentPlan)), "pro") {
		return true, nil
	}

	var count int64
	err := s.db.Model(&models.UserProSubscription{}).
		Where("user_id = ? AND status IN ? AND starts_at <= ? AND ends_at >= ?", userID, []string{"active", "trial"}, time.Now().UTC(), time.Now().UTC()).
		Count(&count).Error
	return count > 0, err
}

func (s *FeedV2Service) loadPostCandidates(userID uint, allowed []uint, isPro bool, fetchLimit int) ([]feedCandidate, error) {
	query := s.db.Model(&models.FeedPost{}).
		Preload("Author").
		Preload("OrgType").
		Where("status = ? AND is_deleted = ?", "published", false)
	if !isPro {
		query = query.Where("org_type_id IN ?", allowed)
	}
	var posts []models.FeedPost
	if err := query.Order("published_at DESC").Limit(fetchLimit).Find(&posts).Error; err != nil {
		return nil, err
	}

	postIDs := make([]uint, 0, len(posts))
	for _, p := range posts {
		postIDs = append(postIDs, p.ID)
	}
	mediaMap := make(map[uint][]models.FeedMediaAsset)
	if len(postIDs) > 0 {
		var media []models.FeedMediaAsset
		if err := s.db.Where("post_id IN ?", postIDs).Order("sort_order ASC").Find(&media).Error; err == nil {
			for _, m := range media {
				mediaMap[m.PostID] = append(mediaMap[m.PostID], m)
			}
		}
	}

	var reactionCounts []struct {
		PostID uint
		Count  int64
	}
	reactionMap := make(map[uint]int64)
	if len(postIDs) > 0 {
		_ = s.db.Model(&models.FeedPostReaction{}).
			Select("post_id, count(*) as count").
			Where("post_id IN ?", postIDs).
			Group("post_id").
			Scan(&reactionCounts).Error
		for _, item := range reactionCounts {
			reactionMap[item.PostID] = item.Count
		}
	}

	var commentCounts []struct {
		PostID uint
		Count  int64
	}
	commentMap := make(map[uint]int64)
	if len(postIDs) > 0 {
		_ = s.db.Model(&models.FeedPostComment{}).
			Select("post_id, count(*) as count").
			Where("post_id IN ? AND is_deleted = ?", postIDs, false).
			Group("post_id").
			Scan(&commentCounts).Error
		for _, item := range commentCounts {
			commentMap[item.PostID] = item.Count
		}
	}

	now := time.Now().UTC()
	result := make([]feedCandidate, 0, len(posts))
	for _, p := range posts {
		preview := models.FeedV2ItemPreview{Text: p.TextBody}
		if assets := mediaMap[p.ID]; len(assets) > 0 {
			for _, asset := range assets {
				switch strings.ToLower(asset.Kind) {
				case "image":
					if preview.Image == "" {
						preview.Image = asset.CDNURL
					}
				case "video":
					if preview.Video == "" {
						preview.Video = asset.CDNURL
					}
				case "audio":
					if preview.Audio == "" {
						preview.Audio = asset.CDNURL
					}
				}
				if preview.Thumbnail == "" {
					preview.Thumbnail = asset.CDNURL
				}
			}
		}
		likes := reactionMap[p.ID]
		comments := commentMap[p.ID]
		recency := calcRecencyScore(now.Sub(p.PublishedAt), 18.0)
		engagement := normalizeEngagement(float64(likes), float64(comments), 0)
		score := 0.62*recency + 0.24*engagement + 0.14*proBoost(isPro)

		author := models.FeedV2ItemAuthor{ID: p.AuthorUserID}
		if p.Author != nil {
			author.SpiritualName = p.Author.SpiritualName
			author.KarmicName = p.Author.KarmicName
			author.AvatarURL = p.Author.AvatarURL
		}
		orgKey := ""
		orgName := ""
		if p.OrgType != nil {
			orgKey = p.OrgType.Key
			orgName = p.OrgType.Name
		}
		reason := "matched_org"
		if isPro {
			reason = "pro_global"
		}
		result = append(result, feedCandidate{
			ID:          "post:" + uintToString(p.ID),
			Type:        "post",
			ItemID:      p.ID,
			OrgTypeID:   p.OrgTypeID,
			OrgTypeKey:  orgKey,
			OrgTypeName: orgName,
			AuthorID:    p.AuthorUserID,
			Author:      author,
			CreatedAt:   p.PublishedAt,
			Preview:     preview,
			Counts: models.FeedV2ItemCounts{
				Likes:    likes,
				Comments: comments,
			},
			Score:  score,
			Reason: reason,
		})
	}
	return result, nil
}

func (s *FeedV2Service) loadCircleCandidates(userID uint, allowed []uint, isPro bool, fetchLimit int) ([]feedCandidate, error) {
	query := s.db.Model(&models.VideoCircle{}).
		Preload("Author").
		Where("status = ? AND expires_at > ?", models.VideoCircleStatusActive, time.Now().UTC())
	if !isPro {
		query = query.Where("category IN (?)", s.db.Model(&models.OrgType{}).Select("key").Where("id IN ?", allowed))
	}
	var circles []models.VideoCircle
	if err := query.Order("created_at DESC").Limit(fetchLimit).Find(&circles).Error; err != nil {
		return nil, err
	}

	keyNameMap := map[string]string{}
	if len(circles) > 0 {
		var orgTypes []models.OrgType
		if err := s.db.Where("is_active = ?", true).Find(&orgTypes).Error; err == nil {
			for _, o := range orgTypes {
				keyNameMap[o.Key] = o.Name
			}
		}
	}

	now := time.Now().UTC()
	result := make([]feedCandidate, 0, len(circles))
	for _, c := range circles {
		recency := calcRecencyScore(now.Sub(c.CreatedAt), 8.0)
		engagement := normalizeEngagement(float64(c.LikeCount), float64(c.CommentCount), float64(c.ChatCount))
		score := 0.58*recency + 0.30*engagement + 0.12*proBoost(isPro)

		author := models.FeedV2ItemAuthor{ID: c.AuthorID}
		if c.Author != nil {
			author.SpiritualName = c.Author.SpiritualName
			author.KarmicName = c.Author.KarmicName
			author.AvatarURL = c.Author.AvatarURL
		}
		reason := "matched_org"
		if isPro {
			reason = "pro_global"
		}

		result = append(result, feedCandidate{
			ID:          "video_circle:" + uintToString(c.ID),
			Type:        "video_circle",
			ItemID:      c.ID,
			OrgTypeID:   0,
			OrgTypeKey:  strings.TrimSpace(c.Category),
			OrgTypeName: keyNameMap[strings.TrimSpace(c.Category)],
			AuthorID:    c.AuthorID,
			Author:      author,
			CreatedAt:   c.CreatedAt,
			Preview: models.FeedV2ItemPreview{
				Video:     c.MediaURL,
				Thumbnail: c.ThumbnailURL,
			},
			Counts: models.FeedV2ItemCounts{
				Likes:    int64(c.LikeCount),
				Comments: int64(c.CommentCount),
			},
			Score:  score,
			Reason: reason,
		})
	}
	return result, nil
}

func calcRecencyScore(age time.Duration, halfLifeHours float64) float64 {
	if halfLifeHours <= 0 {
		halfLifeHours = 12
	}
	hours := age.Hours()
	return math.Exp(-math.Log(2) * hours / halfLifeHours)
}

func normalizeEngagement(likes, comments, shares float64) float64 {
	raw := likes*1.0 + comments*2.0 + shares*1.5
	return 1 - math.Exp(-raw/25.0)
}

func proBoost(isPro bool) float64 {
	if isPro {
		return 1
	}
	return 0
}

func decodeFeedV2Cursor(raw string) (*feedV2Cursor, error) {
	if strings.TrimSpace(raw) == "" {
		return nil, nil
	}
	data, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return nil, err
	}
	var c feedV2Cursor
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, err
	}
	if c.ExpiresAtUnix > 0 && time.Now().UTC().Unix() > c.ExpiresAtUnix {
		return nil, errors.New("cursor expired")
	}
	return &c, nil
}

func encodeFeedV2Cursor(c feedV2Cursor) (string, error) {
	data, err := json.Marshal(c)
	if err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(data), nil
}

func uintToString(v uint) string {
	return strconv.FormatUint(uint64(v), 10)
}
