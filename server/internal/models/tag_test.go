package models

import (
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestTagModel(t *testing.T) {
	tag := Tag{
		Name: "Sankirtan",
		Type: "seva",
	}

	assert.Equal(t, "Sankirtan", tag.Name)
	assert.Equal(t, "seva", tag.Type)
}
