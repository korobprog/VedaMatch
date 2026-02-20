package workers

import (
	"log"
	"rag-agent-server/internal/services"
)

// StartYatraBillingWorker runs daily billing cycle for published yatras.
func StartYatraBillingWorker() {
	if services.GlobalScheduler == nil {
		return
	}
	services.GlobalScheduler.RegisterTask("yatra_billing_worker", 15, func() {
		services.RunYatraBillingWorkerCycle()
	})
	log.Println("[Worker] Yatra Billing Worker started (interval: 15m)")
}
