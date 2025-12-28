package services

import (
	"log"
	"time"
)

type SchedulerService struct {
	ticker   *time.Ticker
	quit     chan struct{}
	running  bool
	interval int
}

var GlobalScheduler *SchedulerService

func InitScheduler() {
	GlobalScheduler = &SchedulerService{
		quit: make(chan struct{}),
	}
	log.Println("[Scheduler] Service initialized")
}

func (s *SchedulerService) Start(intervalMinutes int, task func()) {
	if s.running {
		s.Stop()
	}

	s.interval = intervalMinutes
	s.ticker = time.NewTicker(time.Duration(intervalMinutes) * time.Minute)
	s.running = true
	s.quit = make(chan struct{})

	go func() {
		// Run immediately
		task()

		for {
			select {
			case <-s.ticker.C:
				task()
			case <-s.quit:
				s.ticker.Stop()
				return
			}
		}
	}()
	log.Printf("[Scheduler] Started with interval %d minutes", intervalMinutes)
}

func (s *SchedulerService) Stop() {
	if s.running && s.ticker != nil {
		s.ticker.Stop()
		close(s.quit)
		s.running = false
		log.Println("[Scheduler] Stopped")
	}
}

func (s *SchedulerService) IsRunning() bool {
	return s.running
}
