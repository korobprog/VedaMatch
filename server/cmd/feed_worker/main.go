package main

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/workers"
)

func main() {
	database.Connect()
	worker := workers.NewFeedRebuildWorker()
	log.Printf("[FeedWorker] boot")
	worker.Run()
}
