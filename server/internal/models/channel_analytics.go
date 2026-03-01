package models

type ChannelPreacherAnalyticsCity struct {
	City          string `json:"city"`
	Registrations int64  `json:"registrations"`
}

type ChannelPreacherAnalyticsResponse struct {
	ChannelID            uint                           `json:"channelId"`
	TotalLectureViews    int64                          `json:"totalLectureViews"`
	SeminarRegistrations int64                          `json:"seminarRegistrations"`
	ActiveCities         []ChannelPreacherAnalyticsCity `json:"activeCities"`
}
