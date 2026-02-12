package services

import "log"

func StartChannelPostScheduler() {
	if GlobalScheduler == nil {
		return
	}

	service := NewChannelService()
	GlobalScheduler.RegisterTask("channel_post_publish", 1, func() {
		if !service.IsFeatureEnabled() {
			return
		}

		count, err := service.PublishDuePosts(200)
		if err != nil {
			log.Printf("[Channels] schedule publish failed: %v", err)
			return
		}
		if count > 0 {
			log.Printf("[Channels] published scheduled posts: %d", count)
		}
	})
}
