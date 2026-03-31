package websocket

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"rag-agent-server/internal/observability"
	"sync"
)

type WSMessage interface {
	GetType() string
	GetSenderID() uint
	GetRecipientID() uint
	GetRoomID() uint
	GetTargetUserIDs() []uint
}

type MessageWrapper struct {
	models.Message
	TargetUserIDs []uint
}

func (m MessageWrapper) GetType() string      { return "message" }
func (m MessageWrapper) GetSenderID() uint    { return m.SenderID }
func (m MessageWrapper) GetRecipientID() uint { return m.RecipientID }
func (m MessageWrapper) GetRoomID() uint      { return m.RoomID }
func (m MessageWrapper) GetTargetUserIDs() []uint {
	return m.TargetUserIDs
}

type TypingWrapper struct {
	models.TypingEvent
}

func (t TypingWrapper) GetType() string      { return "typing" }
func (t TypingWrapper) GetSenderID() uint    { return t.SenderID }
func (t TypingWrapper) GetRecipientID() uint { return t.RecipientID }
func (t TypingWrapper) GetRoomID() uint      { return 0 }
func (t TypingWrapper) GetTargetUserIDs() []uint {
	return nil
}

type Hub struct {
	clients               map[uint]*Client
	broadcast             chan WSMessage
	Signal                chan SignalingMessage // Dedicated channel for direct signaling
	RoomSignal            chan RoomSignalingMessage
	Register              chan *Client
	Unregister            chan *Client
	mu                    sync.RWMutex
	signalFallbackHandler func(SignalingMessage)
}

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan WSMessage, 256),
		Signal:     make(chan SignalingMessage, 256),
		RoomSignal: make(chan RoomSignalingMessage, 256),
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
			if existing, ok := h.clients[client.UserID]; ok && existing != client {
				// Replace stale connection for the same user and release writer loop.
				log.Printf("[Hub] User %d reconnecting, closing old connection", client.UserID)
				close(existing.Send)
			}
			h.clients[client.UserID] = client
			log.Printf("[Hub] User %d connected, total clients: %d", client.UserID, len(h.clients))
			h.mu.Unlock()
		case client := <-h.Unregister:
			h.mu.Lock()
			if current, ok := h.clients[client.UserID]; ok && current == client {
				delete(h.clients, client.UserID)
				log.Printf("[Hub] User %d disconnected, total clients: %d", client.UserID, len(h.clients))
				close(client.Send)
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.RLock()
			targetUserIDs := message.GetTargetUserIDs()
			if len(targetUserIDs) > 0 {
				for _, userID := range targetUserIDs {
					client, ok := h.clients[userID]
					if !ok {
						continue
					}
					select {
					case client.Send <- message:
					default:
					}
				}
				h.mu.RUnlock()
				continue
			}

			for userID, client := range h.clients {
				shouldSend := false
				if message.GetRecipientID() != 0 {
					if userID == message.GetRecipientID() || userID == message.GetSenderID() {
						shouldSend = true
					}
				} else if message.GetRoomID() != 0 {
					shouldSend = false
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
			target, ok := h.clients[msg.TargetID]
			h.mu.RUnlock()
			if ok {
				select {
				case target.Send <- msg:
					log.Printf("[Hub] Forwarded %s to User %d", msg.Type, msg.TargetID)
				default:
					log.Printf("[Hub] User %d channel full, closing", msg.TargetID)
					observability.ObserveRealtimeCallEvent("signaling", msg.Type, "dropped_channel_full", "warning", "p2p", "server", "unknown")
					h.mu.Lock()
					currentTarget, stillExists := h.clients[msg.TargetID]
					if stillExists && currentTarget == target {
						delete(h.clients, msg.TargetID)
						close(currentTarget.Send)
					}
					h.mu.Unlock()
					if msg.Type == "offer" {
						h.triggerSignalFallback(msg)
					}
				}
			} else {
				log.Printf("[Hub] Target User %d not connected", msg.TargetID)
				observability.ObserveRealtimeCallEvent("signaling", msg.Type, "target_offline", "warning", "p2p", "server", "unknown")
				if msg.Type == "offer" {
					h.triggerSignalFallback(msg)
				}
			}
		case msg := <-h.RoomSignal:
			h.handleRoomSignaling(msg)
		}
	}
}

func (h *Hub) handleRoomSignaling(msg RoomSignalingMessage) {
	if msg.RoomID == 0 || msg.SenderID == 0 {
		return
	}

	if !isRoomMember(msg.RoomID, msg.SenderID) {
		log.Printf("[Hub] Room signaling rejected: sender %d is not member of room %d", msg.SenderID, msg.RoomID)
		observability.ObserveRealtimeCallEvent("signaling", msg.Type, "sender_not_member", "warning", "room", "server", "unknown")
		return
	}

	if msg.TargetID != 0 {
		if !isRoomMember(msg.RoomID, msg.TargetID) {
			log.Printf("[Hub] Room signaling rejected: target %d is not member of room %d", msg.TargetID, msg.RoomID)
			observability.ObserveRealtimeCallEvent("signaling", msg.Type, "target_not_member", "warning", "room", "server", "unknown")
			return
		}
		h.mu.RLock()
		target, ok := h.clients[msg.TargetID]
		h.mu.RUnlock()
		if !ok {
			log.Printf("[Hub] Room target user %d not connected", msg.TargetID)
			observability.ObserveRealtimeCallEvent("signaling", msg.Type, "target_offline", "warning", "room", "server", "unknown")
			return
		}
		select {
		case target.Send <- msg:
		default:
			log.Printf("[Hub] Room signaling drop: target %d channel full", msg.TargetID)
			observability.ObserveRealtimeCallEvent("signaling", msg.Type, "dropped_channel_full", "warning", "room", "server", "unknown")
		}
		return
	}

	memberIDs, err := getRoomMemberIDs(msg.RoomID)
	if err != nil {
		log.Printf("[Hub] Room signaling member lookup failed room=%d: %v", msg.RoomID, err)
		observability.ObserveRealtimeCallEvent("signaling", msg.Type, "member_lookup_failed", "error", "room", "server", "unknown")
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, memberID := range memberIDs {
		if memberID == msg.SenderID {
			continue
		}
		client, ok := h.clients[memberID]
		if !ok {
			continue
		}
		select {
		case client.Send <- msg:
		default:
		}
	}
}

func isRoomMember(roomID uint, userID uint) bool {
	var count int64
	if err := database.DB.Model(&models.RoomMember{}).
		Where("room_id = ? AND user_id = ?", roomID, userID).
		Count(&count).Error; err != nil {
		log.Printf("[Hub] room membership check failed room=%d user=%d: %v", roomID, userID, err)
		return false
	}
	return count > 0
}

func getRoomMemberIDs(roomID uint) ([]uint, error) {
	var members []models.RoomMember
	if err := database.DB.Model(&models.RoomMember{}).
		Where("room_id = ?", roomID).
		Find(&members).Error; err != nil {
		return nil, err
	}

	result := make([]uint, 0, len(members))
	for _, member := range members {
		if member.UserID == 0 {
			continue
		}
		result = append(result, member.UserID)
	}
	return uniqueTargetUsers(result), nil
}

func (h *Hub) Broadcast(msg models.Message, targetUserIDs ...uint) {
	h.broadcast <- MessageWrapper{
		Message:       msg,
		TargetUserIDs: uniqueTargetUsers(targetUserIDs),
	}
}

func (h *Hub) BroadcastTyping(event models.TypingEvent) {
	h.broadcast <- TypingWrapper{TypingEvent: event}
}

func (h *Hub) BroadcastConversationUpdated(event ConversationUpdatedEvent) {
	event.Type = "conversation_updated"
	h.broadcast <- event
}

func (h *Hub) BroadcastWS(message WSMessage) {
	if message == nil {
		return
	}
	h.broadcast <- message
}

func (h *Hub) BroadcastMessageRead(event MessageReadEvent) {
	event.Type = "message_read"
	h.broadcast <- event
}

func (h *Hub) SetSignalFallbackHandler(handler func(SignalingMessage)) {
	h.mu.Lock()
	h.signalFallbackHandler = handler
	h.mu.Unlock()
}

func (h *Hub) triggerSignalFallback(msg SignalingMessage) {
	h.mu.RLock()
	handler := h.signalFallbackHandler
	h.mu.RUnlock()
	if handler == nil {
		return
	}
	observability.ObserveRealtimeCallEvent("signaling", msg.Type, "fallback_triggered", "info", "p2p", "server", "unknown")
	go handler(msg)
}

func uniqueTargetUsers(input []uint) []uint {
	if len(input) == 0 {
		return nil
	}
	seen := make(map[uint]struct{}, len(input))
	result := make([]uint, 0, len(input))
	for _, userID := range input {
		if userID == 0 {
			continue
		}
		if _, ok := seen[userID]; ok {
			continue
		}
		seen[userID] = struct{}{}
		result = append(result, userID)
	}
	return result
}
