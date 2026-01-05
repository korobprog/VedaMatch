package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"sync"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type S3Service struct {
	client     *s3.Client
	bucketName string
	publicURL  string
}

var (
	s3Instance *S3Service
	s3Once     sync.Once
)

func GetS3Service() *S3Service {
	s3Once.Do(func() {
		endpoint := strings.TrimSpace(os.Getenv("S3_ENDPOINT"))
		region := strings.TrimSpace(os.Getenv("S3_REGION"))
		accessKey := strings.TrimSpace(os.Getenv("S3_ACCESS_KEY"))
		secretKey := strings.TrimSpace(os.Getenv("S3_SECRET_KEY"))
		bucketName := strings.TrimSpace(os.Getenv("S3_BUCKET_NAME"))
		publicURL := strings.TrimSpace(os.Getenv("S3_PUBLIC_URL"))

		if accessKey == "" || secretKey == "" || bucketName == "" {
			log.Println("[S3] Warning: S3 credentials or bucket name not set")
			return
		}

		// Custom resolver for Timeweb S3
		customResolver := aws.EndpointResolverWithOptionsFunc(func(service, reqRegion string, options ...interface{}) (aws.Endpoint, error) {
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
			log.Fatalf("[S3] Unable to load SDK config, %v", err)
		}

		s3Instance = &S3Service{
			client: s3.NewFromConfig(cfg, func(o *s3.Options) {
				o.UsePathStyle = true
			}),
			bucketName: bucketName,
			publicURL:  publicURL,
		}
		log.Printf("[S3] Connected to endpoint: %s, bucket: %s", endpoint, bucketName)
	})

	return s3Instance
}

// UploadFile uploads a file to S3 and returns the public URL
func (s *S3Service) UploadFile(ctx context.Context, file io.Reader, fileName string, contentType string) (string, error) {
	if s == nil || s.client == nil {
		return "", fmt.Errorf("S3 service not initialized")
	}

	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(fileName),
		Body:        file,
		ContentType: aws.String(contentType),
	})

	if err != nil {
		return "", fmt.Errorf("failed to upload file to S3: %w", err)
	}

	// Construct public URL
	fileURL := fmt.Sprintf("%s/%s", s.publicURL, fileName)
	return fileURL, nil
}

// DeleteFile deletes a file from S3
func (s *S3Service) DeleteFile(ctx context.Context, fileName string) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("S3 service not initialized")
	}

	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(fileName),
	})

	if err != nil {
		return fmt.Errorf("failed to delete file from S3: %w", err)
	}

	return nil
}
