package handlers

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
)

type TurnHandler struct {
	secret string
	ttl    time.Duration
}

func NewTurnHandler() *TurnHandler {
	secret := os.Getenv("TURN_SECRET")
	if secret == "" {
		secret = "krishna1284radharamat145698uhgg" // Default fallback matching docker-compose
	}
	return &TurnHandler{
		secret: secret,
		ttl:    24 * time.Hour,
	}
}

type IceServer struct {
	Urls       string `json:"urls"`
	Username   string `json:"username,omitempty"`
	Credential string `json:"credential,omitempty"`
}

type TurnConfigResponse struct {
	IceServers []IceServer `json:"iceServers"`
}

func (h *TurnHandler) GetTurnCredentials(c *fiber.Ctx) error {
	// Authenticated user ID (assuming middleware sets this)
	// For now, we can use a generic label or the actual user ID if available
	userID := "user"

	// Create timestamp
	timestamp := time.Now().Add(h.ttl).Unix()

	username := fmt.Sprintf("%d:%s", timestamp, userID)

	// Generate HMAC-SHA1 signature
	mac := hmac.New(sha1.New, []byte(h.secret))
	mac.Write([]byte(username))
	password := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	// Determine Host. In prod it should be the public domain/IP.
	// For local dev with Android Emulator, '10.0.2.2' is host, but 'localhost' for web.
	// We'll trust the env or default to localhost for now.
	turnHost := os.Getenv("TURN_HOST")
	if turnHost == "" {
		turnHost = os.Getenv("TURN_EXTERNAL_IP")
	}
	if turnHost == "" {
		turnHost = "127.0.0.1"
	}
	turnPort := "3478"

	response := TurnConfigResponse{
		IceServers: []IceServer{
			{
				Urls: "stun:stun.l.google.com:19302",
			},
			{
				Urls:       fmt.Sprintf("turn:%s:%s", turnHost, turnPort),
				Username:   username,
				Credential: password,
			},
		},
	}

	return c.JSON(response)
}
