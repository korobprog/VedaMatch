package services

import (
	"errors"
	"fmt"
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// CharityService handles charity operations
type CharityService struct {
	WalletService *WalletService
}

// NewCharityService creates a new charity service
func NewCharityService(walletService *WalletService) *CharityService {
	return &CharityService{
		WalletService: walletService,
	}
}

// ==================== ORGANIZATION ====================

// CreateOrganization creates a new charity organization
func (s *CharityService) CreateOrganization(userID uint, req models.CreateOrganizationRequest) (*models.CharityOrganization, error) {
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)
	req.Country = strings.TrimSpace(req.Country)
	req.City = strings.TrimSpace(req.City)
	req.Website = strings.TrimSpace(req.Website)
	req.Email = strings.TrimSpace(req.Email)
	req.Phone = strings.TrimSpace(req.Phone)
	if req.Name == "" {
		return nil, errors.New("organization name is required")
	}

	// Create organization wallet
	wallet := models.CharityOrganization{
		Name:         req.Name,
		Description:  req.Description,
		Country:      req.Country,
		City:         req.City,
		Website:      req.Website,
		Email:        req.Email,
		Phone:        req.Phone,
		DocumentURLs: req.DocumentURLs,
		OwnerUserID:  userID,
		Status:       models.OrgStatusDraft,
		Slug:         generateSlug(req.Name),
	}

	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		// Create Organization first
		if err := tx.Create(&wallet).Error; err != nil {
			return err
		}

		// Create Wallet for Organization
		orgWallet := models.Wallet{
			Type:           models.WalletTypeCharity,
			OrganizationID: &wallet.ID,
			Balance:        0,
			TotalEarned:    0,
			TotalSpent:     0,
		}
		if err := tx.Create(&orgWallet).Error; err != nil {
			return err
		}

		// Update Organization with WalletID
		wallet.WalletID = &orgWallet.ID
		if err := tx.Save(&wallet).Error; err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return &wallet, nil
}

// UpdateOrganizationStatus (Admin only)
func (s *CharityService) UpdateOrganizationStatus(orgID uint, status models.OrganizationStatus, adminID uint) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status": status,
	}

	if status == models.OrgStatusVerified {
		updates["verified_at"] = &now
		updates["verified_by_user_id"] = adminID
	}

	return database.DB.Model(&models.CharityOrganization{}).Where("id = ?", orgID).Updates(updates).Error
}

// ==================== PROJECT ====================

// CreateProject creates a new fundraising campaign
func (s *CharityService) CreateProject(userID uint, req models.CreateProjectRequest) (*models.CharityProject, error) {
	// Verify user owns the organization
	var org models.CharityOrganization
	if err := database.DB.Where("id = ? AND owner_user_id = ?", req.OrganizationID, userID).First(&org).Error; err != nil {
		return nil, errors.New("organization not found or access denied")
	}

	if org.Status != models.OrgStatusVerified {
		return nil, errors.New("organization must be verified to create projects")
	}

	req.Title = strings.TrimSpace(req.Title)
	req.Description = strings.TrimSpace(req.Description)
	req.ShortDesc = strings.TrimSpace(req.ShortDesc)
	req.Category = strings.TrimSpace(req.Category)
	if req.Title == "" {
		return nil, errors.New("project title is required")
	}
	if req.GoalAmount <= 0 {
		return nil, errors.New("goal amount must be positive")
	}
	if req.MinDonation < 0 {
		return nil, errors.New("minimum donation must be non-negative")
	}

	project := models.CharityProject{
		OrganizationID:   req.OrganizationID,
		Title:            req.Title,
		Slug:             generateSlug(req.Title),
		Description:      req.Description,
		ShortDesc:        req.ShortDesc,
		Category:         req.Category,
		GoalAmount:       req.GoalAmount,
		MinDonation:      req.MinDonation,
		SuggestedAmounts: req.SuggestedAmounts,
		ImpactMetrics:    req.ImpactMetrics,
		StartDate:        req.StartDate,
		EndDate:          req.EndDate,
		Status:           models.ProjectStatusDraft, // Start as draft
	}

	if err := database.DB.Create(&project).Error; err != nil {
		return nil, err
	}

	return &project, nil
}

// UpdateProjectStatus (Admin only)
func (s *CharityService) UpdateProjectStatus(projectID uint, status models.ProjectStatus, adminID uint) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status": status,
	}

	if status == models.ProjectStatusActive {
		updates["approved_at"] = &now
		updates["approved_by"] = adminID

		// Set initial reporting deadline if not set
		var project models.CharityProject
		database.DB.First(&project, projectID)
		if project.NextReportDue == nil {
			days := project.ReportingPeriodDays
			if days <= 0 {
				days = 30
			}
			nextDue := now.AddDate(0, 0, days)
			updates["next_report_due"] = &nextDue
		}
	}

	return database.DB.Model(&models.CharityProject{}).Where("id = ?", projectID).Updates(updates).Error
}

// ==================== DONATION ====================

// Donate processes a donation transaction
func (s *CharityService) Donate(donorUserID uint, req models.DonateRequest) (*models.DonateResponse, error) {
	if s.WalletService == nil {
		return nil, errors.New("wallet service is not configured")
	}
	req.KarmaMessage = strings.TrimSpace(req.KarmaMessage)
	if req.Amount <= 0 {
		return nil, errors.New("donation amount must be positive")
	}

	var response models.DonateResponse

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Get Project and Organization
		var project models.CharityProject
		if err := tx.Preload("Organization").First(&project, req.ProjectID).Error; err != nil {
			return errors.New("project not found")
		}

		if project.Status != models.ProjectStatusActive {
			return errors.New("project is not active")
		}

		// Validate minimum donation
		if project.MinDonation > 0 && req.Amount < project.MinDonation {
			return fmt.Errorf("minimum donation is %d LKM", project.MinDonation)
		}

		// Check if project end date has passed
		if project.EndDate != nil && time.Now().After(*project.EndDate) {
			return errors.New("project fundraising period has ended")
		}

		// Check if goal already reached
		if project.GoalAmount > 0 && project.RaisedAmount >= project.GoalAmount {
			return errors.New("project has already reached its fundraising goal")
		}
		remainingToGoal := project.GoalAmount - project.RaisedAmount
		if project.GoalAmount > 0 && req.Amount > remainingToGoal {
			return fmt.Errorf("donation exceeds remaining goal amount (%d LKM)", remainingToGoal)
		}

		// Load platform settings once
		var settings models.CharitySettings
		settingsErr := tx.First(&settings).Error

		// 2. Calculate Amounts
		baseAmount := req.Amount
		tipsAmount := 0

		// Calculate tips
		if req.IncludeTips && settings.TipsEnabled {
			percent := float32(5.0)
			if req.TipsPercent > 0 {
				percent = req.TipsPercent
			} else if settings.DefaultTipsPercent > 0 {
				percent = settings.DefaultTipsPercent
			}

			tipsAmount = int(float32(baseAmount) * percent / 100.0)
		}

		// Do not charge tips if platform wallet is not configured
		if tipsAmount > 0 && (settingsErr != nil || settings.PlatformWalletID == nil) {
			tipsAmount = 0
		}

		totalAmount := baseAmount + tipsAmount

		// 3. Process Wallet Transaction
		// Debit User
		userWallet, err := s.WalletService.GetOrCreateWallet(donorUserID)
		if err != nil {
			return err
		}

		// Lock wallet row to prevent concurrent overspend
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(userWallet, userWallet.ID).Error; err != nil {
			return err
		}

		if userWallet.Balance < totalAmount {
			return errors.New("insufficient balance")
		}

		// Debit total from user
		newBalance := userWallet.Balance - totalAmount
		if err := tx.Model(userWallet).Updates(map[string]interface{}{
			"balance":     newBalance,
			"total_spent": userWallet.TotalSpent + totalAmount,
		}).Error; err != nil {
			return err
		}

		// Hold funds in Project/Org Wallet until confirmation
		var orgWallet models.Wallet
		if project.Organization.WalletID == nil {
			return errors.New("organization wallet not configured")
		}
		if err := tx.First(&orgWallet, *project.Organization.WalletID).Error; err != nil {
			return errors.New("organization wallet not found")
		}

		if err := tx.Model(&orgWallet).Updates(map[string]interface{}{
			"frozen_balance": gorm.Expr("frozen_balance + ?", baseAmount),
		}).Error; err != nil {
			return err
		}

		// Credit Platform Wallet (Tips) - settings already loaded above
		if tipsAmount > 0 && settings.PlatformWalletID != nil {
			var platformWallet models.Wallet
			if err := tx.First(&platformWallet, *settings.PlatformWalletID).Error; err != nil {
				return err
			}
			if err := tx.Model(&platformWallet).Updates(map[string]interface{}{
				"balance":      platformWallet.Balance + tipsAmount,
				"total_earned": platformWallet.TotalEarned + tipsAmount,
			}).Error; err != nil {
				return err
			}
		}

		// 4. Create Transaction Records (One main debit, splits are internal logic but we record main)
		walletTx := models.WalletTransaction{
			WalletID:        userWallet.ID,
			Type:            models.TransactionTypeDebit, // Or specialized TransactionTypeDonation
			Amount:          totalAmount,
			Description:     fmt.Sprintf("Donation to %s (%d + %d tips)", project.Title, baseAmount, tipsAmount),
			RelatedWalletID: project.Organization.WalletID,
			BalanceAfter:    newBalance,
		}
		if err := tx.Create(&walletTx).Error; err != nil {
			return err
		}

		// 5. Create Donation Record with 24h refund period
		// Calculate Impact
		var impactSnapshot []models.ImpactValue
		for _, metric := range project.ImpactMetrics {
			if metric.UnitCost > 0 {
				val := float64(baseAmount) / float64(metric.UnitCost)
				impactSnapshot = append(impactSnapshot, models.ImpactValue{
					Metric:  metric.Metric,
					Value:   val,
					LabelRu: metric.LabelRu,
					LabelEn: metric.LabelEn,
				})
			}
		}

		// Set 24-hour refund window
		refundDeadline := time.Now().Add(24 * time.Hour)

		donation := models.CharityDonation{
			DonorUserID:      donorUserID,
			ProjectID:        project.ID,
			Amount:           baseAmount,
			TipsAmount:       tipsAmount,
			TotalPaid:        totalAmount,
			TransactionID:    &walletTx.ID,
			KarmaMessage:     req.KarmaMessage,
			IsAnonymous:      req.IsAnonymous,
			WantsCertificate: req.WantsCertificate,
			ImpactSnapshot:   impactSnapshot,
			Status:           models.DonationStatusPending, // Pending for 24 hours
			CanRefundUntil:   &refundDeadline,
		}
		if err := tx.Create(&donation).Error; err != nil {
			return err
		}

		// 6. Update Project Stats
		projectUpdates := map[string]interface{}{
			"raised_amount":   gorm.Expr("raised_amount + ?", baseAmount),
			"donations_count": gorm.Expr("donations_count + ?", 1),
		}

		// Check if this is a new unique donor
		var existingDonationCount int64
		if err := tx.Model(&models.CharityDonation{}).Where(
			"project_id = ? AND donor_user_id = ? AND status != ? AND id != ?",
			project.ID, donorUserID, models.DonationStatusRefunded, donation.ID,
		).Count(&existingDonationCount).Error; err != nil {
			return err
		}
		if existingDonationCount == 0 {
			projectUpdates["unique_donors"] = gorm.Expr("unique_donors + ?", 1)
		}

		if err := tx.Model(&project).Updates(projectUpdates).Error; err != nil {
			return err
		}

		// Update Organization Stats
		if err := tx.Model(&models.CharityOrganization{}).Where("id = ?", project.OrganizationID).Updates(map[string]interface{}{
			"total_raised": gorm.Expr("total_raised + ?", baseAmount),
		}).Error; err != nil {
			return err
		}

		// 7. Karma Feed Entry
		if req.KarmaMessage != "" {
			note := models.CharityKarmaNote{
				ProjectID:    project.ID,
				AuthorUserID: donorUserID,
				NoteType:     "donor_message",
				Message:      req.KarmaMessage,
				IsVisible:    true,
				DonationID:   &donation.ID,
			}
			tx.Create(&note)
		}

		// Prepare Response
		response = models.DonateResponse{
			DonationID:     donation.ID,
			TransactionID:  walletTx.ID,
			AmountDonated:  baseAmount,
			TipsAmount:     tipsAmount,
			TotalPaid:      totalAmount,
			NewBalance:     newBalance,
			ImpactAchieved: impactSnapshot,
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	log.Printf("[Charity] Donation success: User %d -> Project %d (Amount: %d)", donorUserID, req.ProjectID, response.TotalPaid)
	return &response, nil
}

// RefundDonation processes a donation refund within the 24-hour window
func (s *CharityService) RefundDonation(userID uint, donationID uint) error {
	if s.WalletService == nil {
		return errors.New("wallet service is not configured")
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Get Donation (lock row to avoid race with confirm worker)
		var donation models.CharityDonation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Project.Organization").
			First(&donation, donationID).Error; err != nil {
			return errors.New("donation not found")
		}

		// 2. Verify ownership
		if donation.DonorUserID != userID {
			return errors.New("access denied")
		}

		// 3. Check status
		if donation.Status != models.DonationStatusPending {
			return errors.New("donation cannot be refunded (already confirmed or refunded)")
		}

		// 4. Check refund deadline
		if donation.CanRefundUntil == nil || time.Now().After(*donation.CanRefundUntil) {
			return errors.New("refund period has expired (24 hours)")
		}

		// 5. Reverse wallet transactions
		// Credit back to user
		var userWallet models.Wallet
		if err := tx.Where("user_id = ? AND type = ?", userID, models.WalletTypePersonal).First(&userWallet).Error; err != nil {
			return errors.New("user wallet not found")
		}

		if err := tx.Model(&userWallet).Updates(map[string]interface{}{
			"balance":     userWallet.Balance + donation.TotalPaid,
			"total_spent": gorm.Expr("GREATEST(total_spent - ?, 0)", donation.TotalPaid),
		}).Error; err != nil {
			return err
		}

		// Release held funds from organization wallet
		if donation.Project.Organization.WalletID == nil {
			return errors.New("organization wallet not configured")
		}
		var orgWallet models.Wallet
		if err := tx.First(&orgWallet, *donation.Project.Organization.WalletID).Error; err != nil {
			return err
		}
		if err := tx.Model(&orgWallet).Updates(map[string]interface{}{
			"frozen_balance": gorm.Expr("GREATEST(frozen_balance - ?, 0)", donation.Amount),
		}).Error; err != nil {
			return err
		}

		// Debit from platform wallet (tips)
		if donation.TipsAmount > 0 {
			var settings models.CharitySettings
			if err := tx.First(&settings).Error; err != nil {
				return err
			}
			if settings.PlatformWalletID == nil {
				return errors.New("platform wallet not configured")
			}
			var platformWallet models.Wallet
			if err := tx.First(&platformWallet, *settings.PlatformWalletID).Error; err != nil {
				return err
			}
			if err := tx.Model(&platformWallet).Updates(map[string]interface{}{
				"balance":      gorm.Expr("GREATEST(balance - ?, 0)", donation.TipsAmount),
				"total_earned": gorm.Expr("GREATEST(total_earned - ?, 0)", donation.TipsAmount),
			}).Error; err != nil {
				return err
			}
		}

		// 6. Create refund transaction record
		walletTx := models.WalletTransaction{
			WalletID:     userWallet.ID,
			Type:         models.TransactionTypeRefund,
			Amount:       donation.TotalPaid,
			Description:  fmt.Sprintf("Refund for donation to %s", donation.Project.Title),
			BalanceAfter: userWallet.Balance + donation.TotalPaid,
		}
		if err := tx.Create(&walletTx).Error; err != nil {
			return err
		}

		// 7. Update donation status
		now := time.Now()
		if err := tx.Model(&donation).Updates(map[string]interface{}{
			"status":      models.DonationStatusRefunded,
			"refunded_at": &now,
		}).Error; err != nil {
			return err
		}

		// 8. Update project stats
		// Lock project row so unique_donors recalculation is serialized per project.
		var lockedProject models.CharityProject
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Select("id").
			First(&lockedProject, donation.ProjectID).Error; err != nil {
			return err
		}

		projectRefundUpdates := map[string]interface{}{
			"raised_amount":   gorm.Expr("GREATEST(raised_amount - ?, 0)", donation.Amount),
			"donations_count": gorm.Expr("GREATEST(donations_count - 1, 0)"),
		}

		// Decrement unique donors if this was the user's last non-refunded donation
		var remainingCount int64
		if err := tx.Model(&models.CharityDonation{}).Where(
			"project_id = ? AND donor_user_id = ? AND status != ? AND id != ?",
			donation.ProjectID, donation.DonorUserID, models.DonationStatusRefunded, donation.ID,
		).Count(&remainingCount).Error; err != nil {
			return err
		}
		if remainingCount == 0 {
			projectRefundUpdates["unique_donors"] = gorm.Expr("GREATEST(unique_donors - 1, 0)")
		}

		if err := tx.Model(&models.CharityProject{}).Where("id = ?", donation.ProjectID).Updates(projectRefundUpdates).Error; err != nil {
			return err
		}

		// 9. Update organization stats
		if err := tx.Model(&models.CharityOrganization{}).Where("id = ?", donation.Project.OrganizationID).Updates(map[string]interface{}{
			"total_raised": gorm.Expr("GREATEST(total_raised - ?, 0)", donation.Amount),
		}).Error; err != nil {
			return err
		}

		log.Printf("[Charity] Refund success: Donation %d refunded to User %d (Amount: %d)", donationID, userID, donation.TotalPaid)
		return nil
	})
}

// GetUserDonations returns user's donation history
func (s *CharityService) GetUserDonations(userID uint, status string) ([]models.CharityDonation, error) {
	var donations []models.CharityDonation
	query := database.DB.Preload("Project.Organization").Where("donor_user_id = ?", userID)

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Order("created_at DESC").Find(&donations).Error; err != nil {
		return nil, err
	}

	return donations, nil
}

// ==================== EVIDENCE (REPORTS) ====================

// GetProjectEvidence returns all evidence for a project
func (s *CharityService) GetProjectEvidence(projectID uint) ([]models.CharityEvidence, error) {
	var evidence []models.CharityEvidence
	if err := database.DB.Where("project_id = ? AND is_approved = ?", projectID, true).
		Order("created_at DESC").
		Find(&evidence).Error; err != nil {
		return nil, err
	}
	return evidence, nil
}

// CreateEvidence creates a new evidence record
func (s *CharityService) CreateEvidence(userID uint, projectID uint, evidenceType models.EvidenceType, title, description, mediaURL, thumbnailURL string) (*models.CharityEvidence, error) {
	// Verify user has permission (org owner or admin)
	var project models.CharityProject
	if err := database.DB.Preload("Organization").First(&project, projectID).Error; err != nil {
		return nil, errors.New("project not found")
	}

	if project.Organization.OwnerUserID != userID {
		return nil, errors.New("access denied: only organization owner can upload evidence")
	}

	evidence := models.CharityEvidence{
		ProjectID:       projectID,
		CreatedByUserID: userID,
		Type:            evidenceType,
		Title:           title,
		Description:     description,
		MediaURL:        mediaURL,
		ThumbnailURL:    thumbnailURL,
		IsApproved:      true, // Auto-approved for now
	}

	if err := database.DB.Create(&evidence).Error; err != nil {
		return nil, err
	}

	// Update project last evidence date
	database.DB.Model(&project).Update("last_evidence_at", time.Now())

	return &evidence, nil
}

// GetRecentDonations returns recent non-anonymous donations for karma feed
func (s *CharityService) GetRecentDonations(projectID uint, limit int) ([]models.CharityDonation, error) {
	var donations []models.CharityDonation

	query := database.DB.
		Preload("DonorUser").
		Preload("Project").
		Where("is_anonymous = ?", false).
		Where("status = ?", models.DonationStatusConfirmed).
		Order("created_at DESC")

	if projectID > 0 {
		query = query.Where("project_id = ?", projectID)
	}

	if limit <= 0 || limit > 50 {
		limit = 20
	}

	if err := query.Limit(limit).Find(&donations).Error; err != nil {
		return nil, err
	}

	return donations, nil
}

// ==================== HELPERS ====================

// generateSlug creates a URL-friendly slug from a title
func generateSlug(title string) string {
	// Transliteration map for Cyrillic
	cyrillicToLatin := map[rune]string{
		'а': "a", 'б': "b", 'в': "v", 'г': "g", 'д': "d", 'е': "e", 'ё': "yo",
		'ж': "zh", 'з': "z", 'и': "i", 'й': "y", 'к': "k", 'л': "l", 'м': "m",
		'н': "n", 'о': "o", 'п': "p", 'р': "r", 'с': "s", 'т': "t", 'у': "u",
		'ф': "f", 'х': "h", 'ц': "ts", 'ч': "ch", 'ш': "sh", 'щ': "sch",
		'ъ': "", 'ы': "y", 'ь': "", 'э': "e", 'ю': "yu", 'я': "ya",
	}

	var result strings.Builder
	for _, r := range strings.ToLower(title) {
		if latin, ok := cyrillicToLatin[r]; ok {
			result.WriteString(latin)
		} else if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			result.WriteRune(r)
		} else if r == ' ' || r == '-' || r == '_' {
			result.WriteRune('-')
		}
	}

	// Clean up multiple dashes and trim
	slug := result.String()
	re := regexp.MustCompile(`-+`)
	slug = re.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "charity"
	}

	// Add timestamp for uniqueness
	return fmt.Sprintf("%s-%d", slug, time.Now().Unix())
}
