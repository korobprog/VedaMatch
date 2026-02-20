package database

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/models"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type serviceSeedUserSpec struct {
	Key           string
	Email         string
	KarmicName    string
	SpiritualName string
	City          string
	Role          string
	Identity      string
}

type serviceSeedTariffSpec struct {
	Name               string
	Price              int
	MaxBonusLkmPercent int
	DurationMinutes    int
	SessionsCount      int
	ValidityDays       int
	Includes           []string
	IsDefault          bool
	SortOrder          int
}

type serviceSeedScheduleSpec struct {
	DayOfWeek       int
	TimeStart       string
	TimeEnd         string
	MaxParticipants int
	SlotDuration    int
	BufferMinutes   int
	Timezone        string
}

type serviceSeedBookingSpec struct {
	Key           string
	ClientKey     string
	OffsetDays    int
	Hour          int
	Minute        int
	Duration      int
	Status        models.BookingStatus
	ClientNote    string
	Source        string
	SourcePostID  *uint
	SourceChannel *uint
}

type serviceSeedDefinition struct {
	Key          string
	OwnerKey     string
	Title        string
	Description  string
	Category     models.ServiceCategory
	Language     string
	Formats      string
	ScheduleType models.ServiceScheduleType
	Channel      models.ServiceChannel
	ChannelLink  string
	AccessType   models.ServiceAccessType
	Status       models.ServiceStatus
	Settings     map[string]interface{}
	ViewsCount   int
	Rating       float64
	ReviewsCount int
	Tariffs      []serviceSeedTariffSpec
	Schedules    []serviceSeedScheduleSpec
	Bookings     []serviceSeedBookingSpec
}

// SeedServices creates realistic demo data for the "Services" module.
func SeedServices() {
	users, err := ensureServiceSeedUsers()
	if err != nil {
		log.Printf("[Seed] Services: users init failed: %v", err)
		return
	}

	definitions := buildServiceSeedDefinitions()
	created := 0
	updated := 0

	for _, def := range definitions {
		owner, ok := users[def.OwnerKey]
		if !ok || owner.ID == 0 {
			log.Printf("[Seed] Services: owner '%s' not found for '%s'", def.OwnerKey, def.Title)
			continue
		}

		operation, err := upsertServiceSeed(def, owner, users)
		if err != nil {
			log.Printf("[Seed] Services: failed for '%s': %v", def.Title, err)
			continue
		}
		if operation == "created" {
			created++
		} else {
			updated++
		}
	}

	log.Printf("[Seed] Services: done (created=%d, updated=%d)", created, updated)
}

func ensureServiceSeedUsers() (map[string]models.User, error) {
	specs := []serviceSeedUserSpec{
		{
			Key:           "master_astro",
			Email:         "master.astro.demo@vedamatch.local",
			KarmicName:    "Артем Соколов",
			SpiritualName: "Ачьюта Дас",
			City:          "Москва",
			Role:          models.RoleDevotee,
			Identity:      "astrologer",
		},
		{
			Key:           "master_psy",
			Email:         "master.psy.demo@vedamatch.local",
			KarmicName:    "Марина Орлова",
			SpiritualName: "Мадхави Деви Даси",
			City:          "Санкт-Петербург",
			Role:          models.RoleYogi,
			Identity:      "psychologist",
		},
		{
			Key:           "master_yagya",
			Email:         "master.yagya.demo@vedamatch.local",
			KarmicName:    "Игорь Лебедев",
			SpiritualName: "Ягьешвара Дас",
			City:          "Казань",
			Role:          models.RoleDevotee,
			Identity:      "spiritual_mentor",
		},
		{
			Key:           "master_coach",
			Email:         "master.coach.demo@vedamatch.local",
			KarmicName:    "Елена Миронова",
			SpiritualName: "Кришнаприя Деви Даси",
			City:          "Екатеринбург",
			Role:          models.RoleInGoodness,
			Identity:      "coach",
		},
		{
			Key:           "client_anita",
			Email:         "client.anita.demo@vedamatch.local",
			KarmicName:    "Анита Смирнова",
			SpiritualName: "Ананга Деви Даси",
			City:          "Москва",
			Role:          models.RoleUser,
			Identity:      "seeker",
		},
		{
			Key:           "client_roman",
			Email:         "client.roman.demo@vedamatch.local",
			KarmicName:    "Роман Павлов",
			SpiritualName: "Рама Дас",
			City:          "Нижний Новгород",
			Role:          models.RoleUser,
			Identity:      "seeker",
		},
		{
			Key:           "client_lila",
			Email:         "client.lila.demo@vedamatch.local",
			KarmicName:    "Лилия Крылова",
			SpiritualName: "Лила Деви Даси",
			City:          "Краснодар",
			Role:          models.RoleUser,
			Identity:      "seeker",
		},
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	result := make(map[string]models.User, len(specs))
	for _, spec := range specs {
		user, ensureErr := ensureServiceSeedUser(spec, string(hash))
		if ensureErr != nil {
			return nil, ensureErr
		}
		result[spec.Key] = user
	}

	return result, nil
}

func ensureServiceSeedUser(spec serviceSeedUserSpec, passwordHash string) (models.User, error) {
	var user models.User
	err := DB.Where("email = ?", spec.Email).First(&user).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return models.User{}, err
		}

		newUser := models.User{
			Email:             spec.Email,
			Password:          passwordHash,
			KarmicName:        spec.KarmicName,
			SpiritualName:     spec.SpiritualName,
			City:              spec.City,
			Country:           "Россия",
			Role:              spec.Role,
			Identity:          spec.Identity,
			Language:          "ru",
			IsProfileComplete: true,
			DatingEnabled:     true,
			InviteCode:        generateUniqueServiceSeedInviteCode(spec.Key),
		}

		if createErr := DB.Create(&newUser).Error; createErr != nil {
			return models.User{}, createErr
		}
		return newUser, nil
	}

	updates := map[string]interface{}{}
	if strings.TrimSpace(user.KarmicName) == "" {
		updates["karmic_name"] = spec.KarmicName
	}
	if strings.TrimSpace(user.SpiritualName) == "" {
		updates["spiritual_name"] = spec.SpiritualName
	}
	if strings.TrimSpace(user.City) == "" {
		updates["city"] = spec.City
	}
	if strings.TrimSpace(user.Country) == "" {
		updates["country"] = "Россия"
	}
	if strings.TrimSpace(user.Password) == "" {
		updates["password"] = passwordHash
	}
	if strings.TrimSpace(user.Identity) == "" {
		updates["identity"] = spec.Identity
	}
	if strings.TrimSpace(user.Role) == "" {
		updates["role"] = spec.Role
	}
	if strings.TrimSpace(user.Language) == "" {
		updates["language"] = "ru"
	}
	if !user.IsProfileComplete {
		updates["is_profile_complete"] = true
	}
	if strings.TrimSpace(user.InviteCode) == "" {
		updates["invite_code"] = generateUniqueServiceSeedInviteCode(spec.Key)
	}

	if len(updates) > 0 {
		if err := DB.Model(&user).Updates(updates).Error; err != nil {
			return models.User{}, err
		}
		if err := DB.First(&user, user.ID).Error; err != nil {
			return models.User{}, err
		}
	}

	return user, nil
}

func generateUniqueServiceSeedInviteCode(seedKey string) string {
	prefix := strings.ToUpper(strings.TrimSpace(seedKey))
	prefix = strings.Map(func(r rune) rune {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			return r
		}
		return -1
	}, prefix)
	if len(prefix) < 2 {
		prefix = "SV"
	} else {
		prefix = prefix[:2]
	}

	for i := 0; i < 64; i++ {
		serial := (time.Now().UnixNano() / 1000) + int64(i*97)
		serial %= 2176782336 // 36^6
		suffix := strings.ToUpper(strconv.FormatInt(serial, 36))
		if len(suffix) < 6 {
			suffix = strings.Repeat("0", 6-len(suffix)) + suffix
		}
		code := prefix + suffix

		var count int64
		if err := DB.Model(&models.User{}).Where("invite_code = ?", code).Count(&count).Error; err == nil && count == 0 {
			return code
		}
	}

	return fmt.Sprintf("SV%06d", time.Now().UnixNano()%1000000)
}

func buildServiceSeedDefinitions() []serviceSeedDefinition {
	return []serviceSeedDefinition{
		{
			Key:          "astro_karma",
			OwnerKey:     "master_astro",
			Title:        "Натальная карта и кармические периоды",
			Description:  "Индивидуальная консультация по джйотиш: сильные стороны, кармические узлы, текущие периоды и рекомендации по садхане.",
			Category:     models.ServiceCategoryAstrology,
			Language:     "ru",
			Formats:      `["individual"]`,
			ScheduleType: models.ServiceScheduleBooking,
			Channel:      models.ServiceChannelVideo,
			AccessType:   models.ServiceAccessPaid,
			Status:       models.ServiceStatusActive,
			Settings: map[string]interface{}{
				"slotDuration":      60,
				"breakBetween":      15,
				"maxBookingsPerDay": 5,
			},
			ViewsCount:   178,
			Rating:       4.9,
			ReviewsCount: 28,
			Tariffs: []serviceSeedTariffSpec{
				{
					Name:               "Базовая консультация",
					Price:              1800,
					MaxBonusLkmPercent: 30,
					DurationMinutes:    60,
					SessionsCount:      1,
					Includes:           []string{"Анализ карты", "Рекомендации на месяц"},
					IsDefault:          true,
					SortOrder:          1,
				},
				{
					Name:               "Глубокий разбор + план практики",
					Price:              3200,
					MaxBonusLkmPercent: 20,
					DurationMinutes:    90,
					SessionsCount:      1,
					Includes:           []string{"Полный разбор карты", "План практики на 3 месяца", "Ответы в чате 7 дней"},
					IsDefault:          false,
					SortOrder:          2,
				},
			},
			Schedules: []serviceSeedScheduleSpec{
				{DayOfWeek: 1, TimeStart: "10:00", TimeEnd: "14:00", SlotDuration: 60, BufferMinutes: 15, Timezone: "Europe/Moscow"},
				{DayOfWeek: 3, TimeStart: "17:00", TimeEnd: "21:00", SlotDuration: 60, BufferMinutes: 15, Timezone: "Europe/Moscow"},
			},
			Bookings: []serviceSeedBookingSpec{
				{Key: "b1", ClientKey: "client_anita", OffsetDays: 1, Hour: 11, Minute: 0, Status: models.BookingStatusConfirmed, ClientNote: "Хочу понять период Раху", Source: "services_demo"},
				{Key: "b2", ClientKey: "client_roman", OffsetDays: 3, Hour: 18, Minute: 0, Status: models.BookingStatusPending, ClientNote: "Интересует совместимость и работа", Source: "services_demo"},
				{Key: "b3", ClientKey: "client_lila", OffsetDays: -4, Hour: 12, Minute: 30, Status: models.BookingStatusCompleted, ClientNote: "Благодарю за рекомендации 🙏", Source: "services_demo"},
			},
		},
		{
			Key:          "psy_relations",
			OwnerKey:     "master_psy",
			Title:        "Психология отношений и границ",
			Description:  "Терапевтическая сессия 1:1 для работы с тревогой, конфликтами и выстраиванием здоровых границ в семье.",
			Category:     models.ServiceCategoryPsychology,
			Language:     "ru",
			Formats:      `["individual"]`,
			ScheduleType: models.ServiceScheduleBooking,
			Channel:      models.ServiceChannelVideo,
			AccessType:   models.ServiceAccessPaid,
			Status:       models.ServiceStatusActive,
			Settings: map[string]interface{}{
				"slotDuration":      50,
				"breakBetween":      10,
				"maxBookingsPerDay": 6,
			},
			ViewsCount:   132,
			Rating:       4.8,
			ReviewsCount: 19,
			Tariffs: []serviceSeedTariffSpec{
				{
					Name:               "Одна сессия",
					Price:              1500,
					MaxBonusLkmPercent: 25,
					DurationMinutes:    50,
					SessionsCount:      1,
					Includes:           []string{"Сессия 1:1", "Краткий post-session план"},
					IsDefault:          true,
					SortOrder:          1,
				},
				{
					Name:               "Пакет 4 сессии",
					Price:              5200,
					MaxBonusLkmPercent: 20,
					DurationMinutes:    50,
					SessionsCount:      4,
					ValidityDays:       45,
					Includes:           []string{"4 сессии 1:1", "Поддержка в чате между сессиями"},
					IsDefault:          false,
					SortOrder:          2,
				},
			},
			Schedules: []serviceSeedScheduleSpec{
				{DayOfWeek: 2, TimeStart: "09:00", TimeEnd: "13:00", SlotDuration: 50, BufferMinutes: 10, Timezone: "Europe/Moscow"},
				{DayOfWeek: 4, TimeStart: "16:00", TimeEnd: "20:00", SlotDuration: 50, BufferMinutes: 10, Timezone: "Europe/Moscow"},
			},
			Bookings: []serviceSeedBookingSpec{
				{Key: "b1", ClientKey: "client_roman", OffsetDays: 2, Hour: 10, Minute: 0, Status: models.BookingStatusConfirmed, ClientNote: "Нужна помощь с выгоранием", Source: "services_demo"},
				{Key: "b2", ClientKey: "client_lila", OffsetDays: 4, Hour: 17, Minute: 30, Status: models.BookingStatusPending, ClientNote: "Тема: отношения с близкими", Source: "services_demo"},
				{Key: "b3", ClientKey: "client_anita", OffsetDays: -2, Hour: 19, Minute: 0, Status: models.BookingStatusCancelled, ClientNote: "Перенос по семейным обстоятельствам", Source: "services_demo"},
			},
		},
		{
			Key:          "yagya_names",
			OwnerKey:     "master_yagya",
			Title:        "Ягья на гармонизацию рода",
			Description:  "Проведение ягъи по именам участников. После ритуала отправляю отчет и рекомендации по домашней практике.",
			Category:     models.ServiceCategoryYagya,
			Language:     "ru",
			Formats:      `["group","event"]`,
			ScheduleType: models.ServiceScheduleFixed,
			Channel:      models.ServiceChannelTelegram,
			ChannelLink:  "https://t.me/vedamatch_yagya_demo",
			AccessType:   models.ServiceAccessPaid,
			Status:       models.ServiceStatusActive,
			Settings: map[string]interface{}{
				"slotDuration":      120,
				"breakBetween":      30,
				"maxBookingsPerDay": 3,
			},
			ViewsCount:   204,
			Rating:       5.0,
			ReviewsCount: 34,
			Tariffs: []serviceSeedTariffSpec{
				{
					Name:               "Участие по 1 имени",
					Price:              900,
					MaxBonusLkmPercent: 40,
					DurationMinutes:    120,
					SessionsCount:      1,
					Includes:           []string{"Участие в общей ягье", "Отчет по ритуалу"},
					IsDefault:          true,
					SortOrder:          1,
				},
				{
					Name:               "Семейный пакет (до 5 имен)",
					Price:              3200,
					MaxBonusLkmPercent: 30,
					DurationMinutes:    120,
					SessionsCount:      1,
					Includes:           []string{"До 5 имен", "Персональные рекомендации", "Ответы в чате 3 дня"},
					IsDefault:          false,
					SortOrder:          2,
				},
			},
			Schedules: []serviceSeedScheduleSpec{
				{DayOfWeek: 6, TimeStart: "09:00", TimeEnd: "13:00", SlotDuration: 120, BufferMinutes: 30, MaxParticipants: 50, Timezone: "Europe/Moscow"},
			},
			Bookings: []serviceSeedBookingSpec{
				{Key: "b1", ClientKey: "client_anita", OffsetDays: 5, Hour: 10, Minute: 0, Status: models.BookingStatusConfirmed, ClientNote: "Имена: Анна, Сергей", Source: "services_demo"},
				{Key: "b2", ClientKey: "client_lila", OffsetDays: 5, Hour: 10, Minute: 0, Status: models.BookingStatusConfirmed, ClientNote: "Имена: Лила, Виктория, Михаил", Source: "services_demo"},
				{Key: "b3", ClientKey: "client_roman", OffsetDays: -7, Hour: 9, Minute: 30, Status: models.BookingStatusCompleted, ClientNote: "Благодарю за проведение", Source: "services_demo"},
			},
		},
		{
			Key:          "coach_circle",
			OwnerKey:     "master_coach",
			Title:        "Менторский круг: дисциплина и фокус",
			Description:  "Еженедельная групповая работа над целями, привычками и личной дисциплиной в мягком духовном формате.",
			Category:     models.ServiceCategoryCoaching,
			Language:     "ru",
			Formats:      `["group","subscription"]`,
			ScheduleType: models.ServiceScheduleBooking,
			Channel:      models.ServiceChannelVideo,
			AccessType:   models.ServiceAccessSubscription,
			Status:       models.ServiceStatusActive,
			Settings: map[string]interface{}{
				"slotDuration":      90,
				"breakBetween":      15,
				"maxBookingsPerDay": 2,
			},
			ViewsCount:   96,
			Rating:       4.7,
			ReviewsCount: 11,
			Tariffs: []serviceSeedTariffSpec{
				{
					Name:               "Пробный вход",
					Price:              700,
					MaxBonusLkmPercent: 50,
					DurationMinutes:    90,
					SessionsCount:      1,
					ValidityDays:       7,
					Includes:           []string{"1 групповая встреча", "Чек-лист недели"},
					IsDefault:          true,
					SortOrder:          1,
				},
				{
					Name:               "Подписка на 1 месяц",
					Price:              2600,
					MaxBonusLkmPercent: 25,
					DurationMinutes:    90,
					SessionsCount:      4,
					ValidityDays:       30,
					Includes:           []string{"4 групповые встречи", "Общий чат поддержки", "Разбор целей"},
					IsDefault:          false,
					SortOrder:          2,
				},
			},
			Schedules: []serviceSeedScheduleSpec{
				{DayOfWeek: 0, TimeStart: "19:00", TimeEnd: "21:30", SlotDuration: 90, BufferMinutes: 15, MaxParticipants: 20, Timezone: "Europe/Moscow"},
			},
			Bookings: []serviceSeedBookingSpec{
				{Key: "b1", ClientKey: "client_roman", OffsetDays: 1, Hour: 19, Minute: 0, Status: models.BookingStatusConfirmed, ClientNote: "Хочу вернуть регулярность в практике", Source: "services_demo"},
				{Key: "b2", ClientKey: "client_anita", OffsetDays: 8, Hour: 19, Minute: 0, Status: models.BookingStatusPending, ClientNote: "Интересна групповая поддержка", Source: "services_demo"},
			},
		},
	}
}

func upsertServiceSeed(def serviceSeedDefinition, owner models.User, users map[string]models.User) (string, error) {
	settingsJSON, err := json.Marshal(def.Settings)
	if err != nil {
		return "", err
	}

	var service models.Service
	findErr := DB.Where("owner_id = ? AND title = ?", owner.ID, def.Title).First(&service).Error
	operation := "updated"
	if findErr != nil {
		if !errors.Is(findErr, gorm.ErrRecordNotFound) {
			return "", findErr
		}

		service = models.Service{
			OwnerID:      owner.ID,
			IsVedaMatch:  false,
			Title:        def.Title,
			Description:  def.Description,
			Category:     def.Category,
			Language:     def.Language,
			Formats:      def.Formats,
			ScheduleType: def.ScheduleType,
			Channel:      def.Channel,
			ChannelLink:  def.ChannelLink,
			AccessType:   def.AccessType,
			Status:       def.Status,
			Settings:     string(settingsJSON),
			ViewsCount:   def.ViewsCount,
			Rating:       def.Rating,
			ReviewsCount: def.ReviewsCount,
		}
		if err := DB.Create(&service).Error; err != nil {
			return "", err
		}
		operation = "created"
	} else {
		updates := map[string]interface{}{
			"description":   def.Description,
			"category":      def.Category,
			"language":      def.Language,
			"formats":       def.Formats,
			"schedule_type": def.ScheduleType,
			"channel":       def.Channel,
			"channel_link":  def.ChannelLink,
			"access_type":   def.AccessType,
			"status":        def.Status,
			"settings":      string(settingsJSON),
			"views_count":   def.ViewsCount,
			"rating":        def.Rating,
			"reviews_count": def.ReviewsCount,
		}
		if err := DB.Model(&service).Updates(updates).Error; err != nil {
			return "", err
		}
	}

	defaultTariffID, err := upsertServiceTariffs(service.ID, def.Tariffs)
	if err != nil {
		return "", err
	}

	scheduleID, err := upsertServiceSchedules(service.ID, def.Schedules)
	if err != nil {
		return "", err
	}

	for _, booking := range def.Bookings {
		client, ok := users[booking.ClientKey]
		if !ok || client.ID == 0 {
			log.Printf("[Seed] Services: missing client '%s' for service '%s'", booking.ClientKey, def.Title)
			continue
		}
		if err := upsertServiceBooking(def.Key, service.ID, defaultTariffID, scheduleID, owner.ID, client.ID, booking); err != nil {
			log.Printf("[Seed] Services: booking '%s' failed for '%s': %v", booking.Key, def.Title, err)
		}
	}

	var bookingsCount int64
	if err := DB.Model(&models.ServiceBooking{}).
		Where("service_id = ? AND status <> ?", service.ID, models.BookingStatusCancelled).
		Count(&bookingsCount).Error; err == nil {
		_ = DB.Model(&models.Service{}).Where("id = ?", service.ID).Update("bookings_count", int(bookingsCount)).Error
	}

	return operation, nil
}

func upsertServiceTariffs(serviceID uint, tariffs []serviceSeedTariffSpec) (uint, error) {
	var defaultTariffName string
	for _, spec := range tariffs {
		includesJSON, err := json.Marshal(spec.Includes)
		if err != nil {
			return 0, err
		}

		if spec.SessionsCount <= 0 {
			spec.SessionsCount = 1
		}
		if spec.DurationMinutes <= 0 {
			spec.DurationMinutes = 60
		}

		var tariff models.ServiceTariff
		findErr := DB.Where("service_id = ? AND name = ?", serviceID, spec.Name).First(&tariff).Error
		if findErr != nil {
			if !errors.Is(findErr, gorm.ErrRecordNotFound) {
				return 0, findErr
			}

			tariff = models.ServiceTariff{
				ServiceID:          serviceID,
				Name:               spec.Name,
				Price:              spec.Price,
				Currency:           "LKM",
				MaxBonusLkmPercent: spec.MaxBonusLkmPercent,
				DurationMinutes:    spec.DurationMinutes,
				SessionsCount:      spec.SessionsCount,
				ValidityDays:       spec.ValidityDays,
				Includes:           string(includesJSON),
				IsDefault:          spec.IsDefault,
				IsActive:           true,
				SortOrder:          spec.SortOrder,
			}
			if err := DB.Create(&tariff).Error; err != nil {
				return 0, err
			}
		} else {
			updates := map[string]interface{}{
				"price":                 spec.Price,
				"currency":              "LKM",
				"max_bonus_lkm_percent": spec.MaxBonusLkmPercent,
				"duration_minutes":      spec.DurationMinutes,
				"sessions_count":        spec.SessionsCount,
				"validity_days":         spec.ValidityDays,
				"includes":              string(includesJSON),
				"is_active":             true,
				"sort_order":            spec.SortOrder,
			}
			if err := DB.Model(&tariff).Updates(updates).Error; err != nil {
				return 0, err
			}
		}

		if spec.IsDefault {
			defaultTariffName = spec.Name
		}
	}

	if defaultTariffName != "" {
		if err := DB.Model(&models.ServiceTariff{}).
			Where("service_id = ?", serviceID).
			Update("is_default", false).Error; err != nil {
			return 0, err
		}
		if err := DB.Model(&models.ServiceTariff{}).
			Where("service_id = ? AND name = ?", serviceID, defaultTariffName).
			Update("is_default", true).Error; err != nil {
			return 0, err
		}
	}

	var defaultTariff models.ServiceTariff
	if err := DB.Where("service_id = ? AND is_active = ?", serviceID, true).
		Order("is_default DESC").
		Order("sort_order ASC").
		Order("price ASC").
		First(&defaultTariff).Error; err != nil {
		return 0, err
	}

	return defaultTariff.ID, nil
}

func upsertServiceSchedules(serviceID uint, schedules []serviceSeedScheduleSpec) (*uint, error) {
	var firstScheduleID *uint
	for _, spec := range schedules {
		day := spec.DayOfWeek
		var schedule models.ServiceSchedule
		findErr := DB.Where(
			"service_id = ? AND day_of_week = ? AND specific_date IS NULL AND time_start = ? AND time_end = ?",
			serviceID,
			day,
			spec.TimeStart,
			spec.TimeEnd,
		).First(&schedule).Error

		if spec.SlotDuration <= 0 {
			spec.SlotDuration = 60
		}
		if spec.MaxParticipants <= 0 {
			spec.MaxParticipants = 1
		}
		if strings.TrimSpace(spec.Timezone) == "" {
			spec.Timezone = "Europe/Moscow"
		}

		if findErr != nil {
			if !errors.Is(findErr, gorm.ErrRecordNotFound) {
				return nil, findErr
			}

			schedule = models.ServiceSchedule{
				ServiceID:       serviceID,
				DayOfWeek:       &day,
				TimeStart:       spec.TimeStart,
				TimeEnd:         spec.TimeEnd,
				MaxParticipants: spec.MaxParticipants,
				SlotDuration:    spec.SlotDuration,
				BufferMinutes:   spec.BufferMinutes,
				IsActive:        true,
				Timezone:        spec.Timezone,
			}
			if err := DB.Create(&schedule).Error; err != nil {
				return nil, err
			}
		} else {
			updates := map[string]interface{}{
				"max_participants": spec.MaxParticipants,
				"slot_duration":    spec.SlotDuration,
				"buffer_minutes":   spec.BufferMinutes,
				"is_active":        true,
				"timezone":         spec.Timezone,
			}
			if err := DB.Model(&schedule).Updates(updates).Error; err != nil {
				return nil, err
			}
		}

		if firstScheduleID == nil {
			firstScheduleID = &schedule.ID
		}
	}

	return firstScheduleID, nil
}

func upsertServiceBooking(
	serviceKey string,
	serviceID uint,
	tariffID uint,
	scheduleID *uint,
	ownerID uint,
	clientID uint,
	spec serviceSeedBookingSpec,
) error {
	now := time.Now().UTC()
	scheduledAt := time.Date(
		now.Year(),
		now.Month(),
		now.Day(),
		spec.Hour,
		spec.Minute,
		0,
		0,
		time.UTC,
	).AddDate(0, 0, spec.OffsetDays)

	duration := spec.Duration
	if duration <= 0 {
		var tariff models.ServiceTariff
		if err := DB.First(&tariff, tariffID).Error; err == nil && tariff.DurationMinutes > 0 {
			duration = tariff.DurationMinutes
		}
	}
	if duration <= 0 {
		duration = 60
	}
	endAt := scheduledAt.Add(time.Duration(duration) * time.Minute)

	marker := fmt.Sprintf("[seed:service:%s:%s]", serviceKey, spec.Key)
	pricePaid := 0
	regularLkmHeld := 0
	bonusLkmHeld := 0

	var tariff models.ServiceTariff
	if err := DB.First(&tariff, tariffID).Error; err == nil {
		pricePaid = tariff.Price
	}
	if spec.Status == models.BookingStatusPending || spec.Status == models.BookingStatusConfirmed {
		regularLkmHeld = pricePaid
	}

	var confirmedAt *time.Time
	var cancelledAt *time.Time
	var completedAt *time.Time
	var cancelledBy *uint

	switch spec.Status {
	case models.BookingStatusConfirmed:
		t := scheduledAt.Add(-12 * time.Hour)
		if t.After(now) {
			t = now
		}
		confirmedAt = &t
	case models.BookingStatusCompleted:
		tConfirmed := scheduledAt.Add(-24 * time.Hour)
		confirmedAt = &tConfirmed
		tCompleted := endAt
		completedAt = &tCompleted
	case models.BookingStatusCancelled:
		tCancelled := now
		cancelledAt = &tCancelled
		cancelledBy = &ownerID
	}

	if strings.TrimSpace(spec.Source) == "" {
		spec.Source = "services_demo"
	}

	payload := map[string]interface{}{
		"service_id":        serviceID,
		"tariff_id":         tariffID,
		"client_id":         clientID,
		"schedule_id":       scheduleID,
		"scheduled_at":      scheduledAt,
		"duration_minutes":  duration,
		"end_at":            endAt,
		"status":            spec.Status,
		"price_paid":        pricePaid,
		"regular_lkm_held":  regularLkmHeld,
		"bonus_lkm_held":    bonusLkmHeld,
		"client_note":       spec.ClientNote,
		"provider_note":     marker,
		"source":            spec.Source,
		"source_post_id":    spec.SourcePostID,
		"source_channel_id": spec.SourceChannel,
		"confirmed_at":      confirmedAt,
		"cancelled_at":      cancelledAt,
		"completed_at":      completedAt,
		"cancelled_by":      cancelledBy,
		"meeting_link":      "",
		"reminder_sent":     false,
		"reminder_24h_sent": false,
	}

	var existing models.ServiceBooking
	err := DB.Where("service_id = ? AND provider_note = ?", serviceID, marker).First(&existing).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		booking := models.ServiceBooking{
			ServiceID:       serviceID,
			TariffID:        tariffID,
			ClientID:        clientID,
			ScheduleID:      scheduleID,
			ScheduledAt:     scheduledAt,
			DurationMinutes: duration,
			EndAt:           endAt,
			Status:          spec.Status,
			PricePaid:       pricePaid,
			RegularLkmHeld:  regularLkmHeld,
			BonusLkmHeld:    bonusLkmHeld,
			ClientNote:      spec.ClientNote,
			ProviderNote:    marker,
			Source:          spec.Source,
			SourcePostID:    spec.SourcePostID,
			SourceChannelID: spec.SourceChannel,
			ConfirmedAt:     confirmedAt,
			CancelledAt:     cancelledAt,
			CompletedAt:     completedAt,
			CancelledBy:     cancelledBy,
		}
		return DB.Create(&booking).Error
	}

	return DB.Model(&existing).Updates(payload).Error
}
