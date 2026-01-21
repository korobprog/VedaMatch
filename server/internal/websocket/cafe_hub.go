package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// CafeEventType represents types of cafe events
type CafeEventType string

const (
	CafeEventNewOrder       CafeEventType = "new_order"
	CafeEventOrderUpdate    CafeEventType = "order_status_update"
	CafeEventOrderCancelled CafeEventType = "order_cancelled"
	CafeEventWaiterCall     CafeEventType = "waiter_call"
	CafeEventWaiterAck      CafeEventType = "waiter_acknowledged"
	CafeEventWaiterComplete CafeEventType = "waiter_completed"
	CafeEventTableUpdate    CafeEventType = "table_update"
	CafeEventMenuUpdate     CafeEventType = "menu_update"
	CafeEventStopListUpdate CafeEventType = "stop_list_update"
	CafeEventStaffJoined    CafeEventType = "staff_joined"
	CafeEventStaffLeft      CafeEventType = "staff_left"
)

// CafeEvent represents a WebSocket event for cafe
type CafeEvent struct {
	Type      CafeEventType `json:"type"`
	CafeID    uint          `json:"cafeId"`
	Timestamp time.Time     `json:"timestamp"`
	Data      interface{}   `json:"data"`
	// For targeted events (to specific user, e.g. customer order updates)
	TargetUserID uint `json:"targetUserId,omitempty"`
}

func (e CafeEvent) GetType() string      { return string(e.Type) }
func (e CafeEvent) GetSenderID() uint    { return 0 }
func (e CafeEvent) GetRecipientID() uint { return e.TargetUserID }
func (e CafeEvent) GetRoomID() uint      { return 0 }

// CafeRoom represents a WebSocket room for a specific cafe
type CafeRoom struct {
	CafeID  uint
	Staff   map[uint]*Client // Staff members connected to this cafe
	Clients map[uint]*Client // Regular customers connected (for order updates)
	mu      sync.RWMutex
}

// CafeHub manages WebSocket connections for cafes
type CafeHub struct {
	// Map of cafe ID to room
	rooms map[uint]*CafeRoom
	// Reference to main hub for user connections
	mainHub *Hub
	// Channels
	Events chan CafeEvent
	mu     sync.RWMutex
}

// Global cafe hub instance
var cafeHub *CafeHub
var cafeHubOnce sync.Once

// GetCafeHub returns singleton instance of CafeHub
func GetCafeHub(mainHub *Hub) *CafeHub {
	cafeHubOnce.Do(func() {
		cafeHub = &CafeHub{
			rooms:   make(map[uint]*CafeRoom),
			mainHub: mainHub,
			Events:  make(chan CafeEvent, 256),
		}
		go cafeHub.Run()
	})
	return cafeHub
}

// Run processes cafe events
func (h *CafeHub) Run() {
	for event := range h.Events {
		h.processEvent(event)
	}
}

// processEvent handles a cafe event
func (h *CafeHub) processEvent(event CafeEvent) {
	log.Printf("[CafeHub] Processing event: %s for cafe %d", event.Type, event.CafeID)

	// If targeted to specific user, send directly
	if event.TargetUserID != 0 {
		h.sendToUser(event.TargetUserID, event)
		return
	}

	// Send to all staff in the cafe room
	h.mu.RLock()
	room, exists := h.rooms[event.CafeID]
	h.mu.RUnlock()

	if !exists {
		log.Printf("[CafeHub] No room for cafe %d", event.CafeID)
		return
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	// Determine recipients based on event type
	switch event.Type {
	case CafeEventNewOrder, CafeEventWaiterCall:
		// Staff-only events
		for _, client := range room.Staff {
			h.sendToClient(client, event)
		}
	case CafeEventOrderUpdate, CafeEventOrderCancelled:
		// Send to staff AND the customer who made the order
		for _, client := range room.Staff {
			h.sendToClient(client, event)
		}
		// Customer notification is handled by TargetUserID in the event
	case CafeEventMenuUpdate, CafeEventStopListUpdate:
		// Broadcast to everyone in the room (staff + customers)
		for _, client := range room.Staff {
			h.sendToClient(client, event)
		}
		for _, client := range room.Clients {
			h.sendToClient(client, event)
		}
	default:
		// Default: send to staff only
		for _, client := range room.Staff {
			h.sendToClient(client, event)
		}
	}
}

// sendToClient sends an event to a specific client
func (h *CafeHub) sendToClient(client *Client, event CafeEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("[CafeHub] Error marshaling event: %v", err)
		return
	}

	select {
	case client.Send <- RawMessage{Data: data}:
	default:
		log.Printf("[CafeHub] Client %d channel full", client.UserID)
	}
}

// sendToUser sends an event to a user via main hub
func (h *CafeHub) sendToUser(userID uint, event CafeEvent) {
	if h.mainHub == nil {
		return
	}

	h.mainHub.mu.RLock()
	client, ok := h.mainHub.clients[userID]
	h.mainHub.mu.RUnlock()

	if ok {
		h.sendToClient(client, event)
	}
}

// JoinCafeRoom adds a client to a cafe room
func (h *CafeHub) JoinCafeRoom(cafeID uint, client *Client, isStaff bool) {
	h.mu.Lock()
	room, exists := h.rooms[cafeID]
	if !exists {
		room = &CafeRoom{
			CafeID:  cafeID,
			Staff:   make(map[uint]*Client),
			Clients: make(map[uint]*Client),
		}
		h.rooms[cafeID] = room
	}
	h.mu.Unlock()

	room.mu.Lock()
	if isStaff {
		room.Staff[client.UserID] = client
		log.Printf("[CafeHub] Staff %d joined cafe %d room", client.UserID, cafeID)
	} else {
		room.Clients[client.UserID] = client
		log.Printf("[CafeHub] Client %d joined cafe %d room", client.UserID, cafeID)
	}
	room.mu.Unlock()

	// Notify staff about new staff member
	if isStaff {
		h.Events <- CafeEvent{
			Type:      CafeEventStaffJoined,
			CafeID:    cafeID,
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"userId": client.UserID,
			},
		}
	}
}

// LeaveCafeRoom removes a client from a cafe room
func (h *CafeHub) LeaveCafeRoom(cafeID uint, userID uint) {
	h.mu.RLock()
	room, exists := h.rooms[cafeID]
	h.mu.RUnlock()

	if !exists {
		return
	}

	room.mu.Lock()
	wasStaff := false
	if _, ok := room.Staff[userID]; ok {
		delete(room.Staff, userID)
		wasStaff = true
		log.Printf("[CafeHub] Staff %d left cafe %d room", userID, cafeID)
	}
	if _, ok := room.Clients[userID]; ok {
		delete(room.Clients, userID)
		log.Printf("[CafeHub] Client %d left cafe %d room", userID, cafeID)
	}
	room.mu.Unlock()

	// Notify staff about staff member leaving
	if wasStaff {
		h.Events <- CafeEvent{
			Type:      CafeEventStaffLeft,
			CafeID:    cafeID,
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"userId": userID,
			},
		}
	}

	// Clean up empty rooms
	h.mu.Lock()
	room.mu.RLock()
	if len(room.Staff) == 0 && len(room.Clients) == 0 {
		delete(h.rooms, cafeID)
		log.Printf("[CafeHub] Removed empty room for cafe %d", cafeID)
	}
	room.mu.RUnlock()
	h.mu.Unlock()
}

// GetConnectedStaff returns list of connected staff for a cafe
func (h *CafeHub) GetConnectedStaff(cafeID uint) []uint {
	h.mu.RLock()
	room, exists := h.rooms[cafeID]
	h.mu.RUnlock()

	if !exists {
		return []uint{}
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	staff := make([]uint, 0, len(room.Staff))
	for userID := range room.Staff {
		staff = append(staff, userID)
	}
	return staff
}

// GetOnlineStaffCount returns count of online staff for a cafe
func (h *CafeHub) GetOnlineStaffCount(cafeID uint) int {
	h.mu.RLock()
	room, exists := h.rooms[cafeID]
	h.mu.RUnlock()

	if !exists {
		return 0
	}

	room.mu.RLock()
	defer room.mu.RUnlock()

	return len(room.Staff)
}

// RawMessage implements WSMessage for raw JSON data
type RawMessage struct {
	Data []byte
}

func (m RawMessage) GetType() string      { return "raw" }
func (m RawMessage) GetSenderID() uint    { return 0 }
func (m RawMessage) GetRecipientID() uint { return 0 }
func (m RawMessage) GetRoomID() uint      { return 0 }

// ===== Helper functions to send cafe events =====

// NotifyNewOrder sends new order notification to cafe staff
func NotifyNewOrder(cafeID uint, orderData interface{}, customerID *uint) {
	if cafeHub == nil {
		return
	}

	event := CafeEvent{
		Type:      CafeEventNewOrder,
		CafeID:    cafeID,
		Timestamp: time.Now(),
		Data:      orderData,
	}
	cafeHub.Events <- event
}

// NotifyOrderStatusUpdate sends order status update
func NotifyOrderStatusUpdate(cafeID uint, orderID uint, status string, customerID *uint) {
	if cafeHub == nil {
		return
	}

	// Notify staff
	event := CafeEvent{
		Type:      CafeEventOrderUpdate,
		CafeID:    cafeID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"orderId": orderID,
			"status":  status,
		},
	}
	cafeHub.Events <- event

	// Notify customer if known
	if customerID != nil {
		customerEvent := CafeEvent{
			Type:         CafeEventOrderUpdate,
			CafeID:       cafeID,
			Timestamp:    time.Now(),
			TargetUserID: *customerID,
			Data: map[string]interface{}{
				"orderId": orderID,
				"status":  status,
			},
		}
		cafeHub.Events <- customerEvent
	}
}

// NotifyWaiterCall sends waiter call notification to cafe staff
func NotifyWaiterCall(cafeID uint, callData interface{}) {
	if cafeHub == nil {
		return
	}

	event := CafeEvent{
		Type:      CafeEventWaiterCall,
		CafeID:    cafeID,
		Timestamp: time.Now(),
		Data:      callData,
	}
	cafeHub.Events <- event
}

// NotifyMenuUpdate sends menu update notification
func NotifyMenuUpdate(cafeID uint, updateType string, itemID uint) {
	if cafeHub == nil {
		return
	}

	event := CafeEvent{
		Type:      CafeEventMenuUpdate,
		CafeID:    cafeID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"updateType": updateType,
			"itemId":     itemID,
		},
	}
	cafeHub.Events <- event
}

// NotifyStopListUpdate sends stop-list update notification
func NotifyStopListUpdate(cafeID uint, dishIDs []uint, isAvailable bool) {
	if cafeHub == nil {
		return
	}

	event := CafeEvent{
		Type:      CafeEventStopListUpdate,
		CafeID:    cafeID,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"dishIds":     dishIDs,
			"isAvailable": isAvailable,
		},
	}
	cafeHub.Events <- event
}
