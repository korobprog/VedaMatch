package websocket

import (
	"rag-agent-server/internal/models"
	"testing"
	"time"
)

type targetedTestMessage struct {
	Type          string
	SenderID      uint
	TargetUserIDs []uint
}

func (m targetedTestMessage) GetType() string      { return m.Type }
func (m targetedTestMessage) GetSenderID() uint    { return m.SenderID }
func (m targetedTestMessage) GetRecipientID() uint { return 0 }
func (m targetedTestMessage) GetRoomID() uint      { return 0 }
func (m targetedTestMessage) GetTargetUserIDs() []uint {
	return m.TargetUserIDs
}

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

func TestHubBroadcastWSTargetsOnlySelectedUsers(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	first := &Client{Hub: hub, UserID: 101, Send: make(chan WSMessage, 1)}
	second := &Client{Hub: hub, UserID: 202, Send: make(chan WSMessage, 1)}
	hub.Register <- first
	hub.Register <- second

	waitForCondition(t, time.Second, func() bool {
		hub.mu.RLock()
		defer hub.mu.RUnlock()
		return hub.clients[first.UserID] == first && hub.clients[second.UserID] == second
	}, "clients should be registered")

	hub.BroadcastWS(
		targetedTestMessage{
			Type:          "game_queue_joined",
			SenderID:      first.UserID,
			TargetUserIDs: []uint{second.UserID},
		},
	)

	select {
	case raw := <-second.Send:
		event, ok := raw.(targetedTestMessage)
		if !ok {
			t.Fatalf("expected targetedTestMessage, got %T", raw)
		}
		if event.Type != "game_queue_joined" {
			t.Fatalf("unexpected message type: %s", event.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("targeted client did not receive game event")
	}

	select {
	case <-first.Send:
		t.Fatal("non-targeted client unexpectedly received game event")
	case <-time.After(100 * time.Millisecond):
	}
}
