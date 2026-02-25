package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/workers"
)

func main() {
	database.Connect()
	worker := workers.NewMediaPipelineWorker()
	log.Printf("[MediaWorker] boot")
	worker.Run()
}
