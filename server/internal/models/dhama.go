package models

import (
	"time"

	"gorm.io/gorm"
)

type HolyPlaceStatus string

const (
	HolyPlaceStatusDraft     HolyPlaceStatus = "draft"
	HolyPlaceStatusPublished HolyPlaceStatus = "published"
	HolyPlaceStatusArchived  HolyPlaceStatus = "archived"
)

type HolyPlace struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Slug       string          `json:"slug" gorm:"type:varchar(160);uniqueIndex;not null"`
	Status     HolyPlaceStatus `json:"status" gorm:"type:varchar(20);default:'draft';index"`
	SortOrder  int             `json:"sortOrder" gorm:"default:0;index"`
	IsFeatured bool            `json:"isFeatured" gorm:"default:false;index"`

	TitleRu            string `json:"titleRu" gorm:"type:varchar(255);not null"`
	TitleEn            string `json:"titleEn" gorm:"type:varchar(255)"`
	TitleHi            string `json:"titleHi" gorm:"type:varchar(255)"`
	ShortDescriptionRu string `json:"shortDescriptionRu" gorm:"type:text"`
	ShortDescriptionEn string `json:"shortDescriptionEn" gorm:"type:text"`
	ShortDescriptionHi string `json:"shortDescriptionHi" gorm:"type:text"`
	DescriptionRu      string `json:"descriptionRu" gorm:"type:text"`
	DescriptionEn      string `json:"descriptionEn" gorm:"type:text"`
	DescriptionHi      string `json:"descriptionHi" gorm:"type:text"`
	VisitRulesRu       string `json:"visitRulesRu" gorm:"type:text"`
	VisitRulesEn       string `json:"visitRulesEn" gorm:"type:text"`
	VisitRulesHi       string `json:"visitRulesHi" gorm:"type:text"`
	EtiquetteRu        string `json:"etiquetteRu" gorm:"type:text"`
	EtiquetteEn        string `json:"etiquetteEn" gorm:"type:text"`
	EtiquetteHi        string `json:"etiquetteHi" gorm:"type:text"`
	PilgrimageTipsRu   string `json:"pilgrimageTipsRu" gorm:"type:text"`
	PilgrimageTipsEn   string `json:"pilgrimageTipsEn" gorm:"type:text"`
	PilgrimageTipsHi   string `json:"pilgrimageTipsHi" gorm:"type:text"`
	PracticesRu        string `json:"practicesRu" gorm:"type:text"`
	PracticesEn        string `json:"practicesEn" gorm:"type:text"`
	PracticesHi        string `json:"practicesHi" gorm:"type:text"`
	FAQRu              string `json:"faqRu" gorm:"type:text"`
	FAQEn              string `json:"faqEn" gorm:"type:text"`
	FAQHi              string `json:"faqHi" gorm:"type:text"`

	PlaceType string `json:"placeType" gorm:"type:varchar(80);index"`
	Tradition string `json:"tradition" gorm:"type:varchar(120);index"`
	City      string `json:"city" gorm:"type:varchar(120);index;not null"`
	State     string `json:"state" gorm:"type:varchar(120);index;not null"`
	Country   string `json:"country" gorm:"type:varchar(120);index;not null;default:'India'"`

	Latitude  float64 `json:"latitude" gorm:"type:decimal(10,8);not null;index"`
	Longitude float64 `json:"longitude" gorm:"type:decimal(11,8);not null;index"`

	BestSeason string `json:"bestSeason" gorm:"type:varchar(255)"`
	BestTime   string `json:"bestTime" gorm:"type:varchar(255)"`

	HeroImageURL string `json:"heroImageUrl" gorm:"type:varchar(500)"`
	GalleryJSON  string `json:"galleryJson" gorm:"type:text"`

	MediaLinks []HolyPlaceMediaLink `json:"mediaLinks,omitempty" gorm:"foreignKey:HolyPlaceID"`
	YatraLinks []HolyPlaceYatraLink `json:"yatraLinks,omitempty" gorm:"foreignKey:HolyPlaceID"`
}

type HolyPlaceMediaLink struct {
	ID           uint       `gorm:"primarykey" json:"id"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
	HolyPlaceID  uint       `json:"holyPlaceId" gorm:"not null;index;uniqueIndex:idx_holy_place_media_link"`
	MediaTrackID uint       `json:"mediaTrackId" gorm:"not null;index;uniqueIndex:idx_holy_place_media_link"`
	SortOrder    int        `json:"sortOrder" gorm:"default:0"`
	Track        MediaTrack `json:"track,omitempty" gorm:"foreignKey:MediaTrackID"`
}

type HolyPlaceYatraLink struct {
	ID          uint      `gorm:"primarykey" json:"id"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	HolyPlaceID uint      `json:"holyPlaceId" gorm:"not null;index;uniqueIndex:idx_holy_place_yatra_link"`
	YatraID     uint      `json:"yatraId" gorm:"not null;index;uniqueIndex:idx_holy_place_yatra_link"`
	SortOrder   int       `json:"sortOrder" gorm:"default:0"`
	Yatra       Yatra     `json:"yatra,omitempty" gorm:"foreignKey:YatraID"`
}

type HolyPlaceUpsertRequest struct {
	Slug                string   `json:"slug"`
	Status              string   `json:"status"`
	SortOrder           int      `json:"sortOrder"`
	IsFeatured          bool     `json:"isFeatured"`
	TitleRu             string   `json:"titleRu"`
	TitleEn             string   `json:"titleEn"`
	TitleHi             string   `json:"titleHi"`
	ShortDescriptionRu  string   `json:"shortDescriptionRu"`
	ShortDescriptionEn  string   `json:"shortDescriptionEn"`
	ShortDescriptionHi  string   `json:"shortDescriptionHi"`
	DescriptionRu       string   `json:"descriptionRu"`
	DescriptionEn       string   `json:"descriptionEn"`
	DescriptionHi       string   `json:"descriptionHi"`
	VisitRulesRu        string   `json:"visitRulesRu"`
	VisitRulesEn        string   `json:"visitRulesEn"`
	VisitRulesHi        string   `json:"visitRulesHi"`
	EtiquetteRu         string   `json:"etiquetteRu"`
	EtiquetteEn         string   `json:"etiquetteEn"`
	EtiquetteHi         string   `json:"etiquetteHi"`
	PilgrimageTipsRu    string   `json:"pilgrimageTipsRu"`
	PilgrimageTipsEn    string   `json:"pilgrimageTipsEn"`
	PilgrimageTipsHi    string   `json:"pilgrimageTipsHi"`
	PracticesRu         string   `json:"practicesRu"`
	PracticesEn         string   `json:"practicesEn"`
	PracticesHi         string   `json:"practicesHi"`
	FAQRu               string   `json:"faqRu"`
	FAQEn               string   `json:"faqEn"`
	FAQHi               string   `json:"faqHi"`
	PlaceType           string   `json:"placeType"`
	Tradition           string   `json:"tradition"`
	City                string   `json:"city"`
	State               string   `json:"state"`
	Country             string   `json:"country"`
	Latitude            float64  `json:"latitude"`
	Longitude           float64  `json:"longitude"`
	BestSeason          string   `json:"bestSeason"`
	BestTime            string   `json:"bestTime"`
	HeroImageURL        string   `json:"heroImageUrl"`
	Gallery             []string `json:"gallery"`
	LinkedMediaTrackIDs []uint   `json:"linkedMediaTrackIds"`
	LinkedYatraIDs      []uint   `json:"linkedYatraIds"`
}

type HolyPlaceFilters struct {
	Search    string
	PlaceType string
	State     string
	City      string
	Tradition string
	Status    HolyPlaceStatus
	Featured  *bool
	Page      int
	Limit     int
	LatMin    *float64
	LatMax    *float64
	LngMin    *float64
	LngMax    *float64
}

type HolyPlaceLocalizedResponse struct {
	ID               uint                   `json:"id"`
	Slug             string                 `json:"slug"`
	Status           HolyPlaceStatus        `json:"status,omitempty"`
	SortOrder        int                    `json:"sortOrder"`
	IsFeatured       bool                   `json:"isFeatured"`
	Title            string                 `json:"title"`
	ShortDescription string                 `json:"shortDescription"`
	Description      string                 `json:"description"`
	VisitRules       string                 `json:"visitRules"`
	Etiquette        string                 `json:"etiquette"`
	PilgrimageTips   string                 `json:"pilgrimageTips"`
	Practices        string                 `json:"practices"`
	FAQ              string                 `json:"faq"`
	PlaceType        string                 `json:"placeType"`
	Tradition        string                 `json:"tradition"`
	City             string                 `json:"city"`
	State            string                 `json:"state"`
	Country          string                 `json:"country"`
	Latitude         float64                `json:"latitude"`
	Longitude        float64                `json:"longitude"`
	BestSeason       string                 `json:"bestSeason"`
	BestTime         string                 `json:"bestTime"`
	HeroImageURL     string                 `json:"heroImageUrl"`
	Gallery          []string               `json:"gallery"`
	Locale           string                 `json:"locale"`
	AvailableLocales []string               `json:"availableLocales"`
	LinkedMedia      []HolyPlaceLinkedMedia `json:"linkedMedia,omitempty"`
	LinkedYatras     []HolyPlaceLinkedYatra `json:"linkedYatras,omitempty"`
}

type HolyPlaceLinkedMedia struct {
	ID           uint      `json:"id"`
	Title        string    `json:"title"`
	Artist       string    `json:"artist"`
	Description  string    `json:"description"`
	Duration     int       `json:"duration"`
	MediaType    MediaType `json:"mediaType"`
	URL          string    `json:"url"`
	ThumbnailURL string    `json:"thumbnailUrl"`
}

type HolyPlaceLinkedYatra struct {
	ID            uint        `json:"id"`
	Title         string      `json:"title"`
	Theme         YatraTheme  `json:"theme"`
	Status        YatraStatus `json:"status"`
	StartDate     time.Time   `json:"startDate"`
	EndDate       time.Time   `json:"endDate"`
	StartCity     string      `json:"startCity"`
	EndCity       string      `json:"endCity"`
	CoverImageURL string      `json:"coverImageUrl"`
}

type HolyPlaceAdminResponse struct {
	ID                  uint                   `json:"id"`
	CreatedAt           time.Time              `json:"createdAt"`
	UpdatedAt           time.Time              `json:"updatedAt"`
	Slug                string                 `json:"slug"`
	Status              HolyPlaceStatus        `json:"status"`
	SortOrder           int                    `json:"sortOrder"`
	IsFeatured          bool                   `json:"isFeatured"`
	TitleRu             string                 `json:"titleRu"`
	TitleEn             string                 `json:"titleEn"`
	TitleHi             string                 `json:"titleHi"`
	ShortDescriptionRu  string                 `json:"shortDescriptionRu"`
	ShortDescriptionEn  string                 `json:"shortDescriptionEn"`
	ShortDescriptionHi  string                 `json:"shortDescriptionHi"`
	DescriptionRu       string                 `json:"descriptionRu"`
	DescriptionEn       string                 `json:"descriptionEn"`
	DescriptionHi       string                 `json:"descriptionHi"`
	VisitRulesRu        string                 `json:"visitRulesRu"`
	VisitRulesEn        string                 `json:"visitRulesEn"`
	VisitRulesHi        string                 `json:"visitRulesHi"`
	EtiquetteRu         string                 `json:"etiquetteRu"`
	EtiquetteEn         string                 `json:"etiquetteEn"`
	EtiquetteHi         string                 `json:"etiquetteHi"`
	PilgrimageTipsRu    string                 `json:"pilgrimageTipsRu"`
	PilgrimageTipsEn    string                 `json:"pilgrimageTipsEn"`
	PilgrimageTipsHi    string                 `json:"pilgrimageTipsHi"`
	PracticesRu         string                 `json:"practicesRu"`
	PracticesEn         string                 `json:"practicesEn"`
	PracticesHi         string                 `json:"practicesHi"`
	FAQRu               string                 `json:"faqRu"`
	FAQEn               string                 `json:"faqEn"`
	FAQHi               string                 `json:"faqHi"`
	PlaceType           string                 `json:"placeType"`
	Tradition           string                 `json:"tradition"`
	City                string                 `json:"city"`
	State               string                 `json:"state"`
	Country             string                 `json:"country"`
	Latitude            float64                `json:"latitude"`
	Longitude           float64                `json:"longitude"`
	BestSeason          string                 `json:"bestSeason"`
	BestTime            string                 `json:"bestTime"`
	HeroImageURL        string                 `json:"heroImageUrl"`
	Gallery             []string               `json:"gallery"`
	LinkedMediaTrackIDs []uint                 `json:"linkedMediaTrackIds"`
	LinkedYatraIDs      []uint                 `json:"linkedYatraIds"`
	LinkedMedia         []HolyPlaceLinkedMedia `json:"linkedMedia"`
	LinkedYatras        []HolyPlaceLinkedYatra `json:"linkedYatras"`
}

type HolyPlaceFiltersResponse struct {
	Types      []string `json:"types"`
	States     []string `json:"states"`
	Cities     []string `json:"cities"`
	Traditions []string `json:"traditions"`
}

type HolyPlaceMapMarker struct {
	ID               uint    `json:"id"`
	Slug             string  `json:"slug"`
	Title            string  `json:"title"`
	ShortDescription string  `json:"shortDescription"`
	PlaceType        string  `json:"placeType"`
	City             string  `json:"city"`
	State            string  `json:"state"`
	Latitude         float64 `json:"latitude"`
	Longitude        float64 `json:"longitude"`
	HeroImageURL     string  `json:"heroImageUrl"`
	IsFeatured       bool    `json:"isFeatured"`
}
