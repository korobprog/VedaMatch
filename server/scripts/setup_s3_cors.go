package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load("../.env"); err != nil {
		// Try current directory
		if err := godotenv.Load(".env"); err != nil {
			log.Println("No .env file found, using environment variables")
		}
	}

	endpoint := os.Getenv("S3_ENDPOINT")
	region := os.Getenv("S3_REGION")
	accessKey := os.Getenv("S3_ACCESS_KEY")
	secretKey := os.Getenv("S3_SECRET_KEY")
	bucket := os.Getenv("S3_BUCKET_NAME")

	if endpoint == "" || accessKey == "" || secretKey == "" || bucket == "" {
		log.Fatal("Missing S3 configuration. Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET_NAME")
	}

	fmt.Printf("Configuring CORS for bucket: %s\n", bucket)
	fmt.Printf("Endpoint: %s\n", endpoint)

	// Create S3 client
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:           endpoint,
			SigningRegion: region,
		}, nil
	})

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
		config.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	// Define CORS configuration
	corsConfig := &s3.PutBucketCorsInput{
		Bucket: aws.String(bucket),
		CORSConfiguration: &types.CORSConfiguration{
			CORSRules: []types.CORSRule{
				{
					AllowedOrigins: []string{
						"https://vedamatch.ru",
						"https://www.vedamatch.ru",
						"https://admin.vedamatch.ru",
						"http://localhost:3000",
						"http://localhost:3001",
						"http://localhost:3005",
					},
					AllowedMethods: []string{
						"GET",
						"PUT",
						"POST",
						"DELETE",
						"HEAD",
					},
					AllowedHeaders: []string{
						"*",
					},
					ExposeHeaders: []string{
						"ETag",
						"x-amz-meta-custom-header",
					},
					MaxAgeSeconds: aws.Int32(3600),
				},
			},
		},
	}

	// Apply CORS configuration
	_, err = client.PutBucketCors(context.TODO(), corsConfig)
	if err != nil {
		log.Fatalf("Failed to set CORS: %v", err)
	}

	fmt.Println("✅ CORS configuration applied successfully!")

	// Verify by getting the CORS config
	getResult, err := client.GetBucketCors(context.TODO(), &s3.GetBucketCorsInput{
		Bucket: aws.String(bucket),
	})
	if err != nil {
		log.Printf("Warning: Could not verify CORS (some S3 providers don't support GetBucketCors): %v", err)
	} else {
		fmt.Println("\nCurrent CORS rules:")
		for i, rule := range getResult.CORSRules {
			fmt.Printf("  Rule %d:\n", i+1)
			fmt.Printf("    Origins: %v\n", rule.AllowedOrigins)
			fmt.Printf("    Methods: %v\n", rule.AllowedMethods)
			fmt.Printf("    Headers: %v\n", rule.AllowedHeaders)
		}
	}
}
