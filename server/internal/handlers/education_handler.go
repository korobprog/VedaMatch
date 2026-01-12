package handlers

import (
	"rag-agent-server/internal/middleware"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type EducationHandler struct {
	service *services.EducationService
}

func NewEducationHandler(service *services.EducationService) *EducationHandler {
	return &EducationHandler{service: service}
}

// GetCourses returns courses filtered by user's organization or query
func (h *EducationHandler) GetCourses(c *fiber.Ctx) error {
	org := c.Query("organization")
	courses, err := h.service.GetCourses(org)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch courses"})
	}
	return c.JSON(courses)
}

// AdminGetCourses returns all courses for admin
func (h *EducationHandler) AdminGetCourses(c *fiber.Ctx) error {
	org := c.Query("organization")
	courses, err := h.service.AdminGetCourses(org)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch courses"})
	}
	return c.JSON(courses)
}

// GetCourseDetails returns course with modules
func (h *EducationHandler) GetCourseDetails(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	course, err := h.service.GetCourseDetails(uint(id))
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Course not found"})
	}
	return c.JSON(course)
}

// CreateCourse creates a new course
func (h *EducationHandler) CreateCourse(c *fiber.Ctx) error {
	var course models.EducationCourse
	if err := c.BodyParser(&course); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.CreateCourse(&course); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create course"})
	}

	return c.JSON(course)
}

// UpdateCourse updates a course
func (h *EducationHandler) UpdateCourse(c *fiber.Ctx) error {
	id, _ := strconv.Atoi(c.Params("id"))
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	course, err := h.service.UpdateCourse(uint(id), updates)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update course"})
	}

	return c.JSON(course)
}

// CreateModule adds a module to a course
func (h *EducationHandler) CreateModule(c *fiber.Ctx) error {
	var module models.EducationModule
	if err := c.BodyParser(&module); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.CreateModule(&module); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create module"})
	}

	return c.JSON(module)
}

// CreateQuestion adds a question to a module
func (h *EducationHandler) CreateQuestion(c *fiber.Ctx) error {
	var question models.ExamQuestion
	if err := c.BodyParser(&question); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := h.service.CreateQuestion(&question); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to create question"})
	}

	return c.JSON(question)
}

// GetModuleExams returns questions for a module
func (h *EducationHandler) GetModuleExams(c *fiber.Ctx) error {
	moduleID, _ := strconv.Atoi(c.Params("moduleId"))
	questions, err := h.service.GetModuleExams(uint(moduleID))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch exam questions"})
	}
	return c.JSON(questions)
}

type SubmitExamRequest struct {
	Answers map[string]uint `json:"answers"` // QuestionID -> OptionID
}

// SubmitExam processes the exam
func (h *EducationHandler) SubmitExam(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	moduleID, _ := strconv.Atoi(c.Params("moduleId"))
	
	var req SubmitExamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Convert string keys back to uint
	answers := make(map[uint]uint)
	for k, v := range req.Answers {
		id, _ := strconv.Atoi(k)
		answers[uint(id)] = v
	}

	attempt, err := h.service.SubmitExamAttempt(userID, uint(moduleID), answers)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to process exam"})
	}

	return c.JSON(attempt)
}