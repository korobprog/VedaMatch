package services

import (
	"log"
	"sync"
	"time"
)

type scheduledTask struct {
	ticker *time.Ticker
	quit   chan struct{}
}

type SchedulerService struct {
	tasks map[string]*scheduledTask
	mu    sync.RWMutex
}

var GlobalScheduler *SchedulerService

func InitScheduler() {
	GlobalScheduler = &SchedulerService{
		tasks: make(map[string]*scheduledTask),
	}
	log.Println("[Scheduler] Service initialized")
}

func (s *SchedulerService) RegisterTask(name string, intervalMinutes int, task func()) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Stop existing if any
	if existing, ok := s.tasks[name]; ok {
		existing.ticker.Stop()
		close(existing.quit)
		delete(s.tasks, name)
	}

	quit := make(chan struct{})
	ticker := time.NewTicker(time.Duration(intervalMinutes) * time.Minute)

	s.tasks[name] = &scheduledTask{
		ticker: ticker,
		quit:   quit,
	}

	go func() {
		// Run immediately first time
		task()

		for {
			select {
			case <-ticker.C:
				task()
			case <-quit:
				return
			}
		}
	}()
	log.Printf("[Scheduler] Registered task '%s' every %d minutes", name, intervalMinutes)
}

func (s *SchedulerService) UnregisterTask(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.tasks[name]; ok {
		existing.ticker.Stop()
		close(existing.quit)
		delete(s.tasks, name)
		log.Printf("[Scheduler] Unregistered task '%s'", name)
	}
}

// Start is legacy support for single task, mapping to 'default'
func (s *SchedulerService) Start(intervalMinutes int, task func()) {
	s.RegisterTask("default", intervalMinutes, task)
}

// Stop is legacy support
func (s *SchedulerService) Stop() {
	s.UnregisterTask("default")
}

func (s *SchedulerService) IsRunning() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.tasks["default"]
	return ok
}
