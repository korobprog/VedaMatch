package database

import (
	"log"
	"rag-agent-server/internal/models"
)

// SeedCharity initializes platform wallet and charity settings
func SeedCharity() {
	SeedPlatformWallet()
	SeedCharitySettings()
	SeedDemoProjects()
}

// SeedDemoProjects creates initial charity projects for testing
func SeedDemoProjects() {
	var count int64
	DB.Model(&models.CharityProject{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("[Seed] Seeding Seva Projects...")

	// 1. Find a user to be owner
	var user models.User
	if err := DB.First(&user).Error; err != nil {
		log.Println("[Seed] No users found, skipping charity project seed")
		return
	}

	// 2. Create Organizations
	orgs := []models.CharityOrganization{
		{
			OwnerUserID: user.ID,
			Name:        "Govardhan Eco Village",
			Slug:        "govardhan",
			Description: "Organic farm & cow protection",
			Status:      models.OrgStatusVerified,
			IsPremium:   true,
			TrustScore:  98,
			LogoURL:     "https://images.unsplash.com/photo-1546445317-29f4545e9d53?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
		},
		{
			OwnerUserID: user.ID,
			Name:        "Food for Life Vrindavan",
			Slug:        "fflv",
			Description: "Education and food for girls",
			Status:      models.OrgStatusVerified,
			IsPremium:   true,
			TrustScore:  95,
			LogoURL:     "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
		},
	}

	for i := range orgs {
		DB.Create(&orgs[i])
	}

	// 2.5. Create Wallets for each organization
	for i := range orgs {
		wallet := models.Wallet{
			Type:           models.WalletTypeCharity,
			OrganizationID: &orgs[i].ID,
			Balance:        orgs[i].TotalRaised, // Set initial balance from stats
			TotalEarned:    orgs[i].TotalRaised,
		}
		if err := DB.Create(&wallet).Error; err != nil {
			log.Printf("[Seed] Error creating wallet for org %s: %v", orgs[i].Name, err)
			continue
		}

		// Link wallet to organization
		DB.Model(&orgs[i]).Update("wallet_id", wallet.ID)
		log.Printf("[Seed] Created wallet (ID: %d) for organization: %s", wallet.ID, orgs[i].Name)
	}

	// 3. Create Projects
	projects := []models.CharityProject{
		{
			OrganizationID: orgs[0].ID,
			Title:          "Feed 100 Cows Daily",
			Slug:           "feed-cows",
			ShortDesc:      "Support our goshala and provide fresh grass for 100 cows.",
			Description:    "Every day our 100 cows eat 2 tons of fresh green grass. Your support helps us maintain the quality of their life and health.",
			CoverURL:       "https://images.unsplash.com/photo-1546445317-29f4545e9d53?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
			Category:       "animals",
			GoalAmount:     100000,
			RaisedAmount:   45000,
			DonationsCount: 120,
			UniqueDonors:   85,
			MinDonation:    100,
			Status:         models.ProjectStatusActive,
			IsFeatured:     true,
			ImpactMetrics: []models.ImpactMetricConfig{
				{Metric: "cows_fed", LabelRu: "Коров накормлено", LabelEn: "Cows fed", UnitCost: 100, Icon: "🐄"},
			},
		},
		{
			OrganizationID: orgs[1].ID,
			Title:          "School Lunch Program",
			Slug:           "school-lunch",
			ShortDesc:      "Provide nutritious prasadam for school children in Vrindavan.",
			Description:    "We serve 1500 students daily. Each meal is balanced and healthy, helping them focus on their studies.",
			CoverURL:       "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
			Category:       "food",
			GoalAmount:     50000,
			RaisedAmount:   12000,
			DonationsCount: 45,
			UniqueDonors:   30,
			MinDonation:    50,
			Status:         models.ProjectStatusActive,
			IsUrgent:       true,
			ImpactMetrics: []models.ImpactMetricConfig{
				{Metric: "meals", LabelRu: "Обедов роздано", LabelEn: "Meals served", UnitCost: 100, Icon: "🍱"},
			},
		},
	}

	for i := range projects {
		DB.Create(&projects[i])
	}

	log.Printf("[Seed] Seeded %d organizations and %d charity projects", len(orgs), len(projects))
}

// SeedPlatformWallet creates the system platform wallet for receiving tips
func SeedPlatformWallet() {
	// Check if platform wallet already exists
	var existing models.Wallet
	if err := DB.Where("type = ?", models.WalletTypePlatform).First(&existing).Error; err == nil {
		log.Printf("[Seed] Platform wallet already exists (ID: %d, Balance: %d LKM)", existing.ID, existing.Balance)
		return
	}

	// Create platform wallet (no user owner)
	platformWallet := models.Wallet{
		Type:           models.WalletTypePlatform,
		UserID:         nil, // No user owner - this is a system wallet
		Balance:        0,
		PendingBalance: 0,
		FrozenBalance:  0,
		TotalEarned:    0,
		TotalSpent:     0,
	}

	if err := DB.Create(&platformWallet).Error; err != nil {
		log.Printf("[Seed] Error creating platform wallet: %v", err)
		return
	}

	log.Printf("[Seed] Created platform wallet (ID: %d) for charity tips collection", platformWallet.ID)
}

// SeedCharitySettings creates default charity settings
func SeedCharitySettings() {
	// Check if settings already exist
	var existing models.CharitySettings
	if err := DB.First(&existing).Error; err == nil {
		log.Printf("[Seed] Charity settings already exist")
		return
	}

	// Get platform wallet ID
	var platformWallet models.Wallet
	if err := DB.Where("type = ?", models.WalletTypePlatform).First(&platformWallet).Error; err != nil {
		log.Printf("[Seed] Warning: Platform wallet not found for charity settings")
		return
	}

	settings := models.CharitySettings{
		DefaultTipsPercent:     5.0, // 5% default tips
		TipsEnabled:            true,
		TipsCheckboxDefault:    true, // Checked by default
		DefaultReportingDays:   30,   // 30 days between reports
		WarningBeforeBlockDays: 7,    // 7 days grace period after first warning
		PlatformWalletID:       &platformWallet.ID,
	}

	if err := DB.Create(&settings).Error; err != nil {
		log.Printf("[Seed] Error creating charity settings: %v", err)
		return
	}

	log.Printf("[Seed] Created charity settings (Tips: %.0f%%, Reporting: %d days)",
		settings.DefaultTipsPercent, settings.DefaultReportingDays)
}
