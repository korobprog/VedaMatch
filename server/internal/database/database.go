package database

import (
	"fmt"
	"log"
	"os"
	"rag-agent-server/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	var err error

	// Get database connection parameters from environment variables
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5435")
	dbUser := getEnv("DB_USER", "raguser")
	dbPassword := getEnv("DB_PASSWORD", "ragpassword")
	dbName := getEnv("DB_NAME", "ragdb")

	// Build PostgreSQL DSN
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to Database")

	// Auto Migrate
	err = DB.AutoMigrate(&models.User{}, &models.Friend{}, &models.Message{}, &models.Block{}, &models.Room{}, &models.RoomMember{}, &models.AiModel{}, &models.Media{}, &models.SystemSetting{}, &models.DatingFavorite{}, &models.DatingCompatibility{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	log.Println("Database Migrated")
	InitializeSuperAdmin()
}

func InitializeSuperAdmin() {
	email := os.Getenv("SUPERADMIN_EMAIL")
	password := os.Getenv("SUPERADMIN_PASSWORD")

	if email == "" || password == "" {
		log.Println("[AUTH] Superadmin credentials not set in .env, skipping initialization")
		return
	}

	var count int64
	DB.Model(&models.User{}).Where("role = ?", "superadmin").Count(&count)
	if count > 0 {
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("[AUTH] Failed to hash superadmin password: %v", err)
		return
	}

	admin := models.User{
		Email:             email,
		Password:          string(hashedPassword),
		Role:              "superadmin",
		KarmicName:        "Super",
		SpiritualName:     "Admin",
		IsProfileComplete: true,
	}

	if err := DB.Create(&admin).Error; err != nil {
		log.Printf("[AUTH] Failed to create superadmin: %v", err)
	} else {
		log.Println("[AUTH] Superadmin initialized successfully")
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
