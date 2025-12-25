package websocket

import (
	"rag-agent-server/internal/models"
	"sync"
)

type Hub struct {
	// Registered clients by UserID
	clients map[uint]*Client
	// Inbound messages from the handlers
	broadcast chan models.Message
	// Register requests from the clients
	Register chan *Client
	// Unregister requests from clients
	Unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan models.Message),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		clients:    make(map[uint]*Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			h.mu.Unlock()
		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.RLock()
			for userID, client := range h.clients {
				// Send if:
				// 1. RecipientID matches
				// 2. RoomID matches (broadcast to all, frontend filters)
				// 3. Sender is the one who sent (sync across devices)

				shouldSend := false
				if message.RecipientID != 0 {
					if userID == message.RecipientID || userID == message.SenderID {
						shouldSend = true
					}
				} else if message.RoomID != 0 {
					// Room broadcast
					shouldSend = true
				}

				if shouldSend {
					select {
					case client.Send <- message:
					default:
						// If client buffer is full, we don't want to block the hub
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(msg models.Message) {
	h.broadcast <- msg
}
