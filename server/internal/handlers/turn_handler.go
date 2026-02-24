package handlers

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type TurnHandler struct {
	secret       string
	staticUser   string
	staticPass   string
	staticRealm  string
	ttl          time.Duration
}

func NewTurnHandler() *TurnHandler {
	secret := strings.TrimSpace(os.Getenv("TURN_SECRET"))
	staticUser := strings.TrimSpace(os.Getenv("TURN_USER"))
	staticPass := strings.TrimSpace(os.Getenv("TURN_PASSWORD"))
	staticRealm := strings.TrimSpace(os.Getenv("TURN_REALM"))
	return &TurnHandler{
		secret:      secret,
		staticUser:  staticUser,
		staticPass:  staticPass,
		staticRealm: staticRealm,
		ttl:         24 * time.Hour,
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
	response := TurnConfigResponse{
		IceServers: []IceServer{
			{
				Urls: "stun:stun.l.google.com:19302",
			},
		},
	}

	turnHost := strings.TrimSpace(os.Getenv("TURN_EXTERNAL_IP"))
	if turnHost == "" {
		turnHost = strings.TrimSpace(os.Getenv("TURN_HOST"))
	}
	if turnHost == "" {
		return c.JSON(response)
	}

	turnURL := fmt.Sprintf("turn:%s:%s", turnHost, "3478")

	// Static credentials support for TURN deployments configured with TURN_USER/TURN_PASSWORD.
	if h.staticUser != "" && h.staticPass != "" {
		response.IceServers = append(response.IceServers, IceServer{
			Urls:       turnURL,
			Username:   h.staticUser,
			Credential: h.staticPass,
		})
	}

	// Authenticated user ID can be injected later; keep stable label for now.
	if h.secret != "" {
		userID := "user"
		timestamp := time.Now().Add(h.ttl).Unix()
		username := fmt.Sprintf("%d:%s", timestamp, userID)

		mac := hmac.New(sha1.New, []byte(h.secret))
		mac.Write([]byte(username))
		password := base64.StdEncoding.EncodeToString(mac.Sum(nil))

		response.IceServers = append(response.IceServers, IceServer{
			Urls:       turnURL,
			Username:   username,
			Credential: password,
		})
	}

	return c.JSON(response)
}
