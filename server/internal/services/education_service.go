package services

import (
	"log"
	"rag-agent-server/internal/models"
	"time"

	"gorm.io/gorm"
)

type EducationService struct {
	db *gorm.DB
}

func NewEducationService(db *gorm.DB) *EducationService {
	return &EducationService{db: db}
}

// GetCourses returns courses filtered by organization
func (s *EducationService) GetCourses(org string) ([]models.EducationCourse, error) {
	var courses []models.EducationCourse
	query := s.db.Where("is_published = ?", true)
	if org != "" {
		query = query.Where("organization = ?", org)
	}
	err := query.Preload("ScriptureBook").Find(&courses).Error
	return courses, err
}

// AdminGetCourses returns all courses (including unpublished)
func (s *EducationService) AdminGetCourses(org string) ([]models.EducationCourse, error) {
	var courses []models.EducationCourse
	query := s.db
	if org != "" {
		query = query.Where("organization = ?", org)
	}
	err := query.Preload("ScriptureBook").Find(&courses).Error
	return courses, err
}

// GetCourseDetails returns a course with its modules
func (s *EducationService) GetCourseDetails(id uint) (models.EducationCourse, error) {
	var course models.EducationCourse
	err := s.db.Preload("Modules", func(db *gorm.DB) *gorm.DB {
		return db.Order("education_modules.order ASC")
	}).First(&course, id).Error
	return course, err
}

// CreateCourse creates a new education course
func (s *EducationService) CreateCourse(course *models.EducationCourse) error {
	return s.db.Create(course).Error
}

// UpdateCourse updates an existing course
func (s *EducationService) UpdateCourse(id uint, updates map[string]interface{}) (models.EducationCourse, error) {
	var course models.EducationCourse
	if err := s.db.First(&course, id).Error; err != nil {
		return course, err
	}
	err := s.db.Model(&course).Updates(updates).Error
	return course, err
}

// CreateModule adds a module to a course
func (s *EducationService) CreateModule(module *models.EducationModule) error {
	return s.db.Create(module).Error
}

// CreateQuestion adds a question to a module
func (s *EducationService) CreateQuestion(question *models.ExamQuestion) error {
	return s.db.Create(question).Error
}

// GetModuleExams returns questions for a module
func (s *EducationService) GetModuleExams(moduleID uint) ([]models.ExamQuestion, error) {
	var questions []models.ExamQuestion
	err := s.db.Where("module_id = ?", moduleID).Preload("Options").Find(&questions).Error
	return questions, err
}

// SubmitExamAttempt processes answers and saves results
func (s *EducationService) SubmitExamAttempt(userID uint, moduleID uint, answers map[uint]uint) (models.UserExamAttempt, error) {
	var questions []models.ExamQuestion
	if err := s.db.Where("module_id = ?", moduleID).Preload("Options").Find(&questions).Error; err != nil {
		return models.UserExamAttempt{}, err
	}

	score := 0
	totalPoints := 0

	for _, q := range questions {
		totalPoints += q.Points
		selectedOptionID, ok := answers[q.ID]
		if !ok {
			continue
		}

		for _, opt := range q.Options {
			if opt.ID == selectedOptionID && opt.IsCorrect {
				score += q.Points
				break
			}
		}
	}

	// Passing threshold: 75%
	passed := false
	if totalPoints > 0 && float64(score)/float64(totalPoints) >= 0.75 {
		passed = true
	}

	attempt := models.UserExamAttempt{
		UserID:      userID,
		ModuleID:    moduleID,
		Score:       score,
		TotalPoints: totalPoints,
		Passed:      passed,
		CompletedAt: time.Now(),
	}

	if err := s.db.Create(&attempt).Error; err != nil {
		return attempt, err
	}

	// Update progress
	status := "in_progress"
	if passed {
		status = "completed"
	}

	progress := models.UserModuleProgress{
		UserID:          userID,
		ModuleID:        moduleID,
		Status:          status,
		ProgressPercent: 100, // For a module exam, completion is 100%
		LastAccessedAt:  time.Now(),
	}

	s.db.Where("user_id = ? AND module_id = ?", userID, moduleID).Assign(progress).FirstOrCreate(&progress)

	// Non-blocking tutor weak-topic signal update from exam result.
	if s.db != nil && userID != 0 {
		go func(uid, mid uint, sc, total int, isPassed bool) {
			tutorService := NewEducationTutorService(s.db)
			if err := tutorService.UpsertExamSignal(uid, mid, sc, total, isPassed); err != nil {
				log.Printf("[EducationService] tutor exam signal warning user=%d module=%d err=%v", uid, mid, err)
			}
		}(userID, moduleID, score, totalPoints, passed)
	}

	return attempt, nil
}
