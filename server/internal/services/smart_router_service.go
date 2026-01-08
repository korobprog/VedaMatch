package services

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

type SmartRouterService struct{}

var routerInstance *SmartRouterService

func GetSmartRouterService() *SmartRouterService {
	if routerInstance == nil {
		routerInstance = &SmartRouterService{}
	}
	return routerInstance
}

func (s *SmartRouterService) SelectModels(targetCategory string, isComplexTask bool) []models.AiModel {
	var modelsToTry []models.AiModel
	intentLogPrefix := "[AutoMagic]"

	query := database.DB.Where("is_enabled = ? AND is_auto_routing_enabled = ? AND category = ?", true, true, targetCategory)

	if targetCategory == "text" {
		if isComplexTask {
			log.Printf("%s Complex intent detected. Prioritizing Gemini and 'smart' models.", intentLogPrefix)
			// Prefer Google/Gemini first, then smart, then standard, then fast
			query = query.Order("CASE WHEN provider = 'Google' THEN 0 ELSE 1 END, CASE WHEN intelligence_tier = 'smart' THEN 0 WHEN intelligence_tier = 'standard' THEN 1 ELSE 2 END, last_response_time asc")
		} else {
			log.Printf("%s Simple text intent detected. Prioritizing Gemini and 'fast' models.", intentLogPrefix)
			// Prefer Google/Gemini first, then fast, then standard, then smart
			query = query.Order("CASE WHEN provider = 'Google' THEN 0 ELSE 1 END, CASE WHEN latency_tier = 'fast' THEN 0 WHEN latency_tier = 'medium' THEN 1 ELSE 2 END, last_response_time asc")
		}
	} else {
		// For images, prioritize stable providers like PollinationsAI
		query = query.Order("CASE WHEN provider = 'PollinationsAI' THEN 0 ELSE 1 END, last_response_time asc")
	}

	// Find models to try
	err := query.Find(&modelsToTry).Error

	// Fallback for Category: If no models found for targetCategory, fallback to text
	if (err != nil || len(modelsToTry) == 0) && targetCategory != "text" {
		log.Printf("%s No models found for category '%s', falling back to 'text'", intentLogPrefix, targetCategory)
		database.DB.Where("is_enabled = ? AND is_auto_routing_enabled = ? AND category = ?", true, true, "text").
			Order("last_response_time asc").
			Find(&modelsToTry)
	}

	// Ensure we have non-Google fallbacks if Gemini keys might be exhausted
	// Add non-Google models at the end if not already present
	if targetCategory == "text" && len(modelsToTry) > 0 {
		hasNonGoogle := false
		for _, m := range modelsToTry {
			if m.Provider != "Google" && m.Provider != "" {
				hasNonGoogle = true
				break
			}
		}
		if !hasNonGoogle {
			// Add explicit non-Google fallbacks
			var nonGoogleModels []models.AiModel
			database.DB.Where("is_enabled = ? AND category = ? AND provider != ?", true, "text", "Google").
				Order("last_response_time asc").
				Limit(2).
				Find(&nonGoogleModels)
			modelsToTry = append(modelsToTry, nonGoogleModels...)
			log.Printf("%s Added %d non-Google fallback models", intentLogPrefix, len(nonGoogleModels))
		}
	}

	if len(modelsToTry) == 0 {
		log.Printf("%s No auto-routing models found at all. Defaulting to gpt-3.5-turbo", intentLogPrefix)
		modelsToTry = append(modelsToTry, models.AiModel{ModelID: "gpt-3.5-turbo", Provider: ""})
	}

	// Limit to reasonable number of attempts
	if len(modelsToTry) > 4 {
		modelsToTry = modelsToTry[:4]
	}

	return modelsToTry
}
