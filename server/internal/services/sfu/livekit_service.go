package sfu

import (
	"encoding/json"
	"fmt"
	"rag-agent-server/internal/config"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type LiveKitService struct {
	cfg config.SFUConfig
}

type IssueTokenInput struct {
	UserID          uint
	RoomID          uint
	Role            string
	ParticipantName string
	Metadata        map[string]interface{}
}

type TokenResult struct {
	Token               string `json:"token"`
	WSURL               string `json:"wsUrl"`
	RoomName            string `json:"roomName"`
	ParticipantIdentity string `json:"participantIdentity"`
}

func NewLiveKitService(cfg config.SFUConfig) *LiveKitService {
	return &LiveKitService{cfg: cfg}
}

func (s *LiveKitService) BuildRoomName(roomID uint) string {
	return fmt.Sprintf("room-%d", roomID)
}

func (s *LiveKitService) BuildParticipantIdentity(userID uint) string {
	return fmt.Sprintf("user-%d", userID)
}

func (s *LiveKitService) IssueRoomToken(input IssueTokenInput) (*TokenResult, error) {
	if err := s.cfg.ValidateForTokenIssue(); err != nil {
		return nil, err
	}
	if input.UserID == 0 || input.RoomID == 0 {
		return nil, fmt.Errorf("invalid_room_or_user")
	}

	now := time.Now().UTC()
	roomName := s.BuildRoomName(input.RoomID)
	participantIdentity := s.BuildParticipantIdentity(input.UserID)
	participantName := strings.TrimSpace(input.ParticipantName)
	if participantName == "" {
		participantName = participantIdentity
	}

	metadata := map[string]interface{}{
		"role":   strings.TrimSpace(strings.ToLower(input.Role)),
		"roomId": input.RoomID,
	}
	for key, value := range input.Metadata {
		metadata[key] = value
	}
	metadataJSON, _ := json.Marshal(metadata)

	claims := jwt.MapClaims{
		"iss":      s.cfg.LiveKitAPIKey,
		"sub":      participantIdentity,
		"nbf":      now.Unix(),
		"iat":      now.Unix(),
		"exp":      now.Add(s.cfg.RoomTokenTTL).Unix(),
		"name":     participantName,
		"metadata": string(metadataJSON),
		"video": map[string]interface{}{
			"roomJoin":       true,
			"room":           roomName,
			"canPublish":     true,
			"canSubscribe":   true,
			"canPublishData": true,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString([]byte(s.cfg.LiveKitAPISecret))
	if err != nil {
		return nil, fmt.Errorf("issue_room_token_failed: %w", err)
	}

	return &TokenResult{
		Token:               signedToken,
		WSURL:               s.cfg.LiveKitWSURL,
		RoomName:            roomName,
		ParticipantIdentity: participantIdentity,
	}, nil
}
