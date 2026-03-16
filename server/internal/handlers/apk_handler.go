package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type ApkHandler struct {
	s3Service *services.S3Service
}

type UploadApkResponse struct {
	Success  bool   `json:"success"`
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	Version  string `json:"version"`
}

type ApkFileInfo struct {
	Filename   string `json:"filename"`
	URL        string `json:"url"`
	Size       int64  `json:"size"`
	UploadedAt string `json:"uploadedAt"`
	Version    string `json:"version"`
}

type ListApkResponse struct {
	Success bool         `json:"success"`
	Files   []ApkFileInfo `json:"files"`
}

type DeleteApkResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

func NewApkHandler() *ApkHandler {
	return &ApkHandler{
		s3Service: services.GetS3Service(),
	}
}

// UploadApk godoc
// @Summary Upload APK file to S3
// @Tags Admin
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "APK file to upload"
// @Success 200 {object} UploadApkResponse
// @Router /api/admin/apk/upload [post]
func (h *ApkHandler) UploadApk(c *fiber.Ctx) error {
	// Parse multipart form (max 200MB)
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse form",
		})
	}

	files := form.File["file"]
	if len(files) == 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded",
		})
	}

	file := files[0]

	// Validate file extension
	if !strings.HasSuffix(strings.ToLower(file.Filename), ".apk") {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Only APK files are allowed",
		})
	}

	// Validate file size (max 200MB)
	if file.Size > 200*1024*1024 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "File size exceeds 200MB limit",
		})
	}

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open file",
		})
	}
	defer src.Close()

	// Create temporary file
	tmpFile, err := os.CreateTemp("", "apk-upload-*.apk")
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create temp file",
		})
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	// Copy to temp file
	_, err = io.Copy(tmpFile, src)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to save file",
		})
	}

	// Generate S3 filename with version and timestamp
	// Extract version from filename if present (e.g., app-release-v1.1.29.apk)
	version := extractVersion(file.Filename)
	if version == "" {
		version = "1.0.0"
	}
	
	timestamp := time.Now().Format("20060102-150405")
	s3Filename := fmt.Sprintf("ragagent-release-v%s-%s.apk", version, timestamp)
	s3Key := filepath.Join("downloads/android", s3Filename)

	// Upload to S3
	ctx := c.Context()
	err = h.s3Service.UploadLocalFile(ctx, tmpFile.Name(), s3Key, "application/vnd.android.package-archive")
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to upload to S3: %v", err),
		})
	}

	// Get public URL
	publicURL := h.s3Service.GetPublicURL(s3Key)

	return c.Status(http.StatusOK).JSON(UploadApkResponse{
		Success:  true,
		URL:      publicURL,
		Filename: s3Filename,
		Size:     file.Size,
		Version:  version,
	})
}

// DeleteApk godoc
// @Summary Delete APK file from S3
// @Tags Admin
// @Produce json
// @Param filename path string true "Filename to delete"
// @Success 200 {object} DeleteApkResponse
// @Router /api/admin/apk/:filename [delete]
func (h *ApkHandler) DeleteApk(c *fiber.Ctx) error {
	filename := c.Params("filename")
	if filename == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Filename is required",
		})
	}

	s3Key := filepath.Join("downloads/android", filename)

	ctx := c.Context()
	err := h.s3Service.DeleteFile(ctx, s3Key)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to delete file: %v", err),
		})
	}

	return c.Status(http.StatusOK).JSON(DeleteApkResponse{
		Success: true,
		Message: "File deleted successfully",
	})
}

// ListApk godoc
// @Summary List all APK files
// @Tags Admin
// @Produce json
// @Success 200 {object} ListApkResponse
// @Router /api/admin/apk/list [get]
func (h *ApkHandler) ListApk(c *fiber.Ctx) error {
	ctx := c.Context()
	
	// List objects in S3 downloads/android folder
	objects, err := h.s3Service.ListFiles(ctx, "downloads/android/")
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to list files: %v", err),
		})
	}

	// Filter only .apk files
	files := make([]ApkFileInfo, 0)
	for _, obj := range objects {
		if strings.HasSuffix(strings.ToLower(obj.Key), ".apk") {
			version := extractVersion(obj.Key)
			files = append(files, ApkFileInfo{
				Filename:   filepath.Base(obj.Key),
				URL:        obj.URL,
				Size:       obj.Size,
				UploadedAt: time.Now().Format(time.RFC3339), // S3 ListFiles doesn't return LastModified
				Version:    version,
			})
		}
	}

	return c.Status(http.StatusOK).JSON(ListApkResponse{
		Success: true,
		Files:   files,
	})
}

// extractVersion tries to extract version from filename
// e.g., "ragagent-release-v1.1.29-build31.apk" -> "1.1.29"
func extractVersion(filename string) string {
	// Try to find version pattern v{major}.{minor}.{patch}
	start := strings.Index(filename, "v")
	if start == -1 {
		return ""
	}

	// Extract substring starting from 'v'
	remaining := filename[start:]
	
	// Find end of version (before '-' or '.' after the third number or '.apk')
	parts := strings.Split(remaining, "-")
	if len(parts) > 0 {
		versionPart := parts[0]
		// Remove .apk if present
		versionPart = strings.TrimSuffix(versionPart, ".apk")
		// Validate it looks like a version
		if strings.Count(versionPart, ".") >= 2 {
			return versionPart[1:] // Remove leading 'v'
		}
	}

	return ""
}
