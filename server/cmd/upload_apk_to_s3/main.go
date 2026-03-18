package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"rag-agent-server/internal/services"

	"github.com/joho/godotenv"
)

func main() {
	// 1. Load .env
	envPath := "server/.env"
	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		envPath = ".env"
	}
	if err := godotenv.Load(envPath); err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// 2. Init S3 Service
	s3Service := services.GetS3Service()
	if s3Service == nil {
		log.Fatal("Could not initialize S3 Service. Check .env variables.")
	}

	// 3. Get APK file path
	apkPath := "frontend/android/app/build/outputs/apk/release/app-release.apk"
	if len(os.Args) > 1 {
		apkPath = os.Args[1]
	}

	// Check if file exists
	if _, err := os.Stat(apkPath); os.IsNotExist(err) {
		log.Fatalf("APK file not found: %s", apkPath)
	}

	// 4. Generate S3 path with version and timestamp
	// Get version from package.json or use default
	version := os.Getenv("APP_VERSION")
	if version == "" {
		version = "1.1.29"
	}

	buildNum := os.Getenv("BUILD_NUMBER")
	if buildNum == "" {
		buildNum = time.Now().Format("20060102")
	}

	date := time.Now().Format("20060102")

	// S3 path: downloads/android/ragagent-release-v1.1.29-build31-20260316.apk
	s3Filename := fmt.Sprintf("ragagent-release-v%s-build%s-%s.apk", version, buildNum, date)
	s3Path := filepath.Join("downloads/android", s3Filename)

	ctx := context.Background()

	fmt.Println("🚀 Starting APK Upload to S3...")
	fmt.Printf("📦 Local path: %s\n", apkPath)
	fmt.Printf("📤 S3 path: %s\n", s3Path)

	// 5. Upload APK
	contentType := "application/vnd.android.package-archive"
	err := s3Service.UploadLocalFile(ctx, apkPath, s3Path, contentType)
	if err != nil {
		log.Fatalf("❌ Failed to upload APK: %v\n", err)
	}

	// 6. Get public URL
	publicURL := s3Service.GetPublicURL(s3Path)
	
	fmt.Println("\n✅ Upload completed successfully!")
	fmt.Printf("🌐 Public URL: %s\n", publicURL)
	fmt.Printf("\n📋 Download command:\n")
	fmt.Printf("   curl -O %s\n", publicURL)
}
