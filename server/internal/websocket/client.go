package websocket

import (
	"log"

	"github.com/gofiber/websocket/v2"
)

type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	UserID uint
	Send   chan WSMessage
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	for {
		var msg struct {
			Type     string      `json:"type"`
			TargetID uint        `json:"targetId"`
			RoomID   uint        `json:"roomId"`
			Payload  interface{} `json:"payload"`
		}
		if err := c.Conn.ReadJSON(&msg); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error for User %d: %v", c.UserID, err)
			}
			break
		}

		log.Printf("[WS] Received message from User %d: Type=%s, Target=%d, Room=%d", c.UserID, msg.Type, msg.TargetID, msg.RoomID)

		switch msg.Type {
		case "offer", "answer", "candidate", "hangup":
			c.Hub.Signal <- SignalingMessage{
				Type:     msg.Type,
				TargetID: msg.TargetID,
				Payload:  msg.Payload,
				SenderID: c.UserID,
			}
		case "room_offer", "room_answer", "room_candidate", "room_hangup":
			c.Hub.RoomSignal <- RoomSignalingMessage{
				Type:     msg.Type,
				RoomID:   msg.RoomID,
				TargetID: msg.TargetID,
				Payload:  msg.Payload,
				SenderID: c.UserID,
			}
		default:
			log.Printf("[WS] Ignored message type: %s", msg.Type)
		}
	}
}

func (c *Client) WritePump() {
	defer func() {
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteJSON(message); err != nil {
				return
			}
		}
	}
}
