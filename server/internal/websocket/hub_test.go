package websocket

import (
	"rag-agent-server/internal/models"
	"testing"
	"time"
)

func waitForCondition(t *testing.T, timeout time.Duration, predicate func() bool, context string) {
	t.Helper()
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if predicate() {
			return
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("timeout while waiting: %s", context)
}

func TestHubUnregisterStaleClientKeepsActiveConnection(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	userID := uint(42)
	oldClient := &Client{Hub: hub, UserID: userID, Send: make(chan WSMessage, 1)}
	newClient := &Client{Hub: hub, UserID: userID, Send: make(chan WSMessage, 1)}

	hub.Register <- oldClient
	waitForCondition(t, time.Second, func() bool {
		hub.mu.RLock()
		defer hub.mu.RUnlock()
		return hub.clients[userID] == oldClient
	}, "old client should be registered")

	hub.Register <- newClient
	waitForCondition(t, time.Second, func() bool {
		hub.mu.RLock()
		defer hub.mu.RUnlock()
		return hub.clients[userID] == newClient
	}, "new client should replace old client")

	hub.Unregister <- oldClient
	waitForCondition(t, time.Second, func() bool {
		hub.mu.RLock()
		defer hub.mu.RUnlock()
		return hub.clients[userID] == newClient
	}, "stale unregister must not remove active client")

	hub.Broadcast(models.Message{
		SenderID:    7,
		RecipientID: userID,
		Content:     "hello",
		Type:        "text",
	})

	select {
	case <-newClient.Send:
	case <-time.After(time.Second):
		t.Fatal("active client did not receive broadcast after stale unregister")
	}
}
