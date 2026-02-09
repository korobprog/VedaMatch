package models

import (
	"gorm.io/gorm"
)

// ReferralStatus represents the activation status of a referred user
type ReferralStatus string

const (
	ReferralStatusNone      ReferralStatus = ""        // Not a referral
	ReferralStatusPending   ReferralStatus = "pending" // Registered but not activated
	ReferralStatusActivated ReferralStatus = "active"  // Performed "useful action"
)

type User struct {
	gorm.Model
	KarmicName         string   `json:"karmicName"`
	SpiritualName      string   `json:"spiritualName"`
	Email              string   `json:"email" gorm:"unique"`
	Password           string   `json:"password"`
	Gender             string   `json:"gender"`
	Country            string   `json:"country"`
	City               string   `json:"city"`
	Latitude           *float64 `json:"latitude" gorm:"column:latitude"`
	Longitude          *float64 `json:"longitude" gorm:"column:longitude"`
	Identity           string   `json:"identity"`
	Diet               string   `json:"diet"`
	Madh               string   `json:"madh"`
	YogaStyle          string   `json:"yogaStyle"`
	Guna               string   `json:"guna"`
	Mentor             string   `json:"mentor"`
	Dob                string   `json:"dob"`
	Bio                string   `json:"bio"`
	Interests          string   `json:"interests"`
	LookingFor         string   `json:"lookingFor"`
	Intentions         string   `json:"intentions"` // marriage, business, friendship, seva
	Skills             string   `json:"skills"`
	Industry           string   `json:"industry"`
	LookingForBusiness string   `json:"lookingForBusiness"`
	MaritalStatus      string   `json:"maritalStatus"`
	BirthTime          string   `json:"birthTime" gorm:"column:birth_time"`
	BirthPlaceLink     string   `json:"birthPlaceLink" gorm:"column:birth_place_link"`
	DatingEnabled      bool     `json:"datingEnabled" gorm:"default:false"`
	IsProfileComplete  bool     `json:"isProfileComplete" gorm:"default:false"`
	CurrentPlan        string   `json:"currentPlan" gorm:"default:'trial'"`
	Region             string   `json:"region" gorm:"default:'global'"`
	Language           string   `json:"language" gorm:"default:'en'"`
	RagFileID          string   `json:"ragFileId"`
	AvatarURL          string   `json:"avatarUrl"`
	LastSeen           string   `json:"lastSeen"` // Using string for ISO format or time.Time
	Role               string   `json:"role" gorm:"default:'user'"`
	GodModeEnabled     bool     `json:"godModeEnabled" gorm:"default:false"`
	IsBlocked          bool     `json:"isBlocked" gorm:"default:false"`
	IsFlagged          bool     `json:"isFlagged" gorm:"default:false"`
	FlagReason         string   `json:"flagReason"`
	PushToken          string   `json:"pushToken"` // Expo or FCM token
	DeviceID           string   `json:"deviceId"`  // Unique hardware ID for fraud detection
	Yatra              string   `json:"yatra"`     // Spiritual community/location
	Timezone           string   `json:"timezone"`  // IANA timezone e.g. "Europe/Moscow"
	Photos             []Media  `json:"photos" gorm:"foreignKey:UserID"`

	// Referral System Fields
	InviteCode     string         `json:"inviteCode" gorm:"uniqueIndex;size:8"`            // Unique 8-char code for inviting others
	ReferrerID     *uint          `json:"referrerId" gorm:"index"`                         // ID of the user who invited this user
	Referrer       *User          `json:"referrer,omitempty" gorm:"foreignKey:ReferrerID"` // Relation to referrer
	ReferralStatus ReferralStatus `json:"referralStatus" gorm:"default:''"`                // pending, active, or empty
}
