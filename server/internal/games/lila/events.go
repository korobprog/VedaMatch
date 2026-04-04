package lila

import "time"

type EventType string

const (
	EventMatchSnapshot     EventType = "game_match_snapshot"
	EventMatchStateChanged EventType = "game_match_state_changed"
	EventQueueJoined       EventType = "game_queue_joined"
	EventQueueLeft         EventType = "game_queue_left"
	EventLobbyReady        EventType = "game_lobby_ready"
	EventLobbyStarted      EventType = "game_lobby_started"
	EventRoundStarted      EventType = "game_round_started"
	EventRoundResolved     EventType = "game_round_resolved"
	EventAnswerAccepted    EventType = "game_answer_accepted"
	EventSiddhiUsed        EventType = "game_siddhi_used"
	EventMatchFinished     EventType = "game_match_finished"
	EventRewardGranted     EventType = "game_reward_granted"
)

type Event struct {
	Type          EventType              `json:"type"`
	MatchCode     string                 `json:"matchCode,omitempty"`
	UserID        uint                   `json:"userId,omitempty"`
	Round         int                    `json:"round,omitempty"`
	Timestamp     time.Time              `json:"timestamp"`
	ServerTime    time.Time              `json:"serverTime"`
	StateVersion  int                    `json:"stateVersion,omitempty"`
	Payload       map[string]interface{} `json:"payload,omitempty"`
	TargetUserIDs []uint                 `json:"-"`
}

func NewEvent(eventType EventType, matchCode string, userID uint, round int, payload map[string]interface{}, at time.Time, stateVersion int) Event {
	return Event{
		Type:         eventType,
		MatchCode:    matchCode,
		UserID:       userID,
		Round:        round,
		Timestamp:    at,
		ServerTime:   at,
		StateVersion: stateVersion,
		Payload:      payload,
	}
}

func (e Event) GetType() string {
	return string(e.Type)
}

func (e Event) GetSenderID() uint {
	return e.UserID
}

func (e Event) GetRecipientID() uint {
	return 0
}

func (e Event) GetRoomID() uint {
	return 0
}

func (e Event) GetTargetUserIDs() []uint {
	if len(e.TargetUserIDs) == 0 {
		return nil
	}
	seen := make(map[uint]struct{}, len(e.TargetUserIDs))
	result := make([]uint, 0, len(e.TargetUserIDs))
	for _, userID := range e.TargetUserIDs {
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

func (e Event) WithTargets(targetUserIDs ...uint) Event {
	e.TargetUserIDs = targetUserIDs
	return e
}
