package websocket

import (
	"log"
	"time"

	"github.com/gofiber/websocket/v2"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024 * 1024
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
		_ = c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		return c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		var msg struct {
			Type     string      `json:"type"`
			TargetID uint        `json:"targetId"`
			RoomID   uint        `json:"roomId"`
			Payload  interface{} `json:"payload"`
		}
		if err := c.Conn.ReadJSON(&msg); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNoStatusReceived) {
				log.Printf("WebSocket unexpected close for User %d: %v", c.UserID, err)
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
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.Conn.WriteControl(
					websocket.CloseMessage,
					websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""),
					time.Now().Add(writeWait),
				)
				return
			}

			if err := c.Conn.WriteJSON(message); err != nil {
				log.Printf("[WS] WriteJSON failed for User %d: %v", c.UserID, err)
				return
			}
		case <-ticker.C:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("[WS] Ping failed for User %d: %v", c.UserID, err)
				return
			}
		}
	}
}
