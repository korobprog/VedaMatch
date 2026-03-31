package lila

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"rag-agent-server/internal/models"
)

func normalizeLocale(locale Locale) Locale {
	switch strings.ToLower(strings.TrimSpace(string(locale))) {
	case string(LocaleEN):
		return LocaleEN
	case string(LocaleHI):
		return LocaleHI
	default:
		return LocaleRU
	}
}

func localizedString(v LocalizedText, locale Locale) string {
	switch normalizeLocale(locale) {
	case LocaleEN:
		if strings.TrimSpace(v.En) != "" {
			return v.En
		}
	case LocaleHI:
		if strings.TrimSpace(v.Hi) != "" {
			return v.Hi
		}
	default:
		if strings.TrimSpace(v.Ru) != "" {
			return v.Ru
		}
	}
	if strings.TrimSpace(v.Ru) != "" {
		return v.Ru
	}
	if strings.TrimSpace(v.En) != "" {
		return v.En
	}
	return v.Hi
}

func marshalJSON(v interface{}) string {
	if v == nil {
		return "null"
	}
	data, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(data)
}

func unmarshalStringSlice(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var out []string
	if err := json.Unmarshal([]byte(raw), &out); err == nil {
		return out
	}
	return []string{raw}
}

func unmarshalIntSlice(raw string) []int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var out []int
	if err := json.Unmarshal([]byte(raw), &out); err == nil {
		return out
	}
	return nil
}

func normalizeStringSlice(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
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

func questionViewFromModel(q models.LilaQuestion, locale Locale) QuestionView {
	view := QuestionView{
		ID:           q.ID,
		Slug:         q.Slug,
		Type:         q.Type,
		Category:     q.Category,
		Difficulty:   q.Difficulty,
		AssetURL:     q.AssetURL,
		AssetKind:    q.AssetKind,
		AllowedModes: parseAllowedModes(q.AllowedModesJSON),
	}
	switch normalizeLocale(locale) {
	case LocaleEN:
		view.Prompt = q.PromptEn
		view.Options = unmarshalStringSlice(q.OptionsEnJSON)
		view.Explanation = q.ExplanationEn
	case LocaleHI:
		view.Prompt = q.PromptHi
		view.Options = unmarshalStringSlice(q.OptionsHiJSON)
		view.Explanation = q.ExplanationHi
	default:
		view.Prompt = q.PromptRu
		view.Options = unmarshalStringSlice(q.OptionsRuJSON)
		view.Explanation = q.ExplanationRu
	}
	return view
}

func parseAllowedModes(raw string) []models.LilaGameMode {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var out []models.LilaGameMode
	if err := json.Unmarshal([]byte(raw), &out); err == nil {
		return out
	}
	return []models.LilaGameMode{models.LilaGameMode(raw)}
}

func defaultRankForExperience(exp int) models.LilaRank {
	switch {
	case exp >= 5000:
		return models.LilaRankMaharishi
	case exp >= 2500:
		return models.LilaRankRishi
	case exp >= 1000:
		return models.LilaRankPandit
	case exp >= 250:
		return models.LilaRankStudent
	default:
		return models.LilaRankSeeker
	}
}

func defaultLevelForExperience(exp int) int {
	if exp < 0 {
		return 1
	}
	return 1 + exp/250
}

func questionScoreBonus(difficulty models.LilaDifficulty) int {
	switch difficulty {
	case models.LilaDifficultySattva:
		return 15
	case models.LilaDifficultyRajas:
		return 8
	default:
		return 4
	}
}

func isAnswerCorrect(question models.LilaQuestion, submission AnswerSubmissionRequest) (bool, error) {
	switch question.Type {
	case models.LilaQuestionTypeOrdering:
		expected := normalizeStringSlice(unmarshalStringSlice(question.CorrectOrderJSON))
		actual := normalizeStringSlice(submission.Ordering)
		if len(expected) == 0 || len(actual) == 0 {
			return false, errors.New("ordering answer is empty")
		}
		if len(expected) != len(actual) {
			return false, nil
		}
		for idx := range expected {
			if expected[idx] != actual[idx] {
				return false, nil
			}
		}
		return true, nil
	default:
		if strings.TrimSpace(question.CorrectOption) == "" {
			return false, errors.New("question is missing a correct option")
		}
		return strings.EqualFold(strings.TrimSpace(question.CorrectOption), strings.TrimSpace(submission.SelectedOption)), nil
	}
}

func generateMatchCode(mode models.LilaGameMode, now time.Time, userCount int) string {
	segment := strings.ToUpper(strings.ReplaceAll(string(mode), "_", ""))
	return fmt.Sprintf("LILA-%s-%d-%d", segment, now.Unix()%100000, userCount)
}

func resolveStoreSpendTotals(item models.LilaStoreItem, currency models.LilaCurrencyType, quantity int, subject string) (int, int, error) {
	if quantity <= 0 {
		quantity = 1
	}

	switch currency {
	case models.LilaCurrencyTypeBonus:
		if !item.CanUseBonus {
			return 0, 0, fmt.Errorf("%s is not purchasable with bonus balance", subject)
		}
		totalBonus := item.PriceBonus * quantity
		if totalBonus <= 0 {
			return 0, 0, fmt.Errorf("%s bonus price is not configured", subject)
		}
		return totalBonus, 0, nil
	case models.LilaCurrencyTypeReal:
		if !item.CanUseReal {
			return 0, 0, fmt.Errorf("%s is not purchasable with real balance", subject)
		}
		totalReal := item.PriceReal * quantity
		if totalReal <= 0 {
			return 0, 0, fmt.Errorf("%s real price is not configured", subject)
		}
		return 0, totalReal, nil
	default:
		return 0, 0, errors.New("currency is required")
	}
}

func validatePositiveRealPrice(amount int, subject string) error {
	if amount <= 0 {
		return fmt.Errorf("%s real price is not configured", subject)
	}
	return nil
}
