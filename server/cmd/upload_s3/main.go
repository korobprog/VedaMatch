package main

import (
	"context"
	"fmt"
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

	files := []string{
		"vrindavan_parikrama.jpg",
		"mayapur_festival.jpg",
		"guest_house_room_v2.jpg",
		"ashram_living.jpg",
	}

	ctx := context.Background()

	fmt.Println("🚀 Starting S3 Upload...")

	for _, filename := range files {
		// Assume files are in current directory
		localPath := filename

		// Target path in S3 (e.g., travel/demo/vrindavan_parikrama.jpg)
		s3Path := fmt.Sprintf("travel/demo/%s", filename)

		contentType := "image/jpeg"

		fmt.Printf("Uploading %s -> %s ...\n", localPath, s3Path)

		// Upload
		err := s3Service.UploadLocalFile(ctx, localPath, s3Path, contentType)
		if err != nil {
			log.Printf("❌ Failed to upload %s: %v\n", filename, err)
			continue
		}

		// Get URL
		publicURL := s3Service.GetPublicURL(s3Path)
		fmt.Printf("✅ Uploaded! URL: %s\n", publicURL)
	}

	fmt.Println("🎉 All done!")
}
