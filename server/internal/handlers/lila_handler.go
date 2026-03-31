package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"rag-agent-server/internal/database"
	lilagame "rag-agent-server/internal/games/lila"
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/websocket"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type LilaHandler struct {
	service *lilagame.Service
	db      *gorm.DB
	hub     *websocket.Hub
}

type lilaLocalizedTextPayload struct {
	Ru string `json:"ru"`
	En string `json:"en"`
	Hi string `json:"hi"`
}

type lilaLocalizedOptionsPayload struct {
	Ru []string `json:"ru"`
	En []string `json:"en"`
	Hi []string `json:"hi"`
}

type lilaQuestionPayload struct {
	Slug          string                      `json:"slug"`
	Type          models.LilaQuestionType     `json:"type"`
	Category      string                      `json:"category"`
	Difficulty    models.LilaDifficulty       `json:"difficulty"`
	Status        models.LilaQuestionStatus   `json:"status"`
	AllowedModes  []string                    `json:"allowedModes"`
	Prompt        lilaLocalizedTextPayload    `json:"prompt"`
	Options       lilaLocalizedOptionsPayload `json:"options"`
	Explanation   lilaLocalizedTextPayload    `json:"explanation"`
	AssetURL      string                      `json:"assetUrl"`
	AssetKind     string                      `json:"assetKind"`
	CorrectOption string                      `json:"correctOption"`
	CorrectOrder  []string                    `json:"correctOrder"`
	SourceRef     string                      `json:"sourceRef"`
	Meta          map[string]interface{}      `json:"meta"`
}

type lilaLiveOpsPayload struct {
	StoreItems    []models.LilaStoreItem  `json:"storeItems"`
	PassSeasons   []models.LilaPassSeason `json:"passSeasons"`
	DharmaPercent int                     `json:"dharmaPercent"`
}

func NewLilaHandler(service *lilagame.Service, hub *websocket.Hub) *LilaHandler {
	if service == nil {
		service = lilagame.NewService(database.DB)
	}
	return &LilaHandler{
		service: service,
		db:      database.DB,
		hub:     hub,
	}
}

func buildLilaRealtimePayload(view *lilagame.MatchView, extra map[string]interface{}) map[string]interface{} {
	if view == nil && len(extra) == 0 {
		return nil
	}
	payload := make(map[string]interface{}, len(extra)+1)
	for key, value := range extra {
		payload[key] = value
	}
	if view != nil {
		payload["snapshot"] = view
	}
	return payload
}

func (h *LilaHandler) getLilaMatchView(ctx context.Context, matchCode string, locale lilagame.Locale) (*lilagame.MatchView, error) {
	matchCode = strings.TrimSpace(matchCode)
	if matchCode == "" {
		return nil, nil
	}
	view, err := h.service.GetMatchView(ctx, matchCode, locale)
	if err != nil {
		return nil, err
	}
	return view, nil
}

func (h *LilaHandler) emitLilaEvent(event lilagame.Event, targetUserIDs ...uint) {
	if h == nil || h.hub == nil {
		return
	}
	h.hub.BroadcastWS(event.WithTargets(targetUserIDs...))
}

func (h *LilaHandler) emitLilaMatchEvent(eventType lilagame.EventType, userID uint, round int, view *lilagame.MatchView, extra map[string]interface{}, targetUserIDs ...uint) {
	if view == nil {
		return
	}
	h.emitLilaEvent(
		lilagame.NewEvent(
			eventType,
			view.Match.Code,
			userID,
			round,
			buildLilaRealtimePayload(view, extra),
			time.Now(),
		),
		targetUserIDs...,
	)
}

func parseLilaLocale(raw string) lilagame.Locale {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "en":
		return lilagame.LocaleEN
	case "hi":
		return lilagame.LocaleHI
	default:
		return lilagame.LocaleRU
	}
}

func parseLilaMode(raw string) models.LilaGameMode {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "duel", "dharma_duel":
		return models.LilaGameModeDharmaDuel
	case "sabha":
		return models.LilaGameModeSabha
	case "survival", "survival_in_samsara":
		return models.LilaGameModeSurvivalSamsara
	default:
		return models.LilaGameMode(strings.TrimSpace(raw))
	}
}

func parseLilaUintParam(c *fiber.Ctx, name string) (uint, error) {
	value, err := strconv.ParseUint(c.Params(name), 10, 64)
	if err != nil || value == 0 {
		return 0, fiber.NewError(fiber.StatusBadRequest, "invalid "+name)
	}
	return uint(value), nil
}

func respondLilaError(c *fiber.Ctx, err error) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	case strings.Contains(strings.ToLower(err.Error()), "required"):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	case strings.Contains(strings.ToLower(err.Error()), "insufficient"):
		return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{"error": err.Error()})
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
}

func (h *LilaHandler) GetBootstrap(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	resp, err := h.service.Bootstrap(c.UserContext(), userID, parseLilaLocale(c.Query("locale")))
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(resp)
}

func (h *LilaHandler) GetProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	resp, err := h.service.Bootstrap(c.UserContext(), userID, parseLilaLocale(c.Query("locale")))
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{
		"profile":      resp.Profile,
		"bonusBalance": resp.BonusBalance,
		"realBalance":  resp.RealBalance,
	})
}

func (h *LilaHandler) UpsertProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var profile models.LilaProfile
	if err := c.BodyParser(&profile); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	profile.UserID = userID
	if err := h.service.UpsertProfile(c.UserContext(), &profile); err != nil {
		return respondLilaError(c, err)
	}
	updated, err := h.service.GetProfile(c.UserContext(), userID)
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{"profile": updated})
}

func (h *LilaHandler) JoinQueue(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	locale := parseLilaLocale(c.Query("locale"))
	var req lilagame.JoinQueueRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	req.Mode = parseLilaMode(string(req.Mode))
	entry, err := h.service.JoinQueue(c.UserContext(), userID, req)
	if err != nil {
		return respondLilaError(c, err)
	}
	match, err := h.service.EnsureMatchFromQueue(c.UserContext(), req.Mode)
	if err != nil {
		return respondLilaError(c, err)
	}
	h.emitLilaEvent(
		lilagame.NewEvent(lilagame.EventQueueJoined, "", userID, 0, map[string]interface{}{"mode": req.Mode}, time.Now()),
		userID,
	)
	if match != nil {
		if view, viewErr := h.getLilaMatchView(c.UserContext(), match.Code, locale); viewErr == nil && view != nil {
			h.emitLilaMatchEvent(lilagame.EventQueueJoined, userID, 0, view, map[string]interface{}{"mode": req.Mode}, view.Players...)
		}
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"queueEntry": entry,
		"match":      match,
		"event":      lilagame.NewEvent(lilagame.EventQueueJoined, "", userID, 0, map[string]interface{}{"mode": req.Mode}, time.Now()),
	})
}

func (h *LilaHandler) LeaveQueue(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	mode := parseLilaMode(c.Query("mode"))
	if mode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "mode is required"})
	}
	if err := h.service.LeaveQueue(c.UserContext(), userID, mode); err != nil {
		return respondLilaError(c, err)
	}
	h.emitLilaEvent(
		lilagame.NewEvent(lilagame.EventQueueLeft, "", userID, 0, map[string]interface{}{"mode": mode}, time.Now()),
		userID,
	)
	return c.JSON(fiber.Map{
		"ok":    true,
		"event": lilagame.NewEvent(lilagame.EventQueueLeft, "", userID, 0, map[string]interface{}{"mode": mode}, time.Now()),
	})
}

func (h *LilaHandler) ReadyLobby(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	locale := parseLilaLocale(c.Query("locale"))
	match, err := h.service.ReadyLobby(c.UserContext(), c.Params("matchCode"), userID)
	if err != nil {
		return respondLilaError(c, err)
	}
	if view, viewErr := h.getLilaMatchView(c.UserContext(), match.Code, locale); viewErr == nil && view != nil {
		h.emitLilaMatchEvent(lilagame.EventLobbyReady, userID, view.Match.CurrentRound, view, map[string]interface{}{"readyUserId": userID}, view.Players...)
		if view.Match.Status == models.LilaMatchStatusActive {
			h.emitLilaMatchEvent(lilagame.EventLobbyStarted, userID, view.Match.CurrentRound, view, nil, view.Players...)
			if view.CurrentRound != nil && view.CurrentRound.Status == models.LilaRoundStatusRunning {
				h.emitLilaMatchEvent(lilagame.EventRoundStarted, userID, view.CurrentRound.Number, view, nil, view.Players...)
			}
		}
	}
	return c.JSON(fiber.Map{
		"match": match,
		"event": lilagame.NewEvent(lilagame.EventLobbyReady, match.Code, userID, 0, nil, time.Now()),
	})
}

func (h *LilaHandler) GetMatch(c *fiber.Ctx) error {
	view, err := h.service.GetMatchView(c.UserContext(), c.Params("matchCode"), parseLilaLocale(c.Query("locale")))
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(view)
}

func (h *LilaHandler) SubmitAnswer(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	locale := parseLilaLocale(c.Query("locale"))
	var req lilagame.AnswerSubmissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	req.UserID = userID
	if req.MatchCode == "" {
		req.MatchCode = c.Params("matchCode")
	}
	answer, err := h.service.SubmitAnswer(c.UserContext(), req)
	if err != nil {
		return respondLilaError(c, err)
	}
	if view, viewErr := h.getLilaMatchView(c.UserContext(), req.MatchCode, locale); viewErr == nil && view != nil {
		h.emitLilaMatchEvent(lilagame.EventAnswerAccepted, userID, req.RoundNumber, view, map[string]interface{}{
			"correct":        answer.IsCorrect,
			"answeredUserId": userID,
		}, view.Players...)
		if view.Match.Status == models.LilaMatchStatusFinished {
			h.emitLilaMatchEvent(lilagame.EventMatchFinished, userID, req.RoundNumber, view, nil, view.Players...)
			if view.Match.WinnerUserID != nil {
				h.emitLilaEvent(
					lilagame.NewEvent(
						lilagame.EventRewardGranted,
						view.Match.Code,
						*view.Match.WinnerUserID,
						req.RoundNumber,
						buildLilaRealtimePayload(view, map[string]interface{}{"winnerUserId": *view.Match.WinnerUserID}),
						time.Now(),
					),
					*view.Match.WinnerUserID,
				)
			}
		} else if view.CurrentRound == nil || view.CurrentRound.Number != req.RoundNumber || view.CurrentRound.Status != models.LilaRoundStatusRunning {
			h.emitLilaMatchEvent(lilagame.EventRoundResolved, userID, req.RoundNumber, view, nil, view.Players...)
			if view.CurrentRound != nil && view.CurrentRound.Status == models.LilaRoundStatusRunning {
				h.emitLilaMatchEvent(lilagame.EventRoundStarted, userID, view.CurrentRound.Number, view, nil, view.Players...)
			}
		}
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"answer": answer,
		"event":  lilagame.NewEvent(lilagame.EventAnswerAccepted, req.MatchCode, userID, req.RoundNumber, map[string]interface{}{"correct": answer.IsCorrect}, time.Now()),
	})
}

func (h *LilaHandler) UseSiddhi(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	locale := parseLilaLocale(c.Query("locale"))
	var req lilagame.SiddhiUsageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	req.UserID = userID
	if req.MatchCode == "" {
		req.MatchCode = c.Params("matchCode")
	}
	usage, err := h.service.UseSiddhi(c.UserContext(), req)
	if err != nil {
		return respondLilaError(c, err)
	}
	if view, viewErr := h.getLilaMatchView(c.UserContext(), req.MatchCode, locale); viewErr == nil && view != nil {
		h.emitLilaMatchEvent(lilagame.EventSiddhiUsed, userID, req.RoundNumber, view, map[string]interface{}{"type": req.Type}, view.Players...)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"usage": usage,
		"event": lilagame.NewEvent(lilagame.EventSiddhiUsed, req.MatchCode, userID, req.RoundNumber, map[string]interface{}{"type": req.Type}, time.Now()),
	})
}

func (h *LilaHandler) GetStore(c *fiber.Ctx) error {
	views, items, err := h.service.ListStoreItems(c.UserContext(), parseLilaLocale(c.Query("locale")))
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{"views": views, "items": items})
}

func (h *LilaHandler) PurchaseStoreItem(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req lilagame.PurchaseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	purchase, err := h.service.PurchaseStoreItem(c.UserContext(), userID, req)
	if err != nil {
		return respondLilaError(c, err)
	}
	h.emitLilaEvent(
		lilagame.NewEvent(lilagame.EventRewardGranted, "", userID, 0, map[string]interface{}{"purchaseId": purchase.ID}, time.Now()),
		userID,
	)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"purchase": purchase,
		"event":    lilagame.NewEvent(lilagame.EventRewardGranted, "", userID, 0, map[string]interface{}{"purchaseId": purchase.ID}, time.Now()),
	})
}

func (h *LilaHandler) SendGift(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req lilagame.GiftRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	gift, err := h.service.SendGift(c.UserContext(), userID, req)
	if err != nil {
		return respondLilaError(c, err)
	}
	h.emitLilaEvent(
		lilagame.NewEvent(lilagame.EventRewardGranted, "", userID, 0, map[string]interface{}{"giftId": gift.ID, "toUserId": gift.ToUserID}, time.Now()),
		userID,
		gift.ToUserID,
	)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"gift": gift})
}

func (h *LilaHandler) ClaimPassReward(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req lilagame.PassClaimRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	progress, err := h.service.ClaimPassReward(c.UserContext(), userID, req)
	if err != nil {
		return respondLilaError(c, err)
	}
	h.emitLilaEvent(
		lilagame.NewEvent(lilagame.EventRewardGranted, "", userID, 0, map[string]interface{}{"seasonCode": req.SeasonCode, "premium": req.Premium}, time.Now()),
		userID,
	)
	return c.JSON(fiber.Map{"progress": progress})
}

func (h *LilaHandler) ActivateSubscription(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req lilagame.SubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	subscription, err := h.service.ActivateSubscription(c.UserContext(), userID, req)
	if err != nil {
		return respondLilaError(c, err)
	}
	h.emitLilaEvent(
		lilagame.NewEvent(lilagame.EventRewardGranted, "", userID, 0, map[string]interface{}{"packageCode": req.PackageCode}, time.Now()),
		userID,
	)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"subscription": subscription})
}

func (h *LilaHandler) LinkGuru(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req lilagame.GuruLinkRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.StudentUserID == 0 {
		req.StudentUserID = userID
	}
	link, err := h.service.LinkGuru(c.UserContext(), req)
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"link": link})
}

func (h *LilaHandler) AwardQuestProgress(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req lilagame.QuestProgressRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	progress, err := h.service.AwardQuestProgress(c.UserContext(), userID, req)
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{"progress": progress})
}

func (h *LilaHandler) GetBalance(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	balance, err := h.service.GetBalanceSummary(c.UserContext(), userID)
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(balance)
}

func (h *LilaHandler) ListQuestions(c *fiber.Ctx) error {
	questions, err := h.service.ListQuestions(c.UserContext(), parseLilaLocale(c.Query("locale")), parseLilaMode(c.Query("mode")))
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{"questions": questions})
}

func (h *LilaHandler) AdminListQuestions(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	var questions []models.LilaQuestion
	query := h.db.WithContext(c.UserContext()).Order("updated_at desc")
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("status = ?", status)
	}
	if err := query.Find(&questions).Error; err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{"questions": questions})
}

func (h *LilaHandler) AdminCreateQuestion(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	var payload lilaQuestionPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	question, err := buildLilaQuestionModel(payload, nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := h.db.WithContext(c.UserContext()).Create(question).Error; err != nil {
		return respondLilaError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"question": question})
}

func (h *LilaHandler) AdminUpdateQuestion(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseLilaUintParam(c, "id")
	if err != nil {
		return err
	}
	var existing models.LilaQuestion
	if err := h.db.WithContext(c.UserContext()).First(&existing, id).Error; err != nil {
		return respondLilaError(c, err)
	}
	var payload lilaQuestionPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	question, buildErr := buildLilaQuestionModel(payload, &existing)
	if buildErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": buildErr.Error()})
	}
	if err := h.db.WithContext(c.UserContext()).Save(question).Error; err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{"question": question})
}

func (h *LilaHandler) AdminPublishQuestion(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseLilaUintParam(c, "id")
	if err != nil {
		return err
	}
	var question models.LilaQuestion
	if err := h.db.WithContext(c.UserContext()).First(&question, id).Error; err != nil {
		return respondLilaError(c, err)
	}
	if err := validateLilaQuestionCompleteness(&question); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	now := time.Now()
	question.Status = models.LilaQuestionStatusActive
	question.PublishedAt = &now
	question.ArchivedAt = nil
	if err := h.db.WithContext(c.UserContext()).Save(&question).Error; err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{"question": question})
}

func (h *LilaHandler) AdminArchiveQuestion(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	id, err := parseLilaUintParam(c, "id")
	if err != nil {
		return err
	}
	var question models.LilaQuestion
	if err := h.db.WithContext(c.UserContext()).First(&question, id).Error; err != nil {
		return respondLilaError(c, err)
	}
	now := time.Now()
	question.Status = models.LilaQuestionStatusArchived
	question.ArchivedAt = &now
	if err := h.db.WithContext(c.UserContext()).Save(&question).Error; err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(fiber.Map{"question": question})
}

func (h *LilaHandler) AdminGetLiveOps(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	var storeItems []models.LilaStoreItem
	var seasons []models.LilaPassSeason
	if err := h.db.WithContext(c.UserContext()).Order("sort_order asc, id asc").Find(&storeItems).Error; err != nil {
		return respondLilaError(c, err)
	}
	if err := h.db.WithContext(c.UserContext()).Order("starts_at desc, id desc").Find(&seasons).Error; err != nil {
		return respondLilaError(c, err)
	}
	dharmaPercent := 0
	for _, item := range storeItems {
		if strings.TrimSpace(item.MetaJSON) == "" {
			continue
		}
		var meta map[string]interface{}
		if err := json.Unmarshal([]byte(item.MetaJSON), &meta); err == nil {
			if value, ok := meta["dharmaPercent"].(float64); ok && value > 0 {
				dharmaPercent = int(value)
				break
			}
		}
	}
	return c.JSON(fiber.Map{
		"storeItems":    storeItems,
		"passSeasons":   seasons,
		"dharmaPercent": dharmaPercent,
	})
}

func (h *LilaHandler) AdminUpdateLiveOps(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	var payload lilaLiveOpsPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	err := h.db.WithContext(c.UserContext()).Transaction(func(tx *gorm.DB) error {
		for _, item := range payload.StoreItems {
			current := item
			if current.Code == "" {
				continue
			}
			if payload.DharmaPercent > 0 && current.CanUseReal {
				current.MetaJSON = marshalLilaJSON(map[string]interface{}{"dharmaPercent": payload.DharmaPercent})
			}
			if err := tx.Where("code = ?", current.Code).Assign(&current).FirstOrCreate(&current).Error; err != nil {
				return err
			}
		}
		for _, season := range payload.PassSeasons {
			current := season
			if strings.TrimSpace(current.Code) == "" {
				continue
			}
			if err := tx.Where("code = ?", current.Code).Assign(&current).FirstOrCreate(&current).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return respondLilaError(c, err)
	}
	return h.AdminGetLiveOps(c)
}

func (h *LilaHandler) AdminGetMetrics(c *fiber.Ctx) error {
	if err := requireAdmin(c); err != nil {
		return err
	}
	snapshot, err := lilagame.BuildMetricsSnapshot(c.UserContext(), h.db)
	if err != nil {
		return respondLilaError(c, err)
	}
	return c.JSON(snapshot)
}

func marshalLilaJSON(value interface{}) string {
	bytes, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(bytes)
}

func normalizeStringList(values []string) []string {
	out := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		out = append(out, trimmed)
	}
	return out
}

func validateLocalizedText(label string, text lilaLocalizedTextPayload) error {
	if strings.TrimSpace(text.Ru) == "" || strings.TrimSpace(text.En) == "" || strings.TrimSpace(text.Hi) == "" {
		return errors.New(label + " must be filled for ru, en, hi")
	}
	return nil
}

func validateLilaQuestionCompleteness(question *models.LilaQuestion) error {
	if question == nil {
		return errors.New("question is required")
	}
	if strings.TrimSpace(question.Slug) == "" {
		return errors.New("slug is required")
	}
	if strings.TrimSpace(question.PromptRu) == "" || strings.TrimSpace(question.PromptEn) == "" || strings.TrimSpace(question.PromptHi) == "" {
		return errors.New("prompt must be complete in ru, en, hi")
	}
	if len(normalizeStringList(unmarshalLilaStringSlice(question.OptionsRuJSON))) < 2 ||
		len(normalizeStringList(unmarshalLilaStringSlice(question.OptionsEnJSON))) < 2 ||
		len(normalizeStringList(unmarshalLilaStringSlice(question.OptionsHiJSON))) < 2 {
		return errors.New("options must contain at least two values in ru, en, hi")
	}
	if strings.TrimSpace(question.ExplanationRu) == "" || strings.TrimSpace(question.ExplanationEn) == "" || strings.TrimSpace(question.ExplanationHi) == "" {
		return errors.New("explanation must be complete in ru, en, hi")
	}
	return nil
}

func buildLilaQuestionModel(payload lilaQuestionPayload, existing *models.LilaQuestion) (*models.LilaQuestion, error) {
	if err := validateLocalizedText("prompt", payload.Prompt); err != nil {
		return nil, err
	}
	if err := validateLocalizedText("explanation", payload.Explanation); err != nil {
		return nil, err
	}
	if len(normalizeStringList(payload.Options.Ru)) < 2 || len(normalizeStringList(payload.Options.En)) < 2 || len(normalizeStringList(payload.Options.Hi)) < 2 {
		return nil, errors.New("options must contain at least two values in ru, en, hi")
	}

	model := &models.LilaQuestion{}
	if existing != nil {
		*model = *existing
	}
	model.Slug = strings.TrimSpace(payload.Slug)
	model.Type = payload.Type
	model.Category = strings.TrimSpace(payload.Category)
	model.Difficulty = payload.Difficulty
	model.Status = payload.Status
	model.AllowedModesJSON = marshalLilaJSON(normalizeStringList(payload.AllowedModes))
	model.PromptRu = strings.TrimSpace(payload.Prompt.Ru)
	model.PromptEn = strings.TrimSpace(payload.Prompt.En)
	model.PromptHi = strings.TrimSpace(payload.Prompt.Hi)
	model.OptionsRuJSON = marshalLilaJSON(normalizeStringList(payload.Options.Ru))
	model.OptionsEnJSON = marshalLilaJSON(normalizeStringList(payload.Options.En))
	model.OptionsHiJSON = marshalLilaJSON(normalizeStringList(payload.Options.Hi))
	model.ExplanationRu = strings.TrimSpace(payload.Explanation.Ru)
	model.ExplanationEn = strings.TrimSpace(payload.Explanation.En)
	model.ExplanationHi = strings.TrimSpace(payload.Explanation.Hi)
	model.AssetURL = strings.TrimSpace(payload.AssetURL)
	model.AssetKind = strings.TrimSpace(payload.AssetKind)
	model.CorrectOption = strings.TrimSpace(payload.CorrectOption)
	model.CorrectOrderJSON = marshalLilaJSON(normalizeStringList(payload.CorrectOrder))
	model.SourceRef = strings.TrimSpace(payload.SourceRef)
	model.MetaJSON = marshalLilaJSON(payload.Meta)
	if model.Status == models.LilaQuestionStatusActive {
		if err := validateLilaQuestionCompleteness(model); err != nil {
			return nil, err
		}
		if model.PublishedAt == nil {
			now := time.Now()
			model.PublishedAt = &now
		}
	}
	return model, nil
}

func unmarshalLilaStringSlice(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var values []string
	if err := json.Unmarshal([]byte(raw), &values); err != nil {
		return nil
	}
	return values
}
