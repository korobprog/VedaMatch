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
