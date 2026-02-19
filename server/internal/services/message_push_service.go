package services

import (
	"encoding/json"
	"fmt"
	"log"
	"rag-agent-server/internal/config"
	"rag-agent-server/internal/models"
	"strings"
	"sync"
)

type MessagePushOptions struct {
	RoomName      string
	RoomMemberIDs []uint
}

type MessagePushService struct {
	push *PushNotificationService
}

func NewMessagePushService() *MessagePushService {
	return &MessagePushService{push: GetPushService()}
}

func (s *MessagePushService) Dispatch(message models.Message, opts MessagePushOptions) {
	if s == nil || s.push == nil || !config.PushP2PEnabled() {
		return
	}

	go s.dispatch(message, opts)
}

func (s *MessagePushService) dispatch(message models.Message, opts MessagePushOptions) {
	if message.ID == 0 {
		return
	}

	if message.RoomID != 0 {
		s.sendRoomPush(message, opts)
		return
	}
	if message.RecipientID != 0 {
		s.sendP2PPush(message)
	}
}

func (s *MessagePushService) sendP2PPush(message models.Message) {
	if message.RecipientID == 0 || message.RecipientID == message.SenderID {
		return
	}

	body := strings.TrimSpace(message.Content)
	if strings.ToLower(strings.TrimSpace(message.Type)) != "text" {
		body = "Вам пришло медиа сообщение"
	} else if body == "" {
		body = "Вам пришло новое сообщение"
	}
	params, _ := json.Marshal(map[string]interface{}{
		"userId": message.SenderID,
	})

	pushMessage := PushMessage{
		Title:    "Новое сообщение",
		Body:     truncatePushBody(body, 180),
		Priority: "high",
		EventKey: fmt.Sprintf("msg:%d", message.ID),
		Data: map[string]string{
			"type":      "new_message",
			"chatType":  "p2p",
			"messageId": fmt.Sprintf("%d", message.ID),
			"senderId":  fmt.Sprintf("%d", message.SenderID),
			"screen":    "Chat",
			"params":    string(params),
		},
	}

	if err := s.push.SendToUser(message.RecipientID, pushMessage); err != nil {
		_ = GetMetricsService().Increment(MetricPushSendFail, 1)
		log.Printf("[MessagePush] p2p_push_failed message_id=%d recipient_id=%d error=%v", message.ID, message.RecipientID, err)
	}
}

func (s *MessagePushService) sendRoomPush(message models.Message, opts MessagePushOptions) {
	if message.RoomID == 0 {
		return
	}

	recipients := uniqueUsers(opts.RoomMemberIDs)
	if len(recipients) == 0 {
		return
	}

	body := strings.TrimSpace(message.Content)
	if strings.ToLower(strings.TrimSpace(message.Type)) != "text" {
		body = "Новое медиа сообщение в комнате"
	} else if body == "" {
		body = "Новое сообщение в комнате"
	}
	params, _ := json.Marshal(map[string]interface{}{
		"roomId":   message.RoomID,
		"roomName": opts.RoomName,
	})

	pushMessage := PushMessage{
		Title:    "Новое сообщение в комнате",
		Body:     truncatePushBody(body, 180),
		Priority: "high",
		EventKey: fmt.Sprintf("msg:%d", message.ID),
		Data: map[string]string{
			"type":      "room_message",
			"chatType":  "room",
			"messageId": fmt.Sprintf("%d", message.ID),
			"senderId":  fmt.Sprintf("%d", message.SenderID),
			"roomId":    fmt.Sprintf("%d", message.RoomID),
			"roomName":  opts.RoomName,
			"screen":    "RoomChat",
			"params":    string(params),
		},
	}

	for _, recipientID := range recipients {
		if recipientID == 0 || recipientID == message.SenderID {
			continue
		}
		if err := s.push.SendToUser(recipientID, pushMessage); err != nil {
			_ = GetMetricsService().Increment(MetricPushSendFail, 1)
			_ = GetMetricsService().Increment(MetricRoomPushFailTotal, 1)
			log.Printf("[MessagePush] room_push_failed room_id=%d message_id=%d actor_id=%d recipient_id=%d error=%v",
				message.RoomID, message.ID, message.SenderID, recipientID, err)
		}
	}
}

func uniqueUsers(input []uint) []uint {
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

var (
	messagePushService     *MessagePushService
	messagePushServiceOnce sync.Once
)

func GetMessagePushService() *MessagePushService {
	messagePushServiceOnce.Do(func() {
		messagePushService = NewMessagePushService()
	})
	return messagePushService
}
