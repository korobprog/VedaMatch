package services

import (
	"errors"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

const (
	ekadashiReminderFastStart = "fast_start"
	ekadashiReminderParana    = "parana"
)

type EkadashiReminderSchedulerService struct {
	db             *gorm.DB
	ekadashi       *EkadashiService
	push           ekadashiPushSender
	ticker         *time.Ticker
	stopChan       chan struct{}
	running        bool
	mu             sync.Mutex
	nowFunc        func() time.Time
	lookbackWindow time.Duration
}

type ekadashiPushSender interface {
	SendToUser(userID uint, message PushMessage) error
}

func NewEkadashiReminderSchedulerService() *EkadashiReminderSchedulerService {
	return &EkadashiReminderSchedulerService{
		db:             database.DB,
		ekadashi:       NewEkadashiService(),
		push:           NewPushNotificationService(),
		stopChan:       make(chan struct{}),
		nowFunc:        time.Now,
		lookbackWindow: 15 * time.Minute,
	}
}

func (s *EkadashiReminderSchedulerService) Start(interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.running {
		log.Println("[EkadashiReminderScheduler] Already running")
		return
	}

	s.ticker = time.NewTicker(interval)
	s.running = true

	log.Printf("[EkadashiReminderScheduler] Started with interval %v", interval)

	go func() {
		s.ProcessDueReminders()
		for {
			select {
			case <-s.ticker.C:
				s.ProcessDueReminders()
			case <-s.stopChan:
				log.Println("[EkadashiReminderScheduler] Stopped")
				return
			}
		}
	}()
}

func (s *EkadashiReminderSchedulerService) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.running {
		return
	}

	s.ticker.Stop()
	close(s.stopChan)
	s.running = false
}

func (s *EkadashiReminderSchedulerService) ProcessDueReminders() {
	if s.db == nil || s.ekadashi == nil || s.push == nil {
		log.Println("[EkadashiReminderScheduler] Missing dependencies, skipping tick")
		return
	}

	var preferences []models.EkadashiPushPreference
	if err := s.db.Where("enabled = ?", true).Find(&preferences).Error; err != nil {
		log.Printf("[EkadashiReminderScheduler] Failed to load preferences: %v", err)
		return
	}

	nowUTC := s.nowFunc().UTC()
	for _, pref := range preferences {
		if err := s.processPreference(pref, nowUTC); err != nil {
			log.Printf("[EkadashiReminderScheduler] user=%d failed: %v", pref.UserID, err)
		}
	}
}

func (s *EkadashiReminderSchedulerService) processPreference(pref models.EkadashiPushPreference, nowUTC time.Time) error {
	locData := s.ekadashi.resolveLocation(pref.UserID, pref.Timezone, pref.City, pref.Country)
	loc, err := time.LoadLocation(locData.TimeZone)
	if err != nil {
		loc = time.UTC
	}

	nowLocal := nowUTC.In(loc)
	if pref.UseQuietHours && isEkadashiHourBlocked(nowLocal.Hour(), clampEkadashiHour(pref.QuietStartHour, 22), clampEkadashiHour(pref.QuietEndHour, 8)) {
		return nil
	}

	org := resolveEkadashiOrganization(pref.OrganizationID)
	candidateDates := []time.Time{
		time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), 0, 0, 0, 0, loc),
		time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day()-1, 0, 0, 0, 0, loc),
	}

	for _, candidateDate := range candidateDates {
		day := s.ekadashi.buildEventForDate(candidateDate.UTC(), locData, org)
		if pref.FastStartReminder {
			if err := s.maybeDeliverReminder(pref, day, ekadashiReminderFastStart, day.FastStartAt, nowUTC); err != nil {
				return err
			}
		}
		if pref.ParanaReminder {
			if err := s.maybeDeliverReminder(pref, day, ekadashiReminderParana, day.ParanaStartAt, nowUTC); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *EkadashiReminderSchedulerService) maybeDeliverReminder(pref models.EkadashiPushPreference, day models.EkadashiDay, reminderType string, scheduledAt *string, nowUTC time.Time) error {
	if scheduledAt == nil || strings.TrimSpace(*scheduledAt) == "" {
		return nil
	}

	scheduledTime, err := time.Parse(time.RFC3339, strings.TrimSpace(*scheduledAt))
	if err != nil {
		return nil
	}

	if !isEkadashiReminderDue(scheduledTime, nowUTC, s.lookbackWindow) {
		return nil
	}

	delivered, err := s.wasReminderDelivered(pref.UserID, reminderType, day.Date, day.OrganizationID)
	if err != nil {
		return err
	}
	if delivered {
		return nil
	}

	hasTarget, err := s.hasPushTarget(pref.UserID)
	if err != nil {
		return err
	}
	if !hasTarget {
		return nil
	}

	userLanguage := "en"
	var user models.User
	if err := s.db.Select("language").Where("id = ?", pref.UserID).First(&user).Error; err == nil {
		userLanguage = normalizeEkadashiLanguage(user.Language)
	}

	message := buildEkadashiReminderMessage(userLanguage, day, reminderType, scheduledTime)
	if err := s.push.SendToUser(pref.UserID, message); err != nil {
		return err
	}

	return s.recordReminderDelivery(pref.UserID, reminderType, day.Date, day.OrganizationID, nowUTC)
}

func (s *EkadashiReminderSchedulerService) wasReminderDelivered(userID uint, reminderType, eventDate, organizationID string) (bool, error) {
	var count int64
	err := s.db.Model(&models.EkadashiReminderDelivery{}).
		Where("user_id = ? AND reminder_type = ? AND event_date = ? AND organization_id = ?", userID, reminderType, eventDate, organizationID).
		Count(&count).Error
	return count > 0, err
}

func (s *EkadashiReminderSchedulerService) recordReminderDelivery(userID uint, reminderType, eventDate, organizationID string, deliveredAt time.Time) error {
	record := models.EkadashiReminderDelivery{
		UserID:         userID,
		ReminderType:   reminderType,
		EventDate:      eventDate,
		OrganizationID: organizationID,
		DeliveredAt:    deliveredAt.Format(time.RFC3339),
	}
	if err := s.db.Create(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil
		}
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return nil
		}
		return err
	}
	return nil
}

func (s *EkadashiReminderSchedulerService) hasPushTarget(userID uint) (bool, error) {
	var activeCount int64
	if err := s.db.Model(&models.UserDeviceToken{}).
		Where("user_id = ? AND invalidated_at IS NULL", userID).
		Count(&activeCount).Error; err != nil {
		return false, err
	}
	if activeCount > 0 {
		return true, nil
	}

	var user models.User
	if err := s.db.Select("push_token").Where("id = ?", userID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return strings.TrimSpace(user.PushToken) != "", nil
}

func isEkadashiHourBlocked(hour, startHour, endHour int) bool {
	if startHour == endHour {
		return false
	}
	if startHour < endHour {
		return hour >= startHour && hour < endHour
	}
	return hour >= startHour || hour < endHour
}

func isEkadashiReminderDue(scheduledAt, now time.Time, lookback time.Duration) bool {
	if scheduledAt.After(now) {
		return false
	}
	return now.Sub(scheduledAt) <= lookback
}

func normalizeEkadashiLanguage(language string) string {
	language = strings.ToLower(strings.TrimSpace(language))
	switch {
	case strings.HasPrefix(language, "ru"):
		return "ru"
	case strings.HasPrefix(language, "hi"):
		return "hi"
	default:
		return "en"
	}
}

func buildEkadashiReminderMessage(language string, day models.EkadashiDay, reminderType string, scheduledAt time.Time) PushMessage {
	title, body := ekadashiReminderCopy(language, day, reminderType, scheduledAt)
	return PushMessage{
		Title:    title,
		Body:     body,
		Priority: "high",
		Data: map[string]string{
			"type":           "ekadashi_reminder",
			"screen":         "EkadashiCalendar",
			"eventDate":      day.Date,
			"organizationId": day.OrganizationID,
			"reminderType":   reminderType,
		},
	}
}

func ekadashiReminderCopy(language string, day models.EkadashiDay, reminderType string, scheduledAt time.Time) (string, string) {
	timeLabel := scheduledAt.Format("15:04")
	switch language {
	case "ru":
		if reminderType == ekadashiReminderParana {
			return "🌅 Парана начинается", fmt.Sprintf("%s: окно параны для %s начинается в %s.", day.OrganizationName, day.DisplayTitle, timeLabel)
		}
		return "🪔 Начало поста Экадаши", fmt.Sprintf("%s: %s начинается в %s.", day.OrganizationName, day.DisplayTitle, timeLabel)
	case "hi":
		if reminderType == ekadashiReminderParana {
			return "🌅 पारण आरंभ", fmt.Sprintf("%s: %s के लिए पारण का समय %s पर शुरू होता है।", day.OrganizationName, day.DisplayTitle, timeLabel)
		}
		return "🪔 एकादशी उपवास आरंभ", fmt.Sprintf("%s: %s %s पर आरंभ होता है।", day.OrganizationName, day.DisplayTitle, timeLabel)
	default:
		if reminderType == ekadashiReminderParana {
			return "🌅 Parana opens", fmt.Sprintf("%s: the parana window for %s starts at %s.", day.OrganizationName, day.DisplayTitle, timeLabel)
		}
		return "🪔 Ekadashi fast begins", fmt.Sprintf("%s: %s starts at %s.", day.OrganizationName, day.DisplayTitle, timeLabel)
	}
}

var ekadashiReminderScheduler *EkadashiReminderSchedulerService

func GetEkadashiReminderScheduler() *EkadashiReminderSchedulerService {
	if ekadashiReminderScheduler == nil {
		ekadashiReminderScheduler = NewEkadashiReminderSchedulerService()
	}
	return ekadashiReminderScheduler
}

func StartEkadashiReminderScheduler() {
	GetEkadashiReminderScheduler().Start(5 * time.Minute)
}

func StopEkadashiReminderScheduler() {
	GetEkadashiReminderScheduler().Stop()
}
