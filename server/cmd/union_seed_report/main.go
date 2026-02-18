package main

import (
	"fmt"
	"log"
	"sort"
	"strings"

	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
)

func main() {
	database.Connect()

	var users []models.User
	if err := database.DB.Select("email, spiritual_name, city, intentions").
		Where("dating_enabled = ? AND is_profile_complete = ? AND deleted_at IS NULL", true, true).
		Find(&users).Error; err != nil {
		log.Fatal(err)
	}

	total := int64(len(users))
	var family, business, friendship, seva int64
	testRows := make([]models.User, 0, len(users))

	for _, u := range users {
		intents := strings.ToLower(u.Intentions)
		if strings.Contains(intents, "family") {
			family++
		}
		if strings.Contains(intents, "business") {
			business++
		}
		if strings.Contains(intents, "friendship") {
			friendship++
		}
		if strings.Contains(intents, "seva") {
			seva++
		}
		if strings.HasSuffix(strings.ToLower(u.Email), "@test.com") {
			testRows = append(testRows, u)
		}
	}

	sort.Slice(testRows, func(i, j int) bool {
		return testRows[i].Email < testRows[j].Email
	})

	fmt.Printf("TOTAL_UNION_CARDS=%d\n", total)
	fmt.Printf("INTENTIONS family=%d business=%d friendship=%d seva=%d\n", family, business, friendship, seva)
	fmt.Printf("TEST_EMAIL_ROWS=%d\n", len(testRows))

	limit := 15
	if len(testRows) < limit {
		limit = len(testRows)
	}
	for i := 0; i < limit; i++ {
		u := testRows[i]
		fmt.Printf("- %s | %s | %s | %s\n", u.Email, u.SpiritualName, u.City, u.Intentions)
	}
}
