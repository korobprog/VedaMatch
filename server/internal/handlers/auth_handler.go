package handlers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	ragService *services.RAGService
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		ragService: &services.RAGService{},
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var user models.User
	if err := c.BodyParser(&user); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	// 1. Save to Database
	result := database.DB.Create(&user)
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not create user",
		})
	}

	// 2. Upload to RAG (Async to not block response? Or Sync as per requirement?)
	// Requirement: "data registration must fall into DB and from there into RAG"
	// I'll do it synchronously for now to ensure it works and return error if RAG fails (or just log it).
	// If it fails, we might still want to return success for registration but log warning.
	
	go func(u models.User) {
		err := h.ragService.UploadProfile(u)
		if err != nil {
			log.Printf("Error uploading profile to RAG for user %d: %v", u.ID, err)
		} else {
			log.Printf("Successfully uploaded profile to RAG for user %d", u.ID)
		}
	}(user)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User registered successfully",
		"user":    user,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var loginData struct {
		Email string `json:"email"`
	}

	if err := c.BodyParser(&loginData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if loginData.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email is required",
		})
	}

	// Find user by email
	var user models.User
	result := database.DB.Where("email = ?", loginData.Email).First(&user)
	if result.Error != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or user not found",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Login successful",
		"user":    user,
	})
}
