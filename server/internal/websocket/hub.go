package websocket

import (
	"log"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
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
	clients    map[uint]*Client
	broadcast  chan WSMessage
	Signal     chan SignalingMessage // Dedicated channel for direct signaling
	RoomSignal chan RoomSignalingMessage
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
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
		return
	}

	if msg.TargetID != 0 {
		if !isRoomMember(msg.RoomID, msg.TargetID) {
			log.Printf("[Hub] Room signaling rejected: target %d is not member of room %d", msg.TargetID, msg.RoomID)
			return
		}
		h.mu.RLock()
		target, ok := h.clients[msg.TargetID]
		h.mu.RUnlock()
		if !ok {
			log.Printf("[Hub] Room target user %d not connected", msg.TargetID)
			return
		}
		select {
		case target.Send <- msg:
		default:
			log.Printf("[Hub] Room signaling drop: target %d channel full", msg.TargetID)
		}
		return
	}

	memberIDs, err := getRoomMemberIDs(msg.RoomID)
	if err != nil {
		log.Printf("[Hub] Room signaling member lookup failed room=%d: %v", msg.RoomID, err)
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
