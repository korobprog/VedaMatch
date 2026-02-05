package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"strings"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"

	"gorm.io/gorm"
)

// ReferralService handles referral program logic
type ReferralService struct {
	walletService *WalletService
}

// NewReferralService creates a new referral service
func NewReferralService(walletService *WalletService) *ReferralService {
	return &ReferralService{
		walletService: walletService,
	}
}

// GenerateInviteCode creates a unique 8-character invite code
func GenerateInviteCode() string {
	bytes := make([]byte, 4)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to simple random
		return strings.ToUpper(hex.EncodeToString(bytes))[:8]
	}
	return strings.ToUpper(hex.EncodeToString(bytes))
}

// EnsureInviteCode generates an invite code for a user if they don't have one
func (s *ReferralService) EnsureInviteCode(userID uint) (string, error) {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return "", err
	}

	if user.InviteCode != "" {
		return user.InviteCode, nil
	}

	// Generate unique code with retry
	var code string
	for i := 0; i < 10; i++ {
		code = GenerateInviteCode()
		var existing models.User
		if err := database.DB.Where("invite_code = ?", code).First(&existing).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				break // Code is unique
			}
		}
		code = "" // Reset and retry
	}

	if code == "" {
		return "", errors.New("failed to generate unique invite code")
	}

	user.InviteCode = code
	if err := database.DB.Save(&user).Error; err != nil {
		return "", err
	}

	return code, nil
}

// LinkReferral connects a new user to their referrer using invite code
func (s *ReferralService) LinkReferral(newUserID uint, inviteCode string) error {
	if inviteCode == "" {
		return nil // No invite code provided, not an error
	}

	// Find referrer by invite code
	var referrer models.User
	if err := database.DB.Where("invite_code = ?", strings.ToUpper(inviteCode)).First(&referrer).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Printf("[Referral] Invalid invite code: %s", inviteCode)
			return nil // Invalid code, silently ignore
		}
		return err
	}

	// Fetch new user to check for device fraud
	var newUser models.User
	if err := database.DB.First(&newUser, newUserID).Error; err != nil {
		return err
	}

	// Prevent self-referral
	if referrer.ID == newUserID {
		return nil
	}

	// Fraud Detection: Check if same device
	if referrer.DeviceID != "" && newUser.DeviceID != "" && referrer.DeviceID == newUser.DeviceID {
		log.Printf("[Referral] Fraud Alert: User %d and Referrer %d share the same DeviceID: %s. Linking blocked.", newUserID, referrer.ID, newUser.DeviceID)
		return nil // Block linking silently or with a specific message if needed
	}

	// Update new user with referrer info
	if err := database.DB.Model(&models.User{}).Where("id = ?", newUserID).Updates(map[string]interface{}{
		"referrer_id":     referrer.ID,
		"referral_status": models.ReferralStatusPending,
	}).Error; err != nil {
		return err
	}

	log.Printf("[Referral] User %d linked to referrer %d (code: %s)", newUserID, referrer.ID, inviteCode)

	// Send Push Notification to Referrer
	go func() {
		var newUser models.User
		if err := database.DB.Select("spiritual_name, karmic_name").First(&newUser, newUserID).Error; err == nil {
			name := newUser.SpiritualName
			if name == "" {
				name = newUser.KarmicName
			}
			if name == "" {
				name = "Аноним"
			}
			GetPushService().SendReferralJoined(referrer.ID, name)
		}
	}()

	return nil
}

// ProcessProfileCompletion awards 50 Pending LKM to the referral when they complete their profile
func (s *ReferralService) ProcessProfileCompletion(userID uint) error {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return err
	}

	// Only process if user was referred and hasn't received welcome bonus yet
	if user.ReferrerID == nil || user.ReferralStatus != models.ReferralStatusPending {
		return nil
	}

	// Award 50 Pending LKM (Welcome Bonus)
	// Note: We use the existing wallet pending balance mechanism
	wallet, err := s.walletService.GetOrCreateWallet(userID)
	if err != nil {
		return err
	}

	// The welcome bonus is already given in GetOrCreateWallet (50 pending)
	// Just log for audit
	log.Printf("[Referral] User %d completed profile, pending balance: %d", userID, wallet.PendingBalance)

	return nil
}

// ProcessActivation is called when a referred user performs a "useful action"
// (e.g., spends LKM, books a service). This:
// 1. Activates the referral's pending balance
// 2. Awards 100 LKM to the referrer
func (s *ReferralService) ProcessActivation(userID uint) error {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		return err
	}

	// Only process if user was referred and not yet activated
	if user.ReferrerID == nil || user.ReferralStatus != models.ReferralStatusPending {
		return nil
	}

	return database.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Mark referral as activated
		if err := tx.Model(&user).Update("referral_status", models.ReferralStatusActivated).Error; err != nil {
			return err
		}

		// 2. Activate pending balance for the referral (convert pending to active)
		if err := s.walletService.ActivatePendingBalance(userID); err != nil {
			log.Printf("[Referral] Failed to activate pending balance for user %d: %v", userID, err)
			// Don't fail the whole transaction, just log
		}

		// 3. Award 100 LKM to the referrer
		referrerID := *user.ReferrerID
		err := s.walletService.AddBonus(referrerID, 100, "Реферальный бонус (друг активировался)")
		if err != nil {
			log.Printf("[Referral] Failed to credit referrer %d: %v", referrerID, err)
			return err
		}

		log.Printf("[Referral] User %d activated! Referrer %d received 100 LKM", userID, referrerID)

		// Send Push Notification to Referrer
		go func() {
			name := user.SpiritualName
			if name == "" {
				name = user.KarmicName
			}
			if name == "" {
				name = "Друг"
			}
			GetPushService().SendReferralActivated(referrerID, name, 100)
		}()

		return nil
	})
}

// GetReferralStats returns statistics for a user's referral activity
func (s *ReferralService) GetReferralStats(userID uint) (*ReferralStats, error) {
	var totalInvited int64
	var activeInvited int64
	var totalEarned int64

	// Count total invites
	database.DB.Model(&models.User{}).Where("referrer_id = ?", userID).Count(&totalInvited)

	// Count active invites
	database.DB.Model(&models.User{}).Where("referrer_id = ? AND referral_status = ?", userID, models.ReferralStatusActivated).Count(&activeInvited)

	// Calculate total earned (100 LKM per active referral)
	totalEarned = activeInvited * 100

	return &ReferralStats{
		TotalInvited:  int(totalInvited),
		ActiveInvited: int(activeInvited),
		TotalEarned:   int(totalEarned),
	}, nil
}

// GetReferralList returns list of referrals for a user
func (s *ReferralService) GetReferralList(userID uint, limit, offset int) ([]ReferralInfo, error) {
	var referrals []models.User
	query := database.DB.
		Where("referrer_id = ?", userID).
		Select("id, spiritual_name, karmic_name, avatar_url, referral_status, created_at").
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit).Offset(offset)
	}

	if err := query.Find(&referrals).Error; err != nil {
		return nil, err
	}

	result := make([]ReferralInfo, len(referrals))
	for i, r := range referrals {
		name := r.SpiritualName
		if name == "" {
			name = r.KarmicName
		}
		if name == "" {
			name = "Аноним"
		}

		result[i] = ReferralInfo{
			ID:        r.ID,
			Name:      name,
			AvatarURL: r.AvatarURL,
			Status:    string(r.ReferralStatus),
			JoinedAt:  r.CreatedAt.Format("2006-01-02"),
		}
	}

	return result, nil
}

// ReferralStats holds referral statistics
type ReferralStats struct {
	TotalInvited  int `json:"totalInvited"`
	ActiveInvited int `json:"activeInvited"`
	TotalEarned   int `json:"totalEarned"`
}

// ReferralInfo holds info about a single referral
type ReferralInfo struct {
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatarUrl"`
	Status    string `json:"status"` // pending or active
	JoinedAt  string `json:"joinedAt"`
}

// GenerateInviteCodesForExistingUsers generates invite codes for all users who don't have one
func (s *ReferralService) GenerateInviteCodesForExistingUsers() error {
	var users []models.User
	if err := database.DB.Where("invite_code = '' OR invite_code IS NULL").Find(&users).Error; err != nil {
		return err
	}

	for _, user := range users {
		code := GenerateInviteCode()
		// Check uniqueness
		for {
			var existing models.User
			if err := database.DB.Where("invite_code = ?", code).First(&existing).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					break // Unique
				}
			}
			code = GenerateInviteCode()
		}

		if err := database.DB.Model(&user).Update("invite_code", code).Error; err != nil {
			log.Printf("[Referral] Failed to generate code for user %d: %v", user.ID, err)
			continue
		}
		log.Printf("[Referral] Generated invite code %s for user %d", code, user.ID)
	}

	return nil
}
