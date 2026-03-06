package services

import (
	"errors"
	"fmt"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"
)

var (
	ErrConnectInvalidPayload     = errors.New("invalid connect payload")
	ErrConnectOpportunityMissing = errors.New("connect opportunity not found")
	ErrConnectCommunityMissing   = errors.New("connect community not found")
	ErrConnectUnauthorized       = errors.New("unauthorized")
)

type ConnectService struct {
	db *gorm.DB
}

func NewConnectService() *ConnectService {
	return &ConnectService{db: database.DB}
}

func NewConnectServiceWithDB(db *gorm.DB) *ConnectService {
	return &ConnectService{db: db}
}

func (s *ConnectService) GetFeed(userID uint, req models.ConnectFeedRequest) (*models.ConnectFeedResponse, error) {
	if s.db == nil {
		return nil, errors.New("database is not initialized")
	}

	profile, _ := s.GetProfile(userID)
	effective := s.mergeFeedRequestWithProfile(req, profile)

	var opportunities []models.ConnectOpportunityCard

	native, err := s.listNativeOpportunities(effective, profile)
	if err != nil {
		return nil, err
	}
	opportunities = append(opportunities, native...)

	yatraItems, err := s.listYatraOpportunities(effective, profile)
	if err != nil {
		return nil, err
	}
	opportunities = append(opportunities, yatraItems...)

	sevaItems, err := s.listSevaOpportunities(effective, profile)
	if err != nil {
		return nil, err
	}
	opportunities = append(opportunities, sevaItems...)

	serviceItems, err := s.listServiceOpportunities(effective, profile)
	if err != nil {
		return nil, err
	}
	opportunities = append(opportunities, serviceItems...)

	sort.SliceStable(opportunities, func(i, j int) bool {
		if opportunities[i].Score == opportunities[j].Score {
			left := ""
			right := ""
			if opportunities[i].StartsAt != nil {
				left = opportunities[i].StartsAt.Format(time.RFC3339)
			}
			if opportunities[j].StartsAt != nil {
				right = opportunities[j].StartsAt.Format(time.RFC3339)
			}
			return left < right
		}
		return opportunities[i].Score > opportunities[j].Score
	})

	limit := effective.Limit
	if limit <= 0 {
		limit = 12
	}
	if len(opportunities) > limit {
		opportunities = opportunities[:limit]
	}

	communities := s.collectCommunities(opportunities)
	return &models.ConnectFeedResponse{
		Opportunities: opportunities,
		Communities:   communities,
		Profile:       profile,
	}, nil
}

func (s *ConnectService) GetProfile(userID uint) (*models.ConnectMatchProfile, error) {
	if userID == 0 {
		return nil, ErrConnectUnauthorized
	}
	var profile models.ConnectMatchProfile
	if err := s.db.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			var user models.User
			if err := s.db.Select("city", "timezone", "interests").Where("id = ?", userID).First(&user).Error; err == nil {
				return &models.ConnectMatchProfile{
					UserID:         userID,
					City:           strings.TrimSpace(user.City),
					RadiusKm:       15,
					Interests:      splitCSV(user.Interests),
					OnboardingMode: models.ConnectOnboardingMeetPeople,
				}, nil
			}
			return nil, nil
		}
		return nil, err
	}
	return &profile, nil
}

func (s *ConnectService) UpsertProfile(userID uint, req models.ConnectMatchProfileUpsertRequest) (*models.ConnectMatchProfile, error) {
	if userID == 0 {
		return nil, ErrConnectUnauthorized
	}
	if strings.TrimSpace(string(req.OnboardingMode)) == "" {
		req.OnboardingMode = models.ConnectOnboardingMeetPeople
	}
	profile := models.ConnectMatchProfile{
		UserID:                userID,
		City:                  strings.TrimSpace(req.City),
		District:              strings.TrimSpace(req.District),
		RadiusKm:              clampConnectRadius(req.RadiusKm),
		Interests:             normalizeStringList(req.Interests),
		PreferredEntryLevels:  normalizeStringList(req.PreferredEntryLevels),
		ParticipationFormats:  normalizeStringList(req.ParticipationFormats),
		ParticipationModes:    normalizeStringList(req.ParticipationModes),
		AvailableTimeLabels:   normalizeStringList(req.AvailableTimeLabels),
		HasTransport:          req.HasTransport,
		QuietServicePreferred: req.QuietServicePreferred,
		NeedsMentor:           req.NeedsMentor,
		WantsCompany:          req.WantsCompany,
		OnboardingMode:        req.OnboardingMode,
	}
	if err := s.db.Where("user_id = ?", userID).Assign(profile).FirstOrCreate(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (s *ConnectService) CreateOpportunity(userID uint, req models.ConnectOpportunityCreateRequest) (*models.ConnectOpportunity, error) {
	if userID == 0 {
		return nil, ErrConnectUnauthorized
	}
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Category) == "" {
		return nil, ErrConnectInvalidPayload
	}
	opportunity := models.ConnectOpportunity{
		CommunityID:         req.CommunityID,
		CreatedByUserID:     userID,
		Title:               strings.TrimSpace(req.Title),
		Description:         strings.TrimSpace(req.Description),
		City:                strings.TrimSpace(req.City),
		District:            strings.TrimSpace(req.District),
		LocationLabel:       strings.TrimSpace(req.LocationLabel),
		Category:            strings.TrimSpace(req.Category),
		Interests:           normalizeStringList(req.Interests),
		EntryLevel:          req.EntryLevel,
		ParticipationFormat: req.ParticipationFormat,
		ParticipationModes:  normalizeStringList(req.ParticipationModes),
		RequiresApproval:    req.RequiresApproval,
		NewcomerFriendly:    req.NewcomerFriendly,
		MentorAvailable:     req.MentorAvailable,
		NeedsTransport:      req.NeedsTransport,
		IsRecurring:         req.IsRecurring,
		StartsAt:            req.StartsAt,
		EndsAt:              req.EndsAt,
		Status:              models.ConnectOpportunityStatusModeration,
		SourceType:          models.ConnectSourceNative,
	}
	if opportunity.EntryLevel == "" || opportunity.ParticipationFormat == "" {
		return nil, ErrConnectInvalidPayload
	}
	if err := s.db.Create(&opportunity).Error; err != nil {
		return nil, err
	}
	return &opportunity, nil
}

func (s *ConnectService) Apply(userID, opportunityID uint, req models.ConnectApplyRequest) (*models.ConnectApplication, error) {
	if userID == 0 {
		return nil, ErrConnectUnauthorized
	}
	var opportunity models.ConnectOpportunity
	if err := s.db.First(&opportunity, opportunityID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrConnectOpportunityMissing
		}
		return nil, err
	}

	application := models.ConnectApplication{
		OpportunityID: opportunityID,
		UserID:        userID,
		Status:        models.ConnectApplicationPending,
		Message:       strings.TrimSpace(req.Message),
	}
	if err := s.db.Where("opportunity_id = ? AND user_id = ?", opportunityID, userID).
		Assign(application).
		FirstOrCreate(&application).Error; err != nil {
		return nil, err
	}
	return &application, nil
}

func (s *ConnectService) GetOpportunity(userID, opportunityID uint) (*models.ConnectOpportunityDetailResponse, error) {
	feed, err := s.GetFeed(userID, models.ConnectFeedRequest{Limit: 100})
	if err != nil {
		return nil, err
	}
	for _, item := range feed.Opportunities {
		if item.ID == opportunityID {
			return &models.ConnectOpportunityDetailResponse{Opportunity: item}, nil
		}
	}
	return nil, ErrConnectOpportunityMissing
}

func (s *ConnectService) GetCommunity(userID, communityID uint) (*models.ConnectCommunityDetailResponse, error) {
	feed, err := s.GetFeed(userID, models.ConnectFeedRequest{Limit: 100})
	if err != nil {
		return nil, err
	}
	for _, community := range feed.Communities {
		if community.ID != communityID {
			continue
		}
		var items []models.ConnectOpportunityCard
		for _, item := range feed.Opportunities {
			if item.Community != nil && item.Community.ID == communityID {
				items = append(items, item)
			}
		}
		return &models.ConnectCommunityDetailResponse{Community: community, Opportunities: items}, nil
	}
	return nil, ErrConnectCommunityMissing
}

func (s *ConnectService) mergeFeedRequestWithProfile(req models.ConnectFeedRequest, profile *models.ConnectMatchProfile) models.ConnectFeedRequest {
	effective := req
	if profile == nil {
		if effective.Limit <= 0 {
			effective.Limit = 12
		}
		return effective
	}
	if strings.TrimSpace(effective.City) == "" {
		effective.City = profile.City
	}
	if strings.TrimSpace(effective.District) == "" {
		effective.District = profile.District
	}
	if effective.Limit <= 0 {
		effective.Limit = 12
	}
	return effective
}

func (s *ConnectService) listNativeOpportunities(req models.ConnectFeedRequest, profile *models.ConnectMatchProfile) ([]models.ConnectOpportunityCard, error) {
	var rows []models.ConnectOpportunity
	query := s.db.Preload("Community").Where("status = ?", models.ConnectOpportunityStatusActive)
	if city := strings.TrimSpace(req.City); city != "" {
		query = query.Where("LOWER(city) = LOWER(?)", city)
	}
	if category := strings.TrimSpace(req.Category); category != "" {
		query = query.Where("LOWER(category) = LOWER(?)", category)
	}
	if entryLevel := strings.TrimSpace(req.EntryLevel); entryLevel != "" {
		query = query.Where("entry_level = ?", entryLevel)
	}
	if req.NewcomerOnly {
		query = query.Where("newcomer_friendly = ?", true)
	}
	if format := strings.TrimSpace(req.ParticipationFormat); format != "" {
		query = query.Where("participation_format = ?", format)
	}
	if err := query.Order("starts_at asc nulls last, created_at desc").Find(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]models.ConnectOpportunityCard, 0, len(rows))
	for _, row := range rows {
		items = append(items, s.makeNativeOpportunityCard(row, profile))
	}
	return items, nil
}

func (s *ConnectService) listYatraOpportunities(req models.ConnectFeedRequest, profile *models.ConnectMatchProfile) ([]models.ConnectOpportunityCard, error) {
	var rows []models.Yatra
	query := s.db.Where("status IN ?", []models.YatraStatus{models.YatraStatusOpen, models.YatraStatusActive})
	if city := strings.TrimSpace(req.City); city != "" {
		query = query.Where("LOWER(start_city) = LOWER(?)", city)
	}
	if err := query.Order("start_date asc").Limit(20).Find(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]models.ConnectOpportunityCard, 0, len(rows))
	for _, row := range rows {
		card := s.makeYatraOpportunityCard(row, profile)
		if req.NewcomerOnly && !card.NewcomerFriendly {
			continue
		}
		if req.Category != "" && !strings.EqualFold(req.Category, card.Category) {
			continue
		}
		if req.EntryLevel != "" && string(card.EntryLevel) != req.EntryLevel {
			continue
		}
		if req.ParticipationFormat != "" && string(card.ParticipationFormat) != req.ParticipationFormat {
			continue
		}
		items = append(items, card)
	}
	return items, nil
}

func (s *ConnectService) listSevaOpportunities(req models.ConnectFeedRequest, profile *models.ConnectMatchProfile) ([]models.ConnectOpportunityCard, error) {
	var rows []models.CharityProject
	query := s.db.Preload("Organization").Where("charity_projects.status = ?", models.ProjectStatusActive)
	if city := strings.TrimSpace(req.City); city != "" {
		query = query.Joins("LEFT JOIN charity_organizations ON charity_organizations.id = charity_projects.organization_id").
			Where("LOWER(charity_organizations.city) = LOWER(?)", city)
	}
	if err := query.Order("charity_projects.is_urgent desc, charity_projects.updated_at desc").Limit(20).Find(&rows).Error; err != nil {
		return nil, err
	}

	items := make([]models.ConnectOpportunityCard, 0, len(rows))
	for _, row := range rows {
		card := s.makeSevaOpportunityCard(row, profile)
		if req.NewcomerOnly && !card.NewcomerFriendly {
			continue
		}
		if req.Category != "" && !strings.EqualFold(req.Category, card.Category) {
			continue
		}
		items = append(items, card)
	}
	return items, nil
}

func (s *ConnectService) listServiceOpportunities(req models.ConnectFeedRequest, profile *models.ConnectMatchProfile) ([]models.ConnectOpportunityCard, error) {
	var rows []models.Service
	query := s.db.Where("status = ?", models.ServiceStatusActive)
	if city := strings.TrimSpace(req.City); city != "" {
		query = query.Where("channel <> ? AND LOWER(offline_address) LIKE LOWER(?)", models.ServiceChannelOffline, "%"+city+"%")
	}
	if err := query.Order("updated_at desc").Limit(20).Find(&rows).Error; err != nil {
		return nil, err
	}
	items := make([]models.ConnectOpportunityCard, 0, len(rows))
	for _, row := range rows {
		card := s.makeServiceOpportunityCard(row, profile)
		if req.NewcomerOnly && !card.NewcomerFriendly {
			continue
		}
		if req.Category != "" && !strings.EqualFold(req.Category, card.Category) {
			continue
		}
		items = append(items, card)
	}
	return items, nil
}

func (s *ConnectService) makeNativeOpportunityCard(op models.ConnectOpportunity, profile *models.ConnectMatchProfile) models.ConnectOpportunityCard {
	var community *models.ConnectCommunityCard
	if op.Community != nil {
		card := s.makeCommunityCard(*op.Community, nil)
		community = &card
	}
	score, why := scoreConnectOpportunity(
		op.City,
		op.Interests,
		string(op.EntryLevel),
		string(op.ParticipationFormat),
		op.ParticipationModes,
		op.NewcomerFriendly,
		op.MentorAvailable,
		profile,
	)
	return models.ConnectOpportunityCard{
		ID:                  op.ID,
		Title:               op.Title,
		Description:         op.Description,
		City:                op.City,
		District:            op.District,
		LocationLabel:       op.LocationLabel,
		Category:            op.Category,
		EntryLevel:          op.EntryLevel,
		ParticipationFormat: op.ParticipationFormat,
		ParticipationModes:  normalizeStringList(op.ParticipationModes),
		NewcomerFriendly:    op.NewcomerFriendly,
		MentorAvailable:     op.MentorAvailable,
		RequiresApproval:    op.RequiresApproval,
		NeedsTransport:      op.NeedsTransport,
		IsRecurring:         op.IsRecurring,
		Status:              op.Status,
		StartsAt:            op.StartsAt,
		EndsAt:              op.EndsAt,
		Score:               score,
		Why:                 why,
		Community:           community,
	}
}

func (s *ConnectService) makeYatraOpportunityCard(row models.Yatra, profile *models.ConnectMatchProfile) models.ConnectOpportunityCard {
	community := models.ConnectCommunityCard{
		ID:                 connectExternalID(models.ConnectSourceYatra, row.ID),
		Name:               row.Title,
		Description:        row.Description,
		City:               row.StartCity,
		CommunityType:      models.ConnectCommunityTypeYatra,
		VerificationStatus: models.ConnectVerificationVerified,
		NewcomerFriendly:   true,
		MentorAvailable:    true,
		SourceLink: &models.ConnectSourceLink{
			Type:   models.ConnectSourceYatra,
			ID:     row.ID,
			Screen: "YatraDetail",
			Label:  "Yatra",
		},
	}
	interests := []string{string(row.Theme), "pilgrimage", "travel"}
	score, why := scoreConnectOpportunity(
		row.StartCity,
		interests,
		string(models.ConnectEntryLevelTeamBased),
		string(models.ConnectParticipationOffline),
		[]string{string(models.ConnectParticipationModeSocial), string(models.ConnectParticipationModePhysical)},
		true,
		true,
		profile,
	)
	why = append(why, "Existing Yatra group with a clear organizer")
	return models.ConnectOpportunityCard{
		ID:                  connectExternalID(models.ConnectSourceYatra, row.ID),
		Title:               row.Title,
		Description:         row.Description,
		City:                row.StartCity,
		LocationLabel:       connectFirstNonEmpty(row.StartAddress, row.StartCity),
		Category:            "yatra",
		EntryLevel:          models.ConnectEntryLevelTeamBased,
		ParticipationFormat: models.ConnectParticipationOffline,
		ParticipationModes:  []string{string(models.ConnectParticipationModeSocial), string(models.ConnectParticipationModePhysical)},
		NewcomerFriendly:    true,
		MentorAvailable:     true,
		RequiresApproval:    true,
		Status:              models.ConnectOpportunityStatusActive,
		StartsAt:            &row.StartDate,
		EndsAt:              &row.EndDate,
		Score:               score,
		Why:                 connectUniqueStrings(why),
		Community:           &community,
		SourceLink:          community.SourceLink,
	}
}

func (s *ConnectService) makeSevaOpportunityCard(row models.CharityProject, profile *models.ConnectMatchProfile) models.ConnectOpportunityCard {
	city := ""
	communityName := "Seva"
	if row.Organization != nil {
		city = row.Organization.City
		communityName = row.Organization.Name
	}
	community := models.ConnectCommunityCard{
		ID:                 connectExternalID(models.ConnectSourceSeva, row.OrganizationID),
		Name:               communityName,
		Description:        row.ShortDesc,
		City:               city,
		CommunityType:      models.ConnectCommunityTypeOrganization,
		VerificationStatus: models.ConnectVerificationVerified,
		NewcomerFriendly:   true,
		MentorAvailable:    false,
		SourceLink: &models.ConnectSourceLink{
			Type:   models.ConnectSourceSeva,
			ID:     row.ID,
			Screen: "SevaProjectDetails",
			Label:  "Seva",
		},
	}
	interests := []string{row.Category, "service", "charity"}
	score, why := scoreConnectOpportunity(
		city,
		interests,
		string(models.ConnectEntryLevelIntro),
		string(models.ConnectParticipationOffline),
		[]string{string(models.ConnectParticipationModeQuiet), string(models.ConnectParticipationModeOrganize)},
		true,
		false,
		profile,
	)
	why = append(why, "Clear practical service with transparent impact")
	return models.ConnectOpportunityCard{
		ID:                  connectExternalID(models.ConnectSourceSeva, row.ID),
		Title:               row.Title,
		Description:         connectFirstNonEmpty(row.ShortDesc, row.Description),
		City:                city,
		LocationLabel:       city,
		Category:            connectFirstNonEmpty(row.Category, "seva"),
		EntryLevel:          models.ConnectEntryLevelIntro,
		ParticipationFormat: models.ConnectParticipationOffline,
		ParticipationModes:  []string{string(models.ConnectParticipationModeQuiet), string(models.ConnectParticipationModeOrganize)},
		NewcomerFriendly:    true,
		RequiresApproval:    false,
		Status:              models.ConnectOpportunityStatusActive,
		Score:               score,
		Why:                 connectUniqueStrings(why),
		Community:           &community,
		SourceLink:          community.SourceLink,
	}
}

func (s *ConnectService) makeServiceOpportunityCard(row models.Service, profile *models.ConnectMatchProfile) models.ConnectOpportunityCard {
	city := ""
	if row.Channel == models.ServiceChannelOffline {
		city = inferCityFromAddress(row.OfflineAddress)
	}
	community := models.ConnectCommunityCard{
		ID:                 connectExternalID(models.ConnectSourceService, row.ID),
		Name:               row.Title,
		Description:        row.Description,
		City:               city,
		CommunityType:      models.ConnectCommunityTypeTeam,
		VerificationStatus: models.ConnectVerificationVerified,
		NewcomerFriendly:   row.AccessType == models.ServiceAccessFree,
		MentorAvailable:    row.Category == models.ServiceCategoryEducation || row.Category == models.ServiceCategorySpirituality,
		SourceLink: &models.ConnectSourceLink{
			Type:   models.ConnectSourceService,
			ID:     row.ID,
			Screen: "ServiceDetail",
			Label:  "Services",
		},
	}
	entryLevel := models.ConnectEntryLevelOneTime
	if row.ScheduleType == models.ServiceScheduleAnytime {
		entryLevel = models.ConnectEntryLevelIntro
	}
	participationFormat := models.ConnectParticipationOffline
	if row.Channel != models.ServiceChannelOffline {
		participationFormat = models.ConnectParticipationOnline
	}
	modes := []string{string(models.ConnectParticipationModeIntellect)}
	if row.Category == models.ServiceCategoryEducation || row.Category == models.ServiceCategorySpirituality {
		modes = append(modes, string(models.ConnectParticipationModeSocial))
	}
	score, why := scoreConnectOpportunity(
		city,
		[]string{string(row.Category), string(row.Channel), "service"},
		string(entryLevel),
		string(participationFormat),
		modes,
		community.NewcomerFriendly,
		community.MentorAvailable,
		profile,
	)
	why = append(why, "Existing service flow already has schedule and details")
	return models.ConnectOpportunityCard{
		ID:                  connectExternalID(models.ConnectSourceService, row.ID),
		Title:               row.Title,
		Description:         row.Description,
		City:                city,
		LocationLabel:       connectFirstNonEmpty(row.OfflineAddress, string(row.Channel)),
		Category:            string(row.Category),
		EntryLevel:          entryLevel,
		ParticipationFormat: participationFormat,
		ParticipationModes:  connectUniqueStrings(modes),
		NewcomerFriendly:    community.NewcomerFriendly,
		MentorAvailable:     community.MentorAvailable,
		RequiresApproval:    row.AccessType == models.ServiceAccessInvite,
		Status:              models.ConnectOpportunityStatusActive,
		Score:               score,
		Why:                 connectUniqueStrings(why),
		Community:           &community,
		SourceLink:          community.SourceLink,
	}
}

func (s *ConnectService) makeCommunityCard(row models.ConnectCommunity, sourceLink *models.ConnectSourceLink) models.ConnectCommunityCard {
	return models.ConnectCommunityCard{
		ID:                 row.ID,
		Name:               row.Name,
		Description:        row.Description,
		City:               row.City,
		District:           row.District,
		CommunityType:      row.CommunityType,
		VerificationStatus: row.VerificationStatus,
		NewcomerFriendly:   row.NewcomerFriendly,
		MentorAvailable:    row.MentorAvailable,
		CoverImageURL:      row.CoverImageURL,
		Tags:               normalizeStringList(row.Tags),
		SourceLink:         sourceLink,
	}
}

func (s *ConnectService) collectCommunities(opportunities []models.ConnectOpportunityCard) []models.ConnectCommunityCard {
	result := make([]models.ConnectCommunityCard, 0)
	seen := make(map[uint]struct{})
	for _, item := range opportunities {
		if item.Community == nil {
			continue
		}
		if _, ok := seen[item.Community.ID]; ok {
			continue
		}
		seen[item.Community.ID] = struct{}{}
		result = append(result, *item.Community)
	}
	return result
}

func scoreConnectOpportunity(city string, interests []string, entryLevel string, format string, modes []string, newcomerFriendly bool, mentorAvailable bool, profile *models.ConnectMatchProfile) (int, []string) {
	score := 20
	why := make([]string, 0, 6)
	if profile == nil {
		return score, why
	}

	if strings.TrimSpace(profile.City) != "" && strings.EqualFold(strings.TrimSpace(profile.City), strings.TrimSpace(city)) {
		score += 25
		why = append(why, "Same city")
	}

	if sharesAny(profile.Interests, interests) {
		score += 20
		why = append(why, "Matches your interests")
	}

	if sharesAny(profile.PreferredEntryLevels, []string{entryLevel}) {
		score += 15
		why = append(why, "Fits your preferred level of entry")
	}

	if sharesAny(profile.ParticipationFormats, []string{format}) {
		score += 12
		why = append(why, "Matches your preferred participation format")
	}

	if sharesAny(profile.ParticipationModes, modes) {
		score += 10
		why = append(why, "Matches your preferred service style")
	}

	if profile.NeedsMentor && mentorAvailable {
		score += 10
		why = append(why, "Mentor support is available")
	}

	if newcomerFriendly && (profile.OnboardingMode == models.ConnectOnboardingTrySimple || profile.OnboardingMode == models.ConnectOnboardingFriendlyTeam || profile.OnboardingMode == models.ConnectOnboardingNeedHelp) {
		score += 18
		why = append(why, "Friendly for a soft first step")
	}

	if profile.QuietServicePreferred && sharesAny(modes, []string{string(models.ConnectParticipationModeQuiet)}) {
		score += 8
		why = append(why, "Quiet service option")
	}

	if profile.WantsCompany && (mentorAvailable || newcomerFriendly) {
		score += 6
		why = append(why, "Good fit if you do not want to go alone")
	}

	return score, connectUniqueStrings(why)
}

func clampConnectRadius(radius int) int {
	if radius <= 0 {
		return 15
	}
	if radius > 200 {
		return 200
	}
	return radius
}

func normalizeStringList(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return normalizeStringList(strings.Split(value, ","))
}

func sharesAny(left []string, right []string) bool {
	if len(left) == 0 || len(right) == 0 {
		return false
	}
	set := make(map[string]struct{}, len(left))
	for _, item := range left {
		set[strings.ToLower(strings.TrimSpace(item))] = struct{}{}
	}
	for _, item := range right {
		if _, ok := set[strings.ToLower(strings.TrimSpace(item))]; ok {
			return true
		}
	}
	return false
}

func connectUniqueStrings(values []string) []string {
	return normalizeStringList(values)
}

func connectFirstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func inferCityFromAddress(address string) string {
	parts := strings.Split(address, ",")
	for i := len(parts) - 1; i >= 0; i-- {
		if trimmed := strings.TrimSpace(parts[i]); trimmed != "" {
			return trimmed
		}
	}
	return strings.TrimSpace(address)
}

func connectExternalID(sourceType models.ConnectSourceType, id uint) uint {
	switch sourceType {
	case models.ConnectSourceYatra:
		return 1000000 + id
	case models.ConnectSourceSeva:
		return 2000000 + id
	case models.ConnectSourceService:
		return 3000000 + id
	default:
		return id
	}
}

func ConnectSourceMeta(connectID uint) (models.ConnectSourceType, uint) {
	switch {
	case connectID >= 3000000:
		return models.ConnectSourceService, connectID - 3000000
	case connectID >= 2000000:
		return models.ConnectSourceSeva, connectID - 2000000
	case connectID >= 1000000:
		return models.ConnectSourceYatra, connectID - 1000000
	default:
		return models.ConnectSourceNative, connectID
	}
}

func (s *ConnectService) ensureExternalSourceVisible(userID uint, connectID uint) (*models.ConnectOpportunityDetailResponse, error) {
	sourceType, sourceID := ConnectSourceMeta(connectID)
	feed, err := s.GetFeed(userID, models.ConnectFeedRequest{Limit: 100})
	if err != nil {
		return nil, err
	}
	for _, item := range feed.Opportunities {
		itemType, itemID := ConnectSourceMeta(item.ID)
		if itemType == sourceType && itemID == sourceID {
			return &models.ConnectOpportunityDetailResponse{Opportunity: item}, nil
		}
	}
	return nil, fmt.Errorf("%w: %d", ErrConnectOpportunityMissing, sourceID)
}
