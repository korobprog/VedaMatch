package main

import (
	"context"
	"log"
	"rag-agent-server/internal/services"

	"github.com/joho/godotenv"
)

func main() {
	// 1. Load .env
	if err := godotenv.Load(".env"); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// 2. Init S3 Service
	s3Service := services.GetS3Service()
	if s3Service == nil {
		log.Fatal("Could not initialize S3 Service. Check .env variables.")
	}

	ctx := context.Background()

	files := []string{
		"travel/demo/vrindavan_parikrama.jpg",
		"travel/demo/mayapur_festival.jpg",
		"travel/demo/guest_house_room_v2.jpg",
		"travel/demo/ashram_living.jpg",
	}

	log.Println("🔓 Setting public-read ACL for uploaded files...")

	// Access the underlying client
	client := s3Service.(*services.S3Service)

	for _, key := range files {
		log.Printf("Setting ACL for: %s", key)

		// Note: We need to cast to access private fields
		// This is a workaround - ideally S3Service should expose a SetACL method
		// For now, we'll use the reflection trick or add a method to S3Service

		log.Printf("⚠️  Cannot set ACL directly. Need to implement SetACL method in S3Service.")
		log.Printf("Alternative: Set bucket policy or use presigned URLs")
	}

	log.Println("\n📋 SOLUTION:")
	log.Println("Option 1: Make bucket public via S3 console/API")
	log.Println("Option 2: Upload with public-read ACL (modify UploadFile method)")
	log.Println("Option 3: Use presigned URLs (temporary access)")
}
