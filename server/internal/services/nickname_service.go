package services

import (
	"errors"
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"

	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

var (
	ErrNicknameInvalid  = errors.New("invalid nickname")
	ErrNicknameTaken    = errors.New("nickname already taken")
	ErrNicknameCooldown = errors.New("nickname change cooldown active")
)

var (
	nicknameAllowedPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9._]{2,22}[a-z0-9]$`)
	repeatedSeparators     = regexp.MustCompile(`[._]{2,}`)
	nonNicknameChars       = regexp.MustCompile(`[^a-z0-9._]+`)
)

var reservedNicknames = map[string]struct{}{
	"admin":     {},
	"support":   {},
	"vedamatch": {},
	"root":      {},
	"api":       {},
	"system":    {},
	"null":      {},
	"undefined": {},
}

type NicknameService struct {
	db *gorm.DB
}

func NewNicknameService(db *gorm.DB) *NicknameService {
	return &NicknameService{db: db}
}

func NormalizeNickname(input string) string {
	normalized := strings.TrimSpace(strings.ToLower(input))
	normalized = strings.TrimPrefix(normalized, "@")
	normalized = strings.ReplaceAll(normalized, " ", "")
	normalized = nonNicknameChars.ReplaceAllString(normalized, "_")
	normalized = strings.Trim(normalized, "._")
	normalized = repeatedSeparators.ReplaceAllStringFunc(normalized, func(value string) string {
		return value[:1]
	})
	if len(normalized) > 24 {
		normalized = normalized[:24]
		normalized = strings.Trim(normalized, "._")
	}
	return normalized
}

func NicknameDisplay(nickname string) string {
	nickname = strings.TrimSpace(strings.TrimPrefix(nickname, "@"))
	if nickname == "" {
		return ""
	}
	return "@" + nickname
}

func ValidateNickname(normalized string) error {
	if len(normalized) < 4 || len(normalized) > 24 {
		return ErrNicknameInvalid
	}
	if !nicknameAllowedPattern.MatchString(normalized) {
		return ErrNicknameInvalid
	}
	if strings.Contains(normalized, "..") || strings.Contains(normalized, "__") {
		return ErrNicknameInvalid
	}
	if _, reserved := reservedNicknames[normalized]; reserved {
		return ErrNicknameInvalid
	}
	return nil
}

func (s *NicknameService) EnsureUnique(base string) (string, error) {
	base = NormalizeNickname(base)
	if err := ValidateNickname(base); err != nil {
		base = fmt.Sprintf("u%d", time.Now().Unix()%100000000)
	}

	candidate := base
	for i := 0; i < 1000; i++ {
		var count int64
		if err := s.db.Model(&models.User{}).Where("nickname = ?", candidate).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return candidate, nil
		}
		candidate = formatNicknameCandidate(base, i+1)
	}
	return "", ErrNicknameTaken
}

func (s *NicknameService) AssignForRegistration(preferred string, email string, karmicName string) (string, bool, error) {
	preferred = NormalizeNickname(preferred)
	if preferred != "" {
		if err := ValidateNickname(preferred); err != nil {
			return "", false, err
		}
		unique, err := s.EnsureUnique(preferred)
		if err != nil {
			return "", false, err
		}
		return unique, true, nil
	}

	base := deriveNicknameSeed(email, karmicName)
	unique, err := s.EnsureUnique(base)
	if err != nil {
		return "", false, err
	}
	return unique, false, nil
}

func (s *NicknameService) UpdateNickname(user *models.User, requested string) error {
	if user == nil {
		return errors.New("user is required")
	}
	normalized := NormalizeNickname(requested)
	if err := ValidateNickname(normalized); err != nil {
		return err
	}

	now := time.Now().UTC()
	if user.NicknameCooldownUntil != nil && now.Before(*user.NicknameCooldownUntil) && normalized != user.Nickname {
		return ErrNicknameCooldown
	}
	if normalized == user.Nickname {
		return nil
	}

	unique, err := s.EnsureUnique(normalized)
	if err != nil {
		return err
	}
	if unique != normalized {
		return ErrNicknameTaken
	}

	cooldown := now.Add(30 * 24 * time.Hour)
	updates := map[string]interface{}{
		"nickname":                normalized,
		"nickname_set_manually":   true,
		"nickname_changed_at":     now,
		"nickname_cooldown_until": cooldown,
	}
	if err := s.db.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		return err
	}

	user.Nickname = normalized
	user.NicknameSetManually = true
	user.NicknameChangedAt = &now
	user.NicknameCooldownUntil = &cooldown
	user.NicknameDisplay = NicknameDisplay(normalized)
	return nil
}

func (s *NicknameService) FindUserByNickname(nickname string) (*models.User, error) {
	normalized := NormalizeNickname(nickname)
	if err := ValidateNickname(normalized); err != nil {
		return nil, ErrNicknameInvalid
	}
	var user models.User
	if err := s.db.Where("nickname = ?", normalized).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, err
	}
	return &user, nil
}

func BackfillUserNickname(db *gorm.DB, limit int) (int64, error) {
	if db == nil {
		return 0, errors.New("db is required")
	}
	if limit <= 0 {
		limit = 200
	}
	svc := NewNicknameService(db)
	var users []models.User
	if err := db.Where("nickname IS NULL OR nickname = ''").Order("id ASC").Limit(limit).Find(&users).Error; err != nil {
		return 0, err
	}
	if len(users) == 0 {
		return 0, nil
	}

	var updated int64
	for i := range users {
		nick, manual, err := svc.AssignForRegistration("", users[i].Email, users[i].KarmicName)
		if err != nil {
			continue
		}
		if err := db.Model(&models.User{}).Where("id = ?", users[i].ID).Updates(map[string]interface{}{
			"nickname":              nick,
			"nickname_set_manually": manual,
		}).Error; err != nil {
			continue
		}
		updated++
	}
	return updated, nil
}

func deriveNicknameSeed(email string, karmicName string) string {
	email = strings.TrimSpace(strings.ToLower(email))
	if email != "" {
		if at := strings.Index(email, "@"); at > 0 {
			part := NormalizeNickname(email[:at])
			if len(part) >= 4 {
				return part
			}
		}
	}
	nameSeed := NormalizeNickname(karmicName)
	if len(nameSeed) >= 4 {
		return nameSeed
	}
	return fmt.Sprintf("u%x", rand.Uint32())
}

func formatNicknameCandidate(base string, attempt int) string {
	suffix := fmt.Sprintf("_%d", attempt)
	maxBaseLen := 24 - len(suffix)
	if maxBaseLen < 1 {
		maxBaseLen = 1
	}
	trimmed := base
	if len(trimmed) > maxBaseLen {
		trimmed = trimmed[:maxBaseLen]
		trimmed = strings.Trim(trimmed, "._")
		if trimmed == "" {
			trimmed = "u"
		}
	}
	return trimmed + suffix
}
