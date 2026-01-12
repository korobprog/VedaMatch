package websocket

import (
	"log"
	"rag-agent-server/internal/models"
	"sync"
)

type WSMessage interface {
	GetType() string
	GetSenderID() uint
	GetRecipientID() uint
	GetRoomID() uint
}

type MessageWrapper struct {
	models.Message
}

func (m MessageWrapper) GetType() string      { return "message" }
func (m MessageWrapper) GetSenderID() uint    { return m.SenderID }
func (m MessageWrapper) GetRecipientID() uint { return m.RecipientID }
func (m MessageWrapper) GetRoomID() uint      { return m.RoomID }

type TypingWrapper struct {
	models.TypingEvent
}

func (t TypingWrapper) GetType() string      { return "typing" }
func (t TypingWrapper) GetSenderID() uint    { return t.SenderID }
func (t TypingWrapper) GetRecipientID() uint { return t.RecipientID }
func (t TypingWrapper) GetRoomID() uint      { return 0 }

type Hub struct {
	clients    map[uint]*Client
	broadcast  chan WSMessage
	Signal     chan SignalingMessage // Dedicated channel for direct signaling
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan WSMessage, 256),
		Signal:     make(chan SignalingMessage, 256),
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
				shouldSend := false
				if message.GetRecipientID() != 0 {
					if userID == message.GetRecipientID() || userID == message.GetSenderID() {
						shouldSend = true
					}
				} else if message.GetRoomID() != 0 {
					shouldSend = true
				}

				if shouldSend {
					select {
					case client.Send <- message:
					default:
					}
				}
			}
			h.mu.RUnlock()
		case msg := <-h.Signal:
			log.Printf("[Hub] Signaling: %s from %d to %d", msg.Type, msg.SenderID, msg.TargetID)
			h.mu.RLock()
			if target, ok := h.clients[msg.TargetID]; ok {
				select {
				case target.Send <- msg:
					log.Printf("[Hub] Forwarded %s to User %d", msg.Type, msg.TargetID)
				default:
					log.Printf("[Hub] User %d channel full, closing", msg.TargetID)
					close(target.Send)
					delete(h.clients, msg.TargetID)
				}
			} else {
				log.Printf("[Hub] Target User %d not connected", msg.TargetID)
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(msg models.Message) {
	h.broadcast <- MessageWrapper{Message: msg}
}

func (h *Hub) BroadcastTyping(event models.TypingEvent) {
	h.broadcast <- TypingWrapper{TypingEvent: event}
}
