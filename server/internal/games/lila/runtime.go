package lila

import (
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"time"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

type matchScoreboardState struct {
	Scores            map[uint]int `json:"scores"`
	EliminatedUserIDs []uint       `json:"eliminatedUserIds,omitempty"`
}

func parseMatchPlayerIDs(match models.LilaMatch) []uint {
	if strings.TrimSpace(match.PlayerIDsJSON) == "" {
		return nil
	}
	var playerIDs []uint
	if err := json.Unmarshal([]byte(match.PlayerIDsJSON), &playerIDs); err != nil {
		return nil
	}
	return uniqueUintSlice(playerIDs)
}

func uniqueUintSlice(values []uint) []uint {
	seen := make(map[uint]struct{}, len(values))
	out := make([]uint, 0, len(values))
	for _, value := range values {
		if value == 0 {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func parseMatchScoreboard(match models.LilaMatch) matchScoreboardState {
	state := matchScoreboardState{
		Scores: make(map[uint]int),
	}
	if strings.TrimSpace(match.ScoreboardJSON) == "" {
		return state
	}
	_ = json.Unmarshal([]byte(match.ScoreboardJSON), &state)
	if state.Scores == nil {
		state.Scores = make(map[uint]int)
	}
	state.EliminatedUserIDs = uniqueUintSlice(state.EliminatedUserIDs)
	return state
}

func applyScoreboardToMatch(match *models.LilaMatch, state matchScoreboardState) {
	if match == nil {
		return
	}
	state.EliminatedUserIDs = uniqueUintSlice(state.EliminatedUserIDs)
	match.ScoreboardJSON = marshalJSON(state)
}

func currentRoundDurationForMode(mode models.LilaGameMode) time.Duration {
	switch mode {
	case models.LilaGameModeSabha:
		return 25 * time.Second
	case models.LilaGameModeSurvivalSamsara:
		return 12 * time.Second
	default:
		return 18 * time.Second
	}
}

func (s *Service) loadQueueEntriesForMatchTx(tx *gorm.DB, matchID uint) ([]models.LilaQueueEntry, error) {
	var queue []models.LilaQueueEntry
	if err := tx.Where("match_id = ?", matchID).Order("joined_at asc, id asc").Find(&queue).Error; err != nil {
		return nil, err
	}
	return queue, nil
}

func (s *Service) loadCurrentRoundTx(tx *gorm.DB, matchID uint) (*models.LilaRound, error) {
	var round models.LilaRound
	if err := tx.Where("match_id = ? AND status = ?", matchID, models.LilaRoundStatusRunning).Order("number desc").First(&round).Error; err == nil {
		return &round, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if err := tx.Where("match_id = ?", matchID).Order("number desc").First(&round).Error; err == nil {
		return &round, nil
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	} else {
		return nil, err
	}
}

func (s *Service) selectQuestionForRoundTx(tx *gorm.DB, mode models.LilaGameMode, roundNumber int) (*models.LilaQuestion, error) {
	var questions []models.LilaQuestion
	if err := tx.Where("status = ? AND allowed_modes_json LIKE ?", models.LilaQuestionStatusActive, "%"+string(mode)+"%").
		Order("difficulty asc, id asc").
		Find(&questions).Error; err != nil {
		return nil, err
	}
	if len(questions) == 0 {
		return nil, errors.New("no active questions for mode")
	}
	index := 0
	if roundNumber > 1 {
		index = (roundNumber - 1) % len(questions)
	}
	question := questions[index]
	return &question, nil
}

func (s *Service) createRoundTx(tx *gorm.DB, match *models.LilaMatch, roundNumber int, locale Locale) (*models.LilaRound, error) {
	if match == nil {
		return nil, errors.New("match is required")
	}
	question, err := s.selectQuestionForRoundTx(tx, match.Mode, roundNumber)
	if err != nil {
		return nil, err
	}
	now := s.now()
	end := now.Add(currentRoundDurationForMode(match.Mode))
	round := models.LilaRound{
		MatchID:       match.ID,
		Number:        roundNumber,
		Status:        models.LilaRoundStatusRunning,
		QuestionID:    &question.ID,
		StartedAt:     &now,
		EndsAt:        &end,
		DurationMs:    int(currentRoundDurationForMode(match.Mode) / time.Millisecond),
		BonusWindowMs: 2000,
	}
	if err := tx.Create(&round).Error; err != nil {
		return nil, err
	}
	if err := s.buildQuestionSnapshot(tx, &round, *question, locale); err != nil {
		return nil, err
	}
	match.CurrentRound = roundNumber
	match.LastEventSeq++
	if err := tx.Save(match).Error; err != nil {
		return nil, err
	}
	return &round, nil
}

func isUserIDInSet(values []uint, target uint) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func filterActivePlayers(players []uint, eliminated []uint) []uint {
	if len(eliminated) == 0 {
		return append([]uint(nil), players...)
	}
	out := make([]uint, 0, len(players))
	for _, userID := range players {
		if isUserIDInSet(eliminated, userID) {
			continue
		}
		out = append(out, userID)
	}
	return out
}

func appendUniqueUint(values []uint, target uint) []uint {
	if target == 0 || isUserIDInSet(values, target) {
		return values
	}
	return append(values, target)
}

func (s *Service) resolveRoundTx(tx *gorm.DB, match *models.LilaMatch, round *models.LilaRound, board *matchScoreboardState) error {
	if tx == nil || match == nil || round == nil || board == nil {
		return errors.New("match resolution state is incomplete")
	}
	playerIDs := parseMatchPlayerIDs(*match)
	activePlayers := filterActivePlayers(playerIDs, board.EliminatedUserIDs)

	var answers []models.LilaAnswer
	if err := tx.Where("round_id = ?", round.ID).Find(&answers).Error; err != nil {
		return err
	}
	answerByUserID := make(map[uint]models.LilaAnswer, len(answers))
	for _, answer := range answers {
		answerByUserID[answer.UserID] = answer
	}

	for _, userID := range activePlayers {
		answer, answered := answerByUserID[userID]
		switch {
		case answered:
			board.Scores[userID] += answer.ScoreDelta
			if match.Mode == models.LilaGameModeDharmaDuel && answer.KarmaTransfer > 0 && len(activePlayers) == 2 {
				for _, otherUserID := range activePlayers {
					if otherUserID == userID {
						continue
					}
					board.Scores[otherUserID] += answer.KarmaTransfer
				}
			}
			if match.Mode == models.LilaGameModeSurvivalSamsara && !answer.IsCorrect {
				board.EliminatedUserIDs = appendUniqueUint(board.EliminatedUserIDs, userID)
			}
		case match.Mode == models.LilaGameModeDharmaDuel && len(activePlayers) == 2:
			board.Scores[userID] -= 5
			for _, otherUserID := range activePlayers {
				if otherUserID == userID {
					continue
				}
				board.Scores[otherUserID] += 5
			}
		case match.Mode == models.LilaGameModeSurvivalSamsara:
			board.Scores[userID] -= 8
			board.EliminatedUserIDs = appendUniqueUint(board.EliminatedUserIDs, userID)
		default:
			board.Scores[userID] -= 4
		}
	}

	now := s.now()
	round.Status = models.LilaRoundStatusResolved
	round.ResolvedAt = &now
	if err := tx.Save(round).Error; err != nil {
		return err
	}

	applyScoreboardToMatch(match, *board)
	return tx.Save(match).Error
}

func chooseWinner(players []uint, board matchScoreboardState) *uint {
	if len(players) == 0 {
		return nil
	}
	sort.Slice(players, func(i, j int) bool {
		left := board.Scores[players[i]]
		right := board.Scores[players[j]]
		if left == right {
			return players[i] < players[j]
		}
		return left > right
	})
	winner := players[0]
	return &winner
}

func rewardBonusForMode(mode models.LilaGameMode) int {
	switch mode {
	case models.LilaGameModeSabha:
		return 18
	case models.LilaGameModeSurvivalSamsara:
		return 25
	default:
		return 10
	}
}

func (s *Service) finishMatchTx(tx *gorm.DB, match *models.LilaMatch, board *matchScoreboardState) error {
	if tx == nil || match == nil || board == nil {
		return errors.New("match finish state is incomplete")
	}
	if match.Status == models.LilaMatchStatusFinished {
		return nil
	}

	players := parseMatchPlayerIDs(*match)
	activePlayers := filterActivePlayers(players, board.EliminatedUserIDs)
	if len(activePlayers) == 0 {
		activePlayers = players
	}
	winnerUserID := chooseWinner(activePlayers, *board)
	now := s.now()
	match.Status = models.LilaMatchStatusFinished
	match.FinishedAt = &now
	match.WinnerUserID = winnerUserID
	match.LastEventSeq++
	if winnerUserID != nil {
		bonus := rewardBonusForMode(match.Mode)
		if _, err := s.addBonusTx(tx, *winnerUserID, bonus, "Lila match win", "match", match.Code, map[string]interface{}{
			"mode":      match.Mode,
			"matchCode": match.Code,
		}); err != nil {
			return err
		}
		match.RewardsJSON = marshalJSON(map[string]interface{}{
			"winnerUserId": winnerUserID,
			"bonusAwarded": bonus,
		})
		if err := tx.Model(&models.LilaProfile{}).Where("user_id = ?", *winnerUserID).Updates(map[string]interface{}{
			"win_count":      gorm.Expr("win_count + ?", 1),
			"last_active_at": s.now(),
		}).Error; err != nil {
			return err
		}
	}
	if err := tx.Model(&models.LilaProfile{}).
		Where("user_id IN ?", players).
		Where("user_id <> ?", match.WinnerUserID).
		Updates(map[string]interface{}{
			"lose_count":     gorm.Expr("lose_count + ?", 1),
			"last_active_at": s.now(),
		}).Error; err != nil {
		return err
	}
	applyScoreboardToMatch(match, *board)
	return tx.Save(match).Error
}

func (s *Service) advanceMatchStateTx(tx *gorm.DB, match *models.LilaMatch, locale Locale) error {
	if tx == nil || match == nil {
		return errors.New("match is required")
	}

	for step := 0; step < maxInt(match.RoundCount+2, 4); step++ {
		board := parseMatchScoreboard(*match)
		for _, userID := range parseMatchPlayerIDs(*match) {
			if _, ok := board.Scores[userID]; !ok {
				board.Scores[userID] = 0
			}
		}

		if match.Status != models.LilaMatchStatusActive {
			applyScoreboardToMatch(match, board)
			return tx.Save(match).Error
		}

		currentRound, err := s.loadCurrentRoundTx(tx, match.ID)
		if err != nil {
			return err
		}

		if currentRound == nil {
			activePlayers := filterActivePlayers(parseMatchPlayerIDs(*match), board.EliminatedUserIDs)
			if match.CurrentRound >= match.RoundCount || len(activePlayers) <= 1 {
				return s.finishMatchTx(tx, match, &board)
			}
			if _, err := s.createRoundTx(tx, match, match.CurrentRound+1, locale); err != nil {
				return err
			}
			return nil
		}

		if currentRound.Status != models.LilaRoundStatusRunning {
			activePlayers := filterActivePlayers(parseMatchPlayerIDs(*match), board.EliminatedUserIDs)
			if currentRound.Number >= match.RoundCount || len(activePlayers) <= 1 {
				return s.finishMatchTx(tx, match, &board)
			}
			if _, err := s.createRoundTx(tx, match, currentRound.Number+1, locale); err != nil {
				return err
			}
			return nil
		}

		activePlayers := filterActivePlayers(parseMatchPlayerIDs(*match), board.EliminatedUserIDs)
		var answerCount int64
		if err := tx.Model(&models.LilaAnswer{}).
			Where("round_id = ? AND user_id IN ?", currentRound.ID, activePlayers).
			Count(&answerCount).Error; err != nil {
			return err
		}

		roundExpired := currentRound.EndsAt != nil && !currentRound.EndsAt.After(s.now())
		if !roundExpired && int(answerCount) < len(activePlayers) {
			return nil
		}

		if err := s.resolveRoundTx(tx, match, currentRound, &board); err != nil {
			return err
		}
		if currentRound.Number >= match.RoundCount || len(filterActivePlayers(parseMatchPlayerIDs(*match), board.EliminatedUserIDs)) <= 1 {
			return s.finishMatchTx(tx, match, &board)
		}
	}

	return nil
}
