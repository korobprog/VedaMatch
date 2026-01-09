package models

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestUserModelNetworkingFields(t *testing.T) {
	user := User{
		Intentions: "business,marriage",
		Skills:     "Go,React,Yoga",
		Industry:   "IT,Wellness",
	}

	assert.Equal(t, "business,marriage", user.Intentions)
	assert.Equal(t, "Go,React,Yoga", user.Skills)
	assert.Equal(t, "IT,Wellness", user.Industry)
}
