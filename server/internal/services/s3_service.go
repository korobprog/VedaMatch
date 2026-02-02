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

// NewS3Service returns the S3 service instance (alias for GetS3Service)
func NewS3Service() *S3Service {
	return GetS3Service()
}

// UploadFileFromReader uploads a file from an io.Reader to S3
func (s *S3Service) UploadFileFromReader(ctx context.Context, reader io.Reader, fileName string, contentType string) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("S3 service not initialized")
	}

	putInput := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucketName),
		Key:         aws.String(fileName),
		Body:        reader,
		ContentType: aws.String(contentType),
	}

	_, err := s.client.PutObject(ctx, putInput, s3.WithAPIOptions(
		v4.SwapComputePayloadSHA256ForUnsignedPayloadMiddleware,
	))

	if err != nil {
		return fmt.Errorf("failed to upload file to S3: %w", err)
	}

	return nil
}

// UploadLocalFile uploads a local file to S3
func (s *S3Service) UploadLocalFile(ctx context.Context, localPath, s3Path, contentType string) error {
	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open local file: %w", err)
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to stat file: %w", err)
	}

	_, err = s.UploadFile(ctx, file, s3Path, contentType, stat.Size())
	return err
}

// DownloadFile downloads a file from S3 to local path
func (s *S3Service) DownloadFile(ctx context.Context, s3Path, localPath string) error {
	if s == nil || s.client == nil {
		return fmt.Errorf("S3 service not initialized")
	}

	result, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucketName),
		Key:    aws.String(s3Path),
	})
	if err != nil {
		return fmt.Errorf("failed to get object from S3: %w", err)
	}
	defer result.Body.Close()

	// Create local file
	outFile, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %w", err)
	}
	defer outFile.Close()

	_, err = io.Copy(outFile, result.Body)
	if err != nil {
		return fmt.Errorf("failed to write file: %w", err)
	}

	return nil
}

// GetPublicURL returns the public URL for an S3 path
func (s *S3Service) GetPublicURL(s3Path string) string {
	if s == nil {
		return ""
	}
	return fmt.Sprintf("%s/%s", s.publicURL, s3Path)
}

// ExtractS3Path extracts the S3 path from a public URL
func (s *S3Service) ExtractS3Path(publicURL string) string {
	if s == nil || s.publicURL == "" {
		return publicURL
	}
	return strings.TrimPrefix(publicURL, s.publicURL+"/")
}

// S3ListItem represents a file in S3
type S3ListItem struct {
	Key  string
	URL  string
	Size int64
}

// ListFiles lists files in S3 with a given prefix
func (s *S3Service) ListFiles(ctx context.Context, prefix string) ([]S3ListItem, error) {
	if s == nil || s.client == nil {
		return nil, fmt.Errorf("S3 service not initialized")
	}

	var items []S3ListItem

	paginator := s3.NewListObjectsV2Paginator(s.client, &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucketName),
		Prefix: aws.String(prefix),
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to list S3 objects: %w", err)
		}

		for _, obj := range page.Contents {
			items = append(items, S3ListItem{
				Key:  *obj.Key,
				URL:  fmt.Sprintf("%s/%s", s.publicURL, *obj.Key),
				Size: *obj.Size,
			})
		}
	}

	return items, nil
}
