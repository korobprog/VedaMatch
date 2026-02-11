package handlers

import "rag-agent-server/internal/models"

type ServiceHint struct {
	ServiceID string   `json:"serviceId"`
	Title     string   `json:"title"`
	Filters   []string `json:"filters,omitempty"`
}

type MathFilter struct {
	MathID   string   `json:"mathId"`
	MathName string   `json:"mathName"`
	Filters  []string `json:"filters"`
}

type PortalBlueprint struct {
	Role           string        `json:"role"`
	Title          string        `json:"title"`
	Description    string        `json:"description"`
	HighlightColor string        `json:"highlightColor"`
	QuickAccess    []string      `json:"quickAccess"`
	HeroServices   []string      `json:"heroServices"`
	ServicesHint   []ServiceHint `json:"servicesHint"`
	MathFilters    []MathFilter  `json:"mathFilters,omitempty"`
}

var defaultMathFilters = []MathFilter{
	{MathID: "gauranga", MathName: "Gauranga Math", Filters: []string{"prasadam", "family_events", "kirtan"}},
	{MathID: "vrindavan", MathName: "Vrindavan Math", Filters: []string{"pilgrimage", "lectures", "charity"}},
	{MathID: "mayapur", MathName: "Mayapur Math", Filters: []string{"festivals", "education", "seva"}},
	{MathID: "iskcon-global", MathName: "ISKCON Global", Filters: []string{"global_news", "shops", "travel"}},
}

var portalBlueprints = map[string]PortalBlueprint{
	models.RoleUser: {
		Role:           models.RoleUser,
		Title:          "Искатель",
		Description:    "Базовый портрет для повседневной духовной практики.",
		HighlightColor: "#6B7280",
		QuickAccess:    []string{"path_tracker", "chat", "multimedia"},
		HeroServices:   []string{"path_tracker", "multimedia", "news", "library"},
		ServicesHint: []ServiceHint{
			{ServiceID: "path_tracker", Title: "Путь дня", Filters: []string{"daily_step", "gentle_onboarding"}},
			{ServiceID: "multimedia", Title: "Медия", Filters: []string{"kirtan", "lectures"}},
			{ServiceID: "news", Title: "Новости", Filters: []string{"community", "daily_digest"}},
			{ServiceID: "library", Title: "Библиотека", Filters: []string{"beginner_path", "daily_reading"}},
			{ServiceID: "education", Title: "Обучение", Filters: []string{"foundations"}},
		},
	},
	models.RoleInGoodness: {
		Role:           models.RoleInGoodness,
		Title:          "В благости",
		Description:    "Фокус на благостный лайфстайл, саттвичное окружение и практику.",
		HighlightColor: "#22C55E",
		QuickAccess:    []string{"path_tracker", "education", "news"},
		HeroServices:   []string{"path_tracker", "cafe", "education", "services"},
		ServicesHint: []ServiceHint{
			{ServiceID: "path_tracker", Title: "Путь дня", Filters: []string{"routine", "stability"}},
			{ServiceID: "cafe", Title: "Кафе", Filters: []string{"sattvic_menu", "prasadam_only"}},
			{ServiceID: "education", Title: "Обучение", Filters: []string{"habit_programs", "sadhana"}},
			{ServiceID: "services", Title: "Услуги", Filters: []string{"wellness", "mentoring"}},
		},
	},
	models.RoleYogi: {
		Role:           models.RoleYogi,
		Title:          "Йог",
		Description:    "Практики йоги, путешествия, образовательные и офлайн-форматы.",
		HighlightColor: "#0EA5E9",
		QuickAccess:    []string{"path_tracker", "travel", "education"},
		HeroServices:   []string{"path_tracker", "services", "travel", "multimedia"},
		ServicesHint: []ServiceHint{
			{ServiceID: "path_tracker", Title: "Путь дня", Filters: []string{"technique", "progress"}},
			{ServiceID: "services", Title: "Услуги", Filters: []string{"asana", "breathwork", "retreats"}},
			{ServiceID: "travel", Title: "Yatra", Filters: []string{"pilgrimage_routes", "retreat_housing"}},
			{ServiceID: "multimedia", Title: "Медия", Filters: []string{"kirtan", "lectures"}},
		},
	},
	models.RoleDevotee: {
		Role:           models.RoleDevotee,
		Title:          "Преданный",
		Description:    "Максимальный духовный профиль с акцентом на севу, ятры и общину.",
		HighlightColor: "#F97316",
		QuickAccess:    []string{"path_tracker", "seva", "news"},
		HeroServices:   []string{"path_tracker", "seva", "travel", "news"},
		ServicesHint: []ServiceHint{
			{ServiceID: "path_tracker", Title: "Путь дня", Filters: []string{"service_focus", "community"}},
			{ServiceID: "seva", Title: "Сева", Filters: []string{"projects", "donation_flow"}},
			{ServiceID: "charity", Title: "Благотворительность", Filters: []string{"verified_orgs", "math_projects"}},
			{ServiceID: "travel", Title: "Yatra", Filters: []string{"holy_places", "group_tours"}},
			{ServiceID: "news", Title: "Новости", Filters: []string{"temple_updates", "festival_reports"}},
		},
	},
}

func GetPortalBlueprintForRole(role string) PortalBlueprint {
	if bp, ok := portalBlueprints[role]; ok {
		bp.MathFilters = defaultMathFilters
		return bp
	}
	fallback := portalBlueprints[models.RoleUser]
	fallback.MathFilters = defaultMathFilters
	return fallback
}

func GetAllGodModeMathFilters() []MathFilter {
	return defaultMathFilters
}
