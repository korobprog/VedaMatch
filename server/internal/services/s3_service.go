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
	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
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

		accessKey = strings.TrimSpace(accessKey)
		secretKey = strings.TrimSpace(secretKey)
		endpoint = strings.TrimSpace(endpoint)
		region = strings.TrimSpace(region)
		bucketName = strings.TrimSpace(bucketName)

		if accessKey == "" || secretKey == "" || bucketName == "" {
			log.Println("[S3] Warning: S3 credentials or bucket name not set")
			return
		}

		s3Instance = &S3Service{
			client: s3.New(s3.Options{
				Region:       region,
				Credentials:  aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
				BaseEndpoint: aws.String(endpoint),
				UsePathStyle: true,
			}),
			bucketName: bucketName,
			publicURL:  publicURL,
		}

		keyPreview := ""
		if len(accessKey) > 4 {
			keyPreview = accessKey[:4] + "***"
		}
		log.Printf("[S3] Configured: endpoint=%s, region=%s, bucket=%s, accessKey=%s", endpoint, region, bucketName, keyPreview)
	})

	return s3Instance
}

// UploadFile uploads a file to S3 and returns the public URL
func (s *S3Service) UploadFile(ctx context.Context, file io.Reader, fileName string, contentType string, contentSize int64) (string, error) {
	if s == nil || s.client == nil {
		return "", fmt.Errorf("S3 service not initialized")
	}

	putInput := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(fileName),
		Body:        file,
		ContentType: aws.String(contentType),
	}

	if contentSize > 0 {
		putInput.ContentLength = aws.Int64(contentSize)
	}

	_, err := s.client.PutObject(ctx, putInput, s3.WithAPIOptions(
		v4.SwapComputePayloadSHA256ForUnsignedPayloadMiddleware,
	))

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
