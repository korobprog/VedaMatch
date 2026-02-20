package database

import (
	"log"
	"rag-agent-server/internal/models"
)

// FixMultimediaLiveSources updates known live sources for existing records.
// It keeps ids stable and only patches stream URLs by station/channel name.
func FixMultimediaLiveSources() {
	log.Println("[Seed] Applying multimedia live source fixes...")

	radioUpdates := map[string]string{
		"Mayapur 24/7":       "https://radiomayapur.radioca.st/stream/",
		"ISKCON Desire Tree": "https://cast5.asurahosting.com/proxy/harekrsn/stream",
	}
	for name, streamURL := range radioUpdates {
		if err := DB.Model(&models.RadioStation{}).
			Where("name = ?", name).
			Updates(map[string]interface{}{"stream_url": streamURL, "is_active": true}).Error; err != nil {
			log.Printf("[Seed] Failed to patch radio %q: %v", name, err)
		}
	}

	tvUpdates := map[string]string{
		"Mayapur TV": "https://www.youtube.com/embed/live_stream?channel=UCypj9Vvizo4cCERfDFIG3zw",
	}
	for name, streamURL := range tvUpdates {
		if err := DB.Model(&models.TVChannel{}).
			Where("name = ?", name).
			Updates(map[string]interface{}{"stream_url": streamURL, "is_active": true}).Error; err != nil {
			log.Printf("[Seed] Failed to patch TV channel %q: %v", name, err)
		}
	}

	log.Println("[Seed] Multimedia live source fixes applied")
}
