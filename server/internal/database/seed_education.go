package database

import (
	"log"
	"rag-agent-server/internal/models"
)

// SeedEducation populates initial courses and questions
func SeedEducation() {
	var count int64
	DB.Model(&models.EducationCourse{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("[Seed] Seeding Education platform...")

	// 1. Get Bhagavad-gita book reference
	var bg models.ScriptureBook
	DB.Where("code = ?", "bg").First(&bg)

	// 2. Create ISKCON Bhakti Sastri Course
	course := models.EducationCourse{
		Title:        "Бхакти Шастри: Бхагавад-гита",
		Description:  "Углубленное изучение Бхагавад-гиты как она есть для получения степени Бхакти Шастри.",
		Organization: "ISKCON",
		IsPublished:  true,
	}
	if bg.ID != 0 {
		course.ScriptureBookID = &bg.ID
	}
	DB.Create(&course)

	// 3. Create Module 1: Introduction & Chapter 1-2
	module := models.EducationModule{
		CourseID:    course.ID,
		Title:       "Введение и Обзор глав 1-2",
		Description: "Основы ведического знания и природа души.",
		Order:       1,
	}
	DB.Create(&module)

	// 4. Create Questions for Module 1
	questions := []models.ExamQuestion{
		{
			ModuleID:     module.ID,
			Text:         "Кто является автором Бхагавад-гиты согласно традиции?",
			Type:         "multiple_choice",
			Organization: "ISKCON",
			Points:       1,
			Options: []models.AnswerOption{
				{Text: "Шрила Вьясадева", IsCorrect: true, Explanation: "Вьясадева записал Веды и Пураны."},
				{Text: "Господь Кришна", IsCorrect: false, Explanation: "Кришна — рассказчик Гиты."},
				{Text: "Шрила Прабхупада", IsCorrect: false},
				{Text: "Арджуна", IsCorrect: false},
			},
		},
		{
			ModuleID:     module.ID,
			Text:         "Согласно Бхагавад-гите (2.13), что происходит с душой в момент смерти?",
			Type:         "multiple_choice",
			Organization: "ISKCON",
			VerseReference: "bg.2.13",
			Points:       1,
			Options: []models.AnswerOption{
				{Text: "Она прекращает свое существование", IsCorrect: false},
				{Text: "Она переходит в другое тело", IsCorrect: true, Explanation: "Как душа переходит из детского тела в юношеское, так и в момент смерти она переходит в новое тело."},
				{Text: "Она вечно спит", IsCorrect: false},
				{Text: "Она сливается с Брахманом", IsCorrect: false},
			},
		},
		{
			ModuleID:     module.ID,
			Text:         "Какое из перечисленного НЕ является признаком души (атмы)?",
			Type:         "multiple_choice",
			Organization: "ISKCON",
			Points:       1,
			Options: []models.AnswerOption{
				{Text: "Несокрушимость", IsCorrect: false},
				{Text: "Вечность", IsCorrect: false},
				{Text: "Подверженность изменениям", IsCorrect: true, Explanation: "Душа неизменна, в отличие от материального тела."},
				{Text: "Индивидуальность", IsCorrect: false},
			},
		},
	}

	for i := range questions {
		DB.Create(&questions[i])
	}

	log.Printf("[Seed] Seeded education course: %s", course.Title)
}
