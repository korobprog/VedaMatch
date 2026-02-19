package websocket

// SignalingMessage represents a WebRTC signaling message
type SignalingMessage struct {
	Type     string      `json:"type"`     // "offer", "answer", "candidate", "hangup"
	TargetID uint        `json:"targetId"` // The recipient user ID
	Payload  interface{} `json:"payload"`  // SDP or Candidate data
	SenderID uint        `json:"senderId"` // The sender user ID (injected by server)
}

// Implement WSMessage interface
func (s SignalingMessage) GetType() string      { return s.Type }
func (s SignalingMessage) GetSenderID() uint    { return s.SenderID }
func (s SignalingMessage) GetRecipientID() uint { return s.TargetID }
func (s SignalingMessage) GetRoomID() uint      { return 0 }
func (s SignalingMessage) GetTargetUserIDs() []uint {
	if s.TargetID == 0 {
		return nil
	}
	return []uint{s.TargetID}
}

// RoomSignalingMessage represents room-scoped WebRTC signaling.
// It supports direct target relay within a room and optional room broadcast.
type RoomSignalingMessage struct {
	Type     string      `json:"type"`               // "room_offer", "room_answer", "room_candidate", "room_hangup"
	RoomID   uint        `json:"roomId"`             // Room scope
	TargetID uint        `json:"targetId,omitempty"` // Optional recipient user ID in the room
	Payload  interface{} `json:"payload"`            // SDP or Candidate data
	SenderID uint        `json:"senderId"`           // Sender user ID (injected by server)
}

func (s RoomSignalingMessage) GetType() string      { return s.Type }
func (s RoomSignalingMessage) GetSenderID() uint    { return s.SenderID }
func (s RoomSignalingMessage) GetRecipientID() uint { return s.TargetID }
func (s RoomSignalingMessage) GetRoomID() uint      { return s.RoomID }
func (s RoomSignalingMessage) GetTargetUserIDs() []uint {
	if s.TargetID == 0 {
		return nil
	}
	return []uint{s.TargetID}
}
