package lila

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"gorm.io/gorm"
)

type Service struct {
	db     *gorm.DB
	wallet *services.WalletService
	now    func() time.Time
}

func NewService(db *gorm.DB) *Service {
	if db == nil {
		db = database.DB
	}
	return &Service{
		db:     db,
		wallet: services.NewWalletService(),
		now:    time.Now,
	}
}

func (s *Service) dbConn() *gorm.DB {
	if s != nil && s.db != nil {
		return s.db
	}
	return database.DB
}

func (s *Service) AutoMigrate(ctx context.Context) error {
	_ = ctx
	return AutoMigrate(s.dbConn())
}

func (s *Service) SeedDefaults(ctx context.Context) error {
	return SeedDefaultCatalog(ctx, s.dbConn())
}

func (s *Service) ensureProfileTx(tx *gorm.DB, userID uint) (*models.LilaProfile, error) {
	if tx == nil {
		return nil, errors.New("transaction is required")
	}
	var profile models.LilaProfile
	if err := tx.Where("user_id = ?", userID).First(&profile).Error; err == nil {
		return &profile, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	profile = models.LilaProfile{
		UserID:       userID,
		Rank:         models.LilaRankSeeker,
		Experience:   0,
		Level:        1,
		Title:        "Ищущий",
		LastActiveAt: s.now(),
	}
	if err := tx.Create(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (s *Service) getProfileTx(tx *gorm.DB, userID uint) (*models.LilaProfile, error) {
	var profile models.LilaProfile
	if err := tx.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (s *Service) GetProfile(ctx context.Context, userID uint) (*models.LilaProfile, error) {
	db := s.dbConn().WithContext(ctx)
	return s.getProfileTx(db, userID)
}

func (s *Service) UpsertProfile(ctx context.Context, profile *models.LilaProfile) error {
	if profile == nil {
		return errors.New("profile is required")
	}
	return s.dbConn().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		existing, err := s.ensureProfileTx(tx, profile.UserID)
		if err != nil {
			return err
		}
		profile.ID = existing.ID
		profile.Rank = defaultRankForExperience(profile.Experience)
		profile.Level = defaultLevelForExperience(profile.Experience)
		if strings.TrimSpace(profile.Title) == "" {
			profile.Title = defaultTitleForRank(profile.Rank)
		}
		profile.LastActiveAt = s.now()
		return tx.Model(existing).Updates(profile).Error
	})
}

func defaultTitleForRank(rank models.LilaRank) string {
	switch rank {
	case models.LilaRankStudent:
		return "Ученик"
	case models.LilaRankPandit:
		return "Пандит"
	case models.LilaRankRishi:
		return "Риши"
	case models.LilaRankMaharishi:
		return "Махариши"
	default:
		return "Ищущий"
	}
}

func (s *Service) getBonusBalanceTx(tx *gorm.DB, userID uint) (int, error) {
	var rows []models.LilaBonusLedgerEntry
	if err := tx.Where("user_id = ?", userID).Find(&rows).Error; err != nil {
		return 0, err
	}
	total := 0
	for _, row := range rows {
		total += row.Amount
	}
	return total, nil
}

func (s *Service) addBonusTx(tx *gorm.DB, userID uint, amount int, reason, refType, refID string, meta map[string]interface{}) (*models.LilaBonusLedgerEntry, error) {
	if amount == 0 {
		return nil, errors.New("amount must be non-zero")
	}
	current, err := s.getBonusBalanceTx(tx, userID)
	if err != nil {
		return nil, err
	}
	entry := models.LilaBonusLedgerEntry{
		UserID:        userID,
		Amount:        amount,
		BalanceAfter:  current + amount,
		Currency:      models.LilaCurrencyTypeBonus,
		Reason:        reason,
		ReferenceType: refType,
		ReferenceID:   refID,
		MetaJSON:      marshalJSON(meta),
		OccurredAt:    s.now(),
	}
	if err := tx.Create(&entry).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *Service) spendBonusTx(tx *gorm.DB, userID uint, amount int, reason, refType, refID string) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}
	balance, err := s.getBonusBalanceTx(tx, userID)
	if err != nil {
		return err
	}
	if balance < amount {
		return errors.New("insufficient bonus balance")
	}
	_, err = s.addBonusTx(tx, userID, -amount, reason, refType, refID, nil)
	return err
}

func (s *Service) Bootstrap(ctx context.Context, userID uint, locale Locale) (*BootstrapResponse, error) {
	db := s.dbConn().WithContext(ctx)
	var resp BootstrapResponse
	if err := db.Transaction(func(tx *gorm.DB) error {
		profile, err := s.ensureProfileTx(tx, userID)
		if err != nil {
			return err
		}
		resp.Profile = profile
		bonusBalance, err := s.getBonusBalanceTx(tx, userID)
		if err != nil {
			return err
		}
		resp.BonusBalance = bonusBalance

		wallet, err := s.wallet.GetBalance(userID)
		if err != nil {
			return err
		}
		resp.RealBalance = wallet.Balance

		if err := tx.Order("sort_order asc, id asc").Find(&resp.StoreItems).Error; err != nil {
			return err
		}
		if err := tx.Where("status = ?", models.LilaQuestionStatusActive).Order("is_daily desc, ends_at asc, id asc").Find(&resp.Quests).Error; err != nil {
			return err
		}
		var season models.LilaPassSeason
		if err := tx.Where("status = ?", models.LilaPassStatusActive).Order("starts_at desc").First(&season).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		} else if err == nil {
			resp.ActiveSeason = &season
		}
		var subscription models.LilaSubscription
		if err := tx.Where("user_id = ?", userID).Order("created_at desc").Limit(1).First(&subscription).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		} else if err == nil {
			resp.Subscription = &subscription
		}

		var queueRows []models.LilaQueueEntry
		if err := tx.Where("user_id = ?", userID).Order("created_at desc").Find(&queueRows).Error; err != nil {
			return err
		}
		resp.OpenQueue = queueRows

		matchIDs := make([]uint, 0, len(queueRows))
		for _, queueEntry := range queueRows {
			if queueEntry.MatchID == nil {
				continue
			}
			matchIDs = append(matchIDs, *queueEntry.MatchID)
		}
		matchIDs = uniqueUintSlice(matchIDs)
		if len(matchIDs) > 0 {
			var matches []models.LilaMatch
			if err := tx.Where("id IN ? AND status IN ?", matchIDs, []models.LilaMatchStatus{models.LilaMatchStatusLobby, models.LilaMatchStatusActive}).
				Order("created_at desc").Find(&matches).Error; err != nil {
				return err
			}
			for idx := range matches {
				if err := s.advanceMatchStateTx(tx, &matches[idx], locale); err != nil {
					return err
				}
			}
			resp.OpenMatches = matches
		}

		var questions []models.LilaQuestion
		if err := tx.Where("status = ?", models.LilaQuestionStatusActive).Order("difficulty asc, id asc").Limit(20).Find(&questions).Error; err != nil {
			return err
		}
		resp.AvailableQuestions = make([]QuestionView, 0, len(questions))
		for _, question := range questions {
			resp.AvailableQuestions = append(resp.AvailableQuestions, questionViewFromModel(question, locale))
		}

		resp.QueueDepth = make(map[string]int64)
		var depthRows []struct {
			Mode  models.LilaGameMode
			Count int64
		}
		if err := tx.Model(&models.LilaQueueEntry{}).
			Select("mode, COUNT(*) AS count").
			Where("status IN ?", []models.LilaQueueStatus{models.LilaQueueStatusWaiting, models.LilaQueueStatusReady}).
			Group("mode").
			Scan(&depthRows).Error; err != nil {
			return err
		}
		for _, row := range depthRows {
			resp.QueueDepth[string(row.Mode)] = row.Count
		}

		leaderboard, err := s.buildLeaderboardTx(tx, 20)
		if err != nil {
			return err
		}
		resp.Leaderboard = leaderboard
		metrics, err := BuildMetricsSnapshot(ctx, tx)
		if err != nil {
			return err
		}
		resp.Metrics = metrics
		return nil
	}); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (s *Service) buildLeaderboardTx(tx *gorm.DB, limit int) ([]models.LilaLeaderboardEntry, error) {
	var profiles []models.LilaProfile
	if err := tx.Order("experience desc, win_count desc, id asc").Limit(limit).Find(&profiles).Error; err != nil {
		return nil, err
	}
	out := make([]models.LilaLeaderboardEntry, 0, len(profiles))
	for _, profile := range profiles {
		out = append(out, models.LilaLeaderboardEntry{
			UserID:    profile.UserID,
			Score:     profile.Experience,
			Rank:      profile.Rank,
			Wins:      profile.WinCount,
			Losses:    profile.LoseCount,
			UpdatedAt: profile.UpdatedAt,
		})
	}
	return out, nil
}

func (s *Service) JoinQueue(ctx context.Context, userID uint, req JoinQueueRequest) (*models.LilaQueueEntry, error) {
	if req.Mode == "" {
		return nil, errors.New("mode is required")
	}
	db := s.dbConn().WithContext(ctx)
	var entry models.LilaQueueEntry
	err := db.Transaction(func(tx *gorm.DB) error {
		if _, err := s.ensureProfileTx(tx, userID); err != nil {
			return err
		}
		query := tx.Where("user_id = ? AND mode = ? AND status IN ?", userID, req.Mode, []models.LilaQueueStatus{models.LilaQueueStatusWaiting, models.LilaQueueStatusReady, models.LilaQueueStatusMatched})
		if err := query.First(&entry).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			entry = models.LilaQueueEntry{UserID: userID, Mode: req.Mode, Status: models.LilaQueueStatusWaiting, JoinedAt: s.now()}
			if err := tx.Create(&entry).Error; err != nil {
				return err
			}
		}
		entry.TeamKey = strings.TrimSpace(req.TeamKey)
		entry.Location = strings.TrimSpace(req.Location)
		entry.Status = models.LilaQueueStatusWaiting
		entry.JoinedAt = s.now()
		entry.LeftAt = nil
		entry.ReadyAt = nil
		entry.MetadataJSON = marshalJSON(req.Metadata)
		return tx.Save(&entry).Error
	})
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

func (s *Service) LeaveQueue(ctx context.Context, userID uint, mode models.LilaGameMode) error {
	return s.dbConn().WithContext(ctx).Model(&models.LilaQueueEntry{}).
		Where("user_id = ? AND mode = ? AND status IN ?", userID, mode, []models.LilaQueueStatus{models.LilaQueueStatusWaiting, models.LilaQueueStatusReady}).
		Updates(map[string]interface{}{
			"status":  models.LilaQueueStatusLeft,
			"left_at": s.now(),
		}).Error
}

func requiredPlayersForMode(mode models.LilaGameMode) int {
	switch mode {
	case models.LilaGameModeSabha:
		return 4
	case models.LilaGameModeSurvivalSamsara:
		return 10
	default:
		return 2
	}
}

func (s *Service) EnsureMatchFromQueue(ctx context.Context, mode models.LilaGameMode) (*models.LilaMatch, error) {
	db := s.dbConn().WithContext(ctx)
	var match *models.LilaMatch
	err := db.Transaction(func(tx *gorm.DB) error {
		var queue []models.LilaQueueEntry
		if err := tx.Where("mode = ? AND status IN ?", mode, []models.LilaQueueStatus{models.LilaQueueStatusWaiting, models.LilaQueueStatusReady}).
			Order("joined_at asc").Limit(10).Find(&queue).Error; err != nil {
			return err
		}
		if len(queue) < requiredPlayersForMode(mode) {
			return nil
		}
		userIDs := make([]uint, 0, len(queue))
		for _, q := range queue[:requiredPlayersForMode(mode)] {
			userIDs = append(userIDs, q.UserID)
		}
		matchCode := generateMatchCode(mode, s.now(), len(userIDs))
		now := s.now()
		m := models.LilaMatch{
			Code:            matchCode,
			Mode:            mode,
			Status:          models.LilaMatchStatusLobby,
			LobbyStartedAt:  &now,
			PlayerIDsJSON:   marshalJSON(userIDs),
			MatchConfigJSON: marshalJSON(map[string]interface{}{"mode": mode, "players": len(userIDs)}),
			RoundCount:      3,
		}
		if mode == models.LilaGameModeSurvivalSamsara {
			m.RoundCount = 10
		}
		if err := tx.Create(&m).Error; err != nil {
			return err
		}
		for idx, queueEntry := range queue[:requiredPlayersForMode(mode)] {
			queueEntry.Status = models.LilaQueueStatusMatched
			queueEntry.MatchID = &m.ID
			if mode == models.LilaGameModeSabha {
				queueEntry.TeamKey = fmt.Sprintf("team_%d", idx%2+1)
			}
			if err := tx.Save(&queueEntry).Error; err != nil {
				return err
			}
		}
		match = &m
		return nil
	})
	return match, err
}

func (s *Service) ReadyLobby(ctx context.Context, matchCode string, userID uint) (*models.LilaMatch, error) {
	var match models.LilaMatch
	db := s.dbConn().WithContext(ctx)
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("code = ?", matchCode).First(&match).Error; err != nil {
			return err
		}
		if match.Status == models.LilaMatchStatusFinished {
			return nil
		}
		if err := tx.Model(&models.LilaQueueEntry{}).
			Where("match_id = ? AND user_id = ?", match.ID, userID).
			Updates(map[string]interface{}{"status": models.LilaQueueStatusReady, "ready_at": s.now()}).Error; err != nil {
			return err
		}
		queueEntries, err := s.loadQueueEntriesForMatchTx(tx, match.ID)
		if err != nil {
			return err
		}
		playerIDs := parseMatchPlayerIDs(match)
		readyCount := 0
		for _, queueEntry := range queueEntries {
			if queueEntry.Status == models.LilaQueueStatusReady {
				readyCount++
			}
		}
		if readyCount < len(playerIDs) {
			return nil
		}
		if match.Status != models.LilaMatchStatusActive {
			now := s.now()
			match.Status = models.LilaMatchStatusActive
			match.StartedAt = &now
		}
		if err := s.advanceMatchStateTx(tx, &match, LocaleRU); err != nil {
			return err
		}
		return tx.Save(&match).Error
	})
	if err != nil {
		return nil, err
	}
	return &match, nil
}

func (s *Service) buildQuestionSnapshot(tx *gorm.DB, round *models.LilaRound, question models.LilaQuestion, locale Locale) error {
	view := questionViewFromModel(question, locale)
	round.PromptSnapshotJSON = marshalJSON(map[string]interface{}{
		"prompt": view.Prompt,
		"locale": locale,
	})
	round.OptionsSnapshotJSON = marshalJSON(view.Options)
	round.CorrectAnswerJSON = marshalJSON(map[string]interface{}{
		"correctOption": question.CorrectOption,
		"correctOrder":  unmarshalStringSlice(question.CorrectOrderJSON),
	})
	return tx.Save(round).Error
}

func (s *Service) CreateRound(ctx context.Context, matchID uint, number int, questionID uint, locale Locale, duration time.Duration) (*models.LilaRound, error) {
	db := s.dbConn().WithContext(ctx)
	var round models.LilaRound
	err := db.Transaction(func(tx *gorm.DB) error {
		var question models.LilaQuestion
		if err := tx.First(&question, questionID).Error; err != nil {
			return err
		}
		now := s.now()
		end := now.Add(duration)
		round = models.LilaRound{
			MatchID:       matchID,
			Number:        number,
			Status:        models.LilaRoundStatusRunning,
			QuestionID:    &question.ID,
			StartedAt:     &now,
			EndsAt:        &end,
			DurationMs:    int(duration / time.Millisecond),
			BonusWindowMs: 2000,
		}
		if err := tx.Create(&round).Error; err != nil {
			return err
		}
		return s.buildQuestionSnapshot(tx, &round, question, locale)
	})
	if err != nil {
		return nil, err
	}
	return &round, nil
}

func (s *Service) SubmitAnswer(ctx context.Context, req AnswerSubmissionRequest) (*models.LilaAnswer, error) {
	db := s.dbConn().WithContext(ctx)
	var answer models.LilaAnswer
	err := db.Transaction(func(tx *gorm.DB) error {
		var match models.LilaMatch
		if err := tx.Where("code = ?", req.MatchCode).First(&match).Error; err != nil {
			return err
		}
		var round models.LilaRound
		if err := tx.Where("match_id = ? AND number = ?", match.ID, req.RoundNumber).First(&round).Error; err != nil {
			return err
		}
		if round.Status != models.LilaRoundStatusRunning {
			return errors.New("round is not accepting answers")
		}
		var existing models.LilaAnswer
		if err := tx.Where("match_id = ? AND round_id = ? AND user_id = ?", match.ID, round.ID, req.UserID).First(&existing).Error; err == nil {
			answer = existing
			return nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		var question models.LilaQuestion
		if round.QuestionID == nil {
			return errors.New("round missing question")
		}
		if err := tx.First(&question, *round.QuestionID).Error; err != nil {
			return err
		}
		correct, err := isAnswerCorrect(question, req)
		if err != nil {
			return err
		}
		scoreDelta := 0
		karmaTransfer := 0
		if correct {
			scoreDelta = 10 + questionScoreBonus(question.Difficulty)
		} else if match.Mode == models.LilaGameModeDharmaDuel {
			scoreDelta = -5
			karmaTransfer = 5
		} else if match.Mode == models.LilaGameModeSurvivalSamsara {
			scoreDelta = -8
		}
		responseMS := 0
		if round.StartedAt != nil {
			responseMS = int(s.now().Sub(*round.StartedAt).Milliseconds())
		}
		answer = models.LilaAnswer{
			MatchID:           match.ID,
			RoundID:           round.ID,
			UserID:            req.UserID,
			SelectedOption:    req.SelectedOption,
			OrderingJSON:      marshalJSON(req.Ordering),
			AnswerText:        strings.TrimSpace(req.AnswerText),
			IsCorrect:         correct,
			ResponseMS:        responseMS,
			ScoreDelta:        scoreDelta,
			KarmaTransfer:     karmaTransfer,
			ClientSubmittedAt: req.ClientSubmittedAt,
			SubmittedAt:       s.now(),
		}
		if err := tx.Create(&answer).Error; err != nil {
			return err
		}
		experienceDelta := maxInt(scoreDelta, 0)
		if err := tx.Model(&models.LilaProfile{}).Where("user_id = ?", req.UserID).Updates(map[string]interface{}{
			"experience":     gorm.Expr("experience + ?", experienceDelta),
			"level":          gorm.Expr("level + ?", 0),
			"rank":           defaultRankForExperience(experienceDelta),
			"last_active_at": s.now(),
		}).Error; err != nil {
			return err
		}
		return s.advanceMatchStateTx(tx, &match, LocaleRU)
	})
	if err != nil {
		return nil, err
	}
	return &answer, nil
}

func maxInt(values ...int) int {
	if len(values) == 0 {
		return 0
	}
	max := values[0]
	for _, value := range values[1:] {
		if value > max {
			max = value
		}
	}
	return max
}

func (s *Service) UseSiddhi(ctx context.Context, req SiddhiUsageRequest) (*models.LilaSiddhiUsage, error) {
	db := s.dbConn().WithContext(ctx)
	var usage models.LilaSiddhiUsage
	err := db.Transaction(func(tx *gorm.DB) error {
		var match models.LilaMatch
		if err := tx.Where("code = ?", req.MatchCode).First(&match).Error; err != nil {
			return err
		}
		var round models.LilaRound
		if err := tx.Where("match_id = ? AND number = ?", match.ID, req.RoundNumber).First(&round).Error; err != nil {
			return err
		}
		usage = models.LilaSiddhiUsage{
			MatchID:    match.ID,
			RoundID:    round.ID,
			UserID:     req.UserID,
			Type:       req.Type,
			EffectJSON: marshalJSON(req.Payload),
			UsedAt:     s.now(),
		}
		if err := tx.Create(&usage).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &usage, nil
}

func (s *Service) PurchaseStoreItem(ctx context.Context, userID uint, req PurchaseRequest) (*models.LilaPurchase, error) {
	if req.Quantity <= 0 {
		req.Quantity = 1
	}
	db := s.dbConn().WithContext(ctx)
	var purchase models.LilaPurchase
	err := db.Transaction(func(tx *gorm.DB) error {
		var item models.LilaStoreItem
		if err := tx.Where("code = ?", req.ItemCode).First(&item).Error; err != nil {
			return err
		}
		totalBonus := item.PriceBonus * req.Quantity
		totalReal := item.PriceReal * req.Quantity
		switch req.Currency {
		case models.LilaCurrencyTypeBonus:
			if !item.CanUseBonus {
				return errors.New("item is not purchasable with bonus balance")
			}
			if err := s.spendBonusTx(tx, userID, totalBonus, "Lila store purchase", "store_item", item.Code); err != nil {
				return err
			}
		case models.LilaCurrencyTypeReal:
			if !item.CanUseReal {
				return errors.New("item is not purchasable with real balance")
			}
			processed, err := s.wallet.SpendTx(tx, userID, totalReal, req.DedupKey, "Lila store purchase", services.SpendOptions{AllowBonus: false})
			if err != nil {
				return err
			}
			if !processed {
				return errors.New("purchase already processed")
			}
		default:
			return errors.New("currency is required")
		}

		dharmaPercent := 7
		if parsed := extractIntFromJSON(item.MetaJSON, "dharmaPercent"); parsed > 0 {
			dharmaPercent = parsed
		}
		dharmaAmount := totalReal * dharmaPercent / 100
		purchase = models.LilaPurchase{
			UserID:        userID,
			ItemID:        item.ID,
			Quantity:      req.Quantity,
			Currency:      req.Currency,
			PriceBonus:    totalBonus,
			PriceReal:     totalReal,
			DharmaPercent: dharmaPercent,
			DharmaAmount:  dharmaAmount,
			Status:        models.LilaPurchaseStatusPaid,
			PaymentRef:    req.DedupKey,
			ReceiptJSON:   marshalJSON(map[string]interface{}{"itemCode": item.Code, "quantity": req.Quantity}),
		}
		if err := tx.Create(&purchase).Error; err != nil {
			return err
		}
		if dharmaAmount > 0 {
			record := models.LilaDharmaFundRecord{
				PurchaseID:      &purchase.ID,
				UserID:          userID,
				SourceType:      "store_purchase",
				GrossRealAmount: totalReal,
				DharmaPercent:   dharmaPercent,
				DharmaAmount:    dharmaAmount,
				Beneficiary:     "dharma_fund",
				Status:          models.LilaDharmaFundStatusReserved,
				Notes:           "auto-reserved from purchase",
			}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &purchase, nil
}

func (s *Service) ListStoreItems(ctx context.Context, locale Locale) ([]QuestionView, []models.LilaStoreItem, error) {
	_ = ctx
	var items []models.LilaStoreItem
	if err := s.dbConn().Order("is_featured desc, sort_order asc, id asc").Find(&items).Error; err != nil {
		return nil, nil, err
	}
	views := make([]QuestionView, 0, len(items))
	for _, item := range items {
		views = append(views, QuestionView{
			ID:          item.ID,
			Slug:        item.Code,
			Type:        models.LilaQuestionType(item.Type),
			Category:    item.Type,
			Difficulty:  models.LilaDifficultyTamas,
			Prompt:      localizedString(LocalizedText{Ru: item.NameRu, En: item.NameEn, Hi: item.NameHi}, locale),
			Options:     nil,
			Explanation: localizedString(LocalizedText{Ru: item.DescriptionRu, En: item.DescriptionEn, Hi: item.DescriptionHi}, locale),
			AssetKind:   "store_item",
		})
	}
	return views, items, nil
}

func (s *Service) ActivateSubscription(ctx context.Context, userID uint, req SubscriptionRequest) (*models.LilaSubscription, error) {
	if strings.TrimSpace(req.PackageCode) == "" {
		return nil, errors.New("package code is required")
	}
	db := s.dbConn().WithContext(ctx)
	var subscription models.LilaSubscription
	err := db.Transaction(func(tx *gorm.DB) error {
		var item models.LilaStoreItem
		if err := tx.Where("code = ? AND type = ?", req.PackageCode, "subscription").First(&item).Error; err != nil {
			return err
		}
		if !item.CanUseReal {
			return errors.New("subscription must be purchased with real balance")
		}
		processed, err := s.wallet.SpendTx(tx, userID, item.PriceReal, req.DedupKey, "Lila subscription", services.SpendOptions{AllowBonus: false})
		if err != nil {
			return err
		}
		if !processed {
			return errors.New("subscription already processed")
		}
		now := s.now()
		subscription = models.LilaSubscription{
			UserID:      userID,
			PackageCode: item.Code,
			Status:      models.LilaSubscriptionStatusActive,
			StartsAt:    now,
			EndsAt:      now.AddDate(0, 1, 0),
			AutoRenew:   req.AutoRenew,
			PriceReal:   item.PriceReal,
			BenefitsJSON: marshalJSON(map[string]interface{}{
				"premiumQuestions": true,
				"adFree":           true,
				"priorityQueue":    true,
			}),
		}
		return tx.Create(&subscription).Error
	})
	if err != nil {
		return nil, err
	}
	return &subscription, nil
}

func (s *Service) SendGift(ctx context.Context, fromUserID uint, req GiftRequest) (*models.LilaGift, error) {
	if req.ToUserID == 0 {
		return nil, errors.New("recipient is required")
	}
	if req.Quantity <= 0 {
		req.Quantity = 1
	}
	db := s.dbConn().WithContext(ctx)
	var gift models.LilaGift
	err := db.Transaction(func(tx *gorm.DB) error {
		var item models.LilaStoreItem
		if err := tx.Where("code = ?", req.ItemCode).First(&item).Error; err != nil {
			return err
		}
		totalBonus := item.PriceBonus * req.Quantity
		totalReal := item.PriceReal * req.Quantity
		switch req.Currency {
		case models.LilaCurrencyTypeBonus:
			if !item.CanUseBonus {
				return errors.New("gift is not purchasable with bonus balance")
			}
			if err := s.spendBonusTx(tx, fromUserID, totalBonus, "Gift sent", "gift", item.Code); err != nil {
				return err
			}
		case models.LilaCurrencyTypeReal:
			if !item.CanUseReal {
				return errors.New("gift is not purchasable with real balance")
			}
			processed, err := s.wallet.SpendTx(tx, fromUserID, totalReal, "", "Gift sent", services.SpendOptions{AllowBonus: false})
			if err != nil {
				return err
			}
			if !processed {
				return errors.New("gift already processed")
			}
		default:
			return errors.New("currency is required")
		}
		gift = models.LilaGift{
			FromUserID:  fromUserID,
			ToUserID:    req.ToUserID,
			Title:       item.Code,
			Message:     req.Message,
			Currency:    req.Currency,
			BonusAmount: totalBonus,
			RealAmount:  totalReal,
			Status:      "sent",
			SentAt:      s.now(),
		}
		if err := tx.Create(&gift).Error; err != nil {
			return err
		}
		if totalReal > 0 {
			record := models.LilaDharmaFundRecord{
				UserID:          fromUserID,
				SourceType:      "gift",
				GrossRealAmount: totalReal,
				DharmaPercent:   5,
				DharmaAmount:    totalReal / 20,
				Beneficiary:     "dharma_fund",
				Status:          models.LilaDharmaFundStatusReserved,
				Notes:           "gift allocation",
			}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &gift, nil
}

func (s *Service) GetMatchView(ctx context.Context, matchCode string, locale Locale) (*MatchView, error) {
	db := s.dbConn().WithContext(ctx)
	var view MatchView
	if err := db.Transaction(func(tx *gorm.DB) error {
		var match models.LilaMatch
		if err := tx.Where("code = ?", matchCode).First(&match).Error; err != nil {
			return err
		}
		if err := s.advanceMatchStateTx(tx, &match, locale); err != nil {
			return err
		}
		var rounds []models.LilaRound
		if err := tx.Where("match_id = ?", match.ID).Order("number asc").Find(&rounds).Error; err != nil {
			return err
		}
		players := parseMatchPlayerIDs(match)
		queueEntries, err := s.loadQueueEntriesForMatchTx(tx, match.ID)
		if err != nil {
			return err
		}
		scoreboardState := parseMatchScoreboard(match)
		readyUserIDs := make([]uint, 0, len(queueEntries))
		for _, entry := range queueEntries {
			if entry.Status == models.LilaQueueStatusReady {
				readyUserIDs = append(readyUserIDs, entry.UserID)
			}
		}
		scoreboard := make([]MatchScoreEntry, 0, len(players))
		for _, playerID := range players {
			scoreboard = append(scoreboard, MatchScoreEntry{
				UserID:       playerID,
				Score:        scoreboardState.Scores[playerID],
				IsReady:      isUserIDInSet(readyUserIDs, playerID),
				IsEliminated: isUserIDInSet(scoreboardState.EliminatedUserIDs, playerID),
			})
		}
		sort.Slice(scoreboard, func(i, j int) bool {
			if scoreboard[i].Score == scoreboard[j].Score {
				return scoreboard[i].UserID < scoreboard[j].UserID
			}
			return scoreboard[i].Score > scoreboard[j].Score
		})
		currentRound, err := s.loadCurrentRoundTx(tx, match.ID)
		if err != nil {
			return err
		}
		var currentQuestion *QuestionView
		answeredUserIDs := []uint{}
		if currentRound != nil {
			var answers []models.LilaAnswer
			if err := tx.Where("round_id = ?", currentRound.ID).Find(&answers).Error; err != nil {
				return err
			}
			for _, existingAnswer := range answers {
				answeredUserIDs = appendUniqueUint(answeredUserIDs, existingAnswer.UserID)
			}
			if currentRound.QuestionID != nil {
				var question models.LilaQuestion
				if err := tx.First(&question, *currentRound.QuestionID).Error; err == nil {
					viewQuestion := questionViewFromModel(question, locale)
					currentQuestion = &viewQuestion
				}
			}
		}
		view = MatchView{
			Match:             match,
			Rounds:            rounds,
			Players:           players,
			QueueEntries:      queueEntries,
			Locale:            locale,
			CurrentRound:      currentRound,
			CurrentQuestion:   currentQuestion,
			ReadyUserIDs:      readyUserIDs,
			Scoreboard:        scoreboard,
			EliminatedUserIDs: scoreboardState.EliminatedUserIDs,
			AnsweredUserIDs:   answeredUserIDs,
		}
		return nil
	}); err != nil {
		return nil, err
	}
	return &view, nil
}

func (s *Service) SettleDharmaFundRecord(ctx context.Context, id uint, note string) (*models.LilaDharmaFundRecord, error) {
	db := s.dbConn().WithContext(ctx)
	var record models.LilaDharmaFundRecord
	if err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&record, id).Error; err != nil {
			return err
		}
		now := s.now()
		record.Status = models.LilaDharmaFundStatusSettled
		record.SettledAt = &now
		record.Notes = note
		return tx.Save(&record).Error
	}); err != nil {
		return nil, err
	}
	return &record, nil
}

func extractIntFromJSON(raw, key string) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &data); err != nil {
		return 0
	}
	value, ok := data[key]
	if !ok {
		return 0
	}
	switch typed := value.(type) {
	case float64:
		return int(typed)
	case int:
		return typed
	case json.Number:
		n, _ := typed.Int64()
		return int(n)
	default:
		return 0
	}
}

func (s *Service) ClaimPassReward(ctx context.Context, userID uint, req PassClaimRequest) (*models.LilaPassProgress, error) {
	db := s.dbConn().WithContext(ctx)
	var progress models.LilaPassProgress
	err := db.Transaction(func(tx *gorm.DB) error {
		var season models.LilaPassSeason
		if err := tx.Where("code = ?", req.SeasonCode).First(&season).Error; err != nil {
			return err
		}
		if err := tx.Where("season_id = ? AND user_id = ?", season.ID, userID).First(&progress).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			progress = models.LilaPassProgress{SeasonID: season.ID, UserID: userID, CurrentLevel: 1, CurrentPoints: 0, Status: models.LilaPassStatusActive}
			if err := tx.Create(&progress).Error; err != nil {
				return err
			}
		}
		progress.CurrentPoints += req.Points
		progress.CurrentLevel = defaultLevelForExperience(progress.CurrentPoints * 10)
		if req.Premium {
			now := s.now()
			progress.PremiumUnlockedAt = &now
		}
		return tx.Save(&progress).Error
	})
	if err != nil {
		return nil, err
	}
	return &progress, nil
}

func (s *Service) LinkGuru(ctx context.Context, req GuruLinkRequest) (*models.LilaGuruLink, error) {
	if req.MentorUserID == 0 || req.StudentUserID == 0 {
		return nil, errors.New("mentor and student are required")
	}
	link := models.LilaGuruLink{
		MentorUserID:  req.MentorUserID,
		StudentUserID: req.StudentUserID,
		SharePercent:  req.SharePercent,
		Status:        "active",
		StartedAt:     s.now(),
	}
	if link.SharePercent <= 0 {
		link.SharePercent = 5
	}
	if err := s.dbConn().WithContext(ctx).Where("student_user_id = ?", req.StudentUserID).Assign(&link).FirstOrCreate(&link).Error; err != nil {
		return nil, err
	}
	return &link, nil
}

func (s *Service) AwardQuestProgress(ctx context.Context, userID uint, req QuestProgressRequest) (*models.LilaQuestProgress, error) {
	db := s.dbConn().WithContext(ctx)
	var progress models.LilaQuestProgress
	err := db.Transaction(func(tx *gorm.DB) error {
		var quest models.LilaQuest
		if err := tx.Where("code = ?", req.Code).First(&quest).Error; err != nil {
			return err
		}
		if err := tx.Where("quest_id = ? AND user_id = ?", quest.ID, userID).First(&progress).Error; err != nil {
			if !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			progress = models.LilaQuestProgress{QuestID: quest.ID, UserID: userID, Target: 10}
			if err := tx.Create(&progress).Error; err != nil {
				return err
			}
		}
		progress.Progress += req.Delta
		if progress.Target <= 0 {
			progress.Target = 10
		}
		if progress.Progress >= progress.Target && progress.CompletedAt == nil {
			now := s.now()
			progress.CompletedAt = &now
			if quest.RewardBonus > 0 {
				if _, err := s.addBonusTx(tx, userID, quest.RewardBonus, "Quest reward", "quest", quest.Code, nil); err != nil {
					return err
				}
			}
			if quest.RewardReal > 0 {
				if err := s.wallet.Credit(userID, quest.RewardReal, fmt.Sprintf("quest-%s", quest.Code), "Quest reward"); err != nil {
					return err
				}
			}
		}
		if req.Claim && progress.CompletedAt != nil && progress.ClaimedAt == nil {
			now := s.now()
			progress.ClaimedAt = &now
		}
		return tx.Save(&progress).Error
	})
	if err != nil {
		return nil, err
	}
	return &progress, nil
}

func (s *Service) GetBalanceSummary(ctx context.Context, userID uint) (BalanceSummary, error) {
	db := s.dbConn().WithContext(ctx)
	summary := BalanceSummary{}
	bonusBalance, err := s.getBonusBalanceTx(db, userID)
	if err != nil {
		return summary, err
	}
	summary.Bonus = bonusBalance
	wallet, err := s.wallet.GetBalance(userID)
	if err != nil {
		return summary, err
	}
	summary.Real = wallet.Balance
	return summary, nil
}

func (s *Service) GrantBonus(ctx context.Context, userID uint, amount int, reason string, meta map[string]interface{}) (*models.LilaBonusLedgerEntry, error) {
	return s.addBonusTx(s.dbConn().WithContext(ctx), userID, amount, reason, "manual", reason, meta)
}

func (s *Service) SpendBonus(ctx context.Context, userID uint, amount int, reason, refType, refID string) error {
	return s.spendBonusTx(s.dbConn().WithContext(ctx), userID, amount, reason, refType, refID)
}

func (s *Service) ListQuestions(ctx context.Context, locale Locale, mode models.LilaGameMode) ([]QuestionView, error) {
	db := s.dbConn().WithContext(ctx)
	query := db.Where("status = ?", models.LilaQuestionStatusActive)
	if strings.TrimSpace(string(mode)) != "" {
		query = query.Where("allowed_modes_json LIKE ?", "%"+string(mode)+"%")
	}
	var questions []models.LilaQuestion
	if err := query.Order("difficulty asc, id asc").Find(&questions).Error; err != nil {
		return nil, err
	}
	views := make([]QuestionView, 0, len(questions))
	for _, question := range questions {
		views = append(views, questionViewFromModel(question, locale))
	}
	return views, nil
}
