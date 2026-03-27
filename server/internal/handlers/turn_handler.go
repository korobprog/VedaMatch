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
	secret      string
	staticUser  string
	staticPass  string
	staticRealm string
	ttl         time.Duration
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
	return c.JSON(TurnConfigResponse{
		IceServers: h.buildIceServers(),
	})
}

func (h *TurnHandler) buildIceServers() []IceServer {
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
		return response.IceServers
	}

	turnPort := firstNonEmptyString(strings.TrimSpace(os.Getenv("TURN_PORT")), "3478")
	tlsPort := strings.TrimSpace(os.Getenv("TURN_TLS_PORT"))
	turnURLs := []string{
		fmt.Sprintf("turn:%s:%s?transport=udp", turnHost, turnPort),
		fmt.Sprintf("turn:%s:%s?transport=tcp", turnHost, turnPort),
	}
	if tlsPort != "" {
		turnURLs = append(turnURLs, fmt.Sprintf("turns:%s:%s?transport=tcp", turnHost, tlsPort))
	}

	if h.secret != "" {
		userID := "user"
		timestamp := time.Now().Add(h.ttl).Unix()
		username := fmt.Sprintf("%d:%s", timestamp, userID)

		mac := hmac.New(sha1.New, []byte(h.secret))
		mac.Write([]byte(username))
		password := base64.StdEncoding.EncodeToString(mac.Sum(nil))

		for _, turnURL := range turnURLs {
			response.IceServers = append(response.IceServers, IceServer{
				Urls:       turnURL,
				Username:   username,
				Credential: password,
			})
		}

		return response.IceServers
	}

	// Static credentials are only returned when auth-secret mode is not configured.
	if h.staticUser != "" && h.staticPass != "" {
		for _, turnURL := range turnURLs {
			response.IceServers = append(response.IceServers, IceServer{
				Urls:       turnURL,
				Username:   h.staticUser,
				Credential: h.staticPass,
			})
		}
	}

	return response.IceServers
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}
