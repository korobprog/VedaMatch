package models_test

import (
	"rag-agent-server/internal/models"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUserModel_NewFields(t *testing.T) {
	user := models.User{
		Yatra:    "Moscow Yatra",
		Timezone: "Europe/Moscow",
	}

	assert.Equal(t, "Moscow Yatra", user.Yatra)
	assert.Equal(t, "Europe/Moscow", user.Timezone)
}