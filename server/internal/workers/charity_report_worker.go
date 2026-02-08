package workers

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/services"
	"time"
)

// StartCharityReportWorker starts a background worker that checks for overdue charity reports
func StartCharityReportWorker() {
	go func() {
		// Run every 24 hours (or more frequently for testing, e.g., 6 hours)
		ticker := time.NewTicker(6 * time.Hour)
		defer ticker.Stop()

		// Run immediately on start
		checkReportDeadlines()

		for range ticker.C {
			checkReportDeadlines()
		}
	}()

	log.Println("[Worker] Charity Report Worker started (interval: 6h)")
}

func checkReportDeadlines() {
	now := time.Now()
	pushService := services.GetPushService()

	// Find active projects with upcoming or passed deadlines
	var projects []models.CharityProject
	err := database.DB.
		Preload("Organization").
		Where("status = ? AND next_report_due IS NOT NULL", models.ProjectStatusActive).
		Find(&projects).Error

	if err != nil {
		log.Printf("[ReportWorker] Error fetching projects: %v", err)
		return
	}

	for _, project := range projects {
		diff := project.NextReportDue.Sub(now)
		days := int(diff.Hours() / 24)

		if days <= 0 {
			// Overdue - send warning if not already sent for this "state"
			if project.ReportWarningsSent < 3 { // Max 3 warnings for overdue
				log.Printf("[ReportWorker] Project %d report OVERDUE (due: %v)", project.ID, project.NextReportDue)
				pushService.SendCharityReportWarning(project.Organization.OwnerUserID, project.Title, 0)

				database.DB.Model(&project).Update("report_warnings_sent", project.ReportWarningsSent+1)
			}
		} else if days <= 3 {
			// Upcoming (3 days left) - send one notification
			if project.ReportWarningsSent == 0 {
				log.Printf("[ReportWorker] Project %d report due in %d days", project.ID, days)
				pushService.SendCharityReportWarning(project.Organization.OwnerUserID, project.Title, days)

				database.DB.Model(&project).Update("report_warnings_sent", 1)
			}
		}
	}
}
