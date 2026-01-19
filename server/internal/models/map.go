package models

// MarkerType represents the type of map marker
type MarkerType string

const (
	MarkerTypeUser MarkerType = "user"
	MarkerTypeShop MarkerType = "shop"
	MarkerTypeAd   MarkerType = "ad"
)

// MapMarker represents a single marker on the map
type MapMarker struct {
	ID        uint       `json:"id"`
	Type      MarkerType `json:"type"`
	Title     string     `json:"title"`
	Subtitle  string     `json:"subtitle,omitempty"`
	Latitude  float64    `json:"latitude"`
	Longitude float64    `json:"longitude"`
	AvatarURL string     `json:"avatarUrl,omitempty"`
	Category  string     `json:"category,omitempty"`
	Rating    float64    `json:"rating,omitempty"`
	Status    string     `json:"status,omitempty"`   // active, hidden, etc.
	Distance  float64    `json:"distance,omitempty"` // Distance from request point in km
	Data      any        `json:"data,omitempty"`     // Additional data specific to type
}

// MapCluster represents a cluster of markers for a city/area
type MapCluster struct {
	City       string  `json:"city"`
	Latitude   float64 `json:"latitude"`
	Longitude  float64 `json:"longitude"`
	UserCount  int     `json:"userCount"`
	ShopCount  int     `json:"shopCount"`
	AdCount    int     `json:"adCount"`
	TotalCount int     `json:"totalCount"`
}

// MapBoundingBox represents the visible area of the map
type MapBoundingBox struct {
	LatMin float64 `json:"latMin" query:"lat_min"`
	LatMax float64 `json:"latMax" query:"lat_max"`
	LngMin float64 `json:"lngMin" query:"lng_min"`
	LngMax float64 `json:"lngMax" query:"lng_max"`
}

// MapMarkersRequest represents the request for markers
type MapMarkersRequest struct {
	MapBoundingBox
	Categories []MarkerType `json:"categories" query:"categories"`
	Limit      int          `json:"limit" query:"limit"`
	UserLat    *float64     `json:"userLat" query:"user_lat"`
	UserLng    *float64     `json:"userLng" query:"user_lng"`
}

// MapMarkersResponse represents the response with markers
type MapMarkersResponse struct {
	Markers    []MapMarker `json:"markers"`
	Total      int         `json:"total"`
	TruncatedU int         `json:"truncatedUsers,omitempty"`
	TruncatedS int         `json:"truncatedShops,omitempty"`
	TruncatedA int         `json:"truncatedAds,omitempty"`
}

// MapSummaryResponse represents the cluster summary response
type MapSummaryResponse struct {
	Clusters []MapCluster `json:"clusters"`
	Total    int          `json:"total"`
}

// GeoapifyRouteRequest represents a routing request
type GeoapifyRouteRequest struct {
	StartLat float64 `json:"startLat"`
	StartLng float64 `json:"startLng"`
	EndLat   float64 `json:"endLat"`
	EndLng   float64 `json:"endLng"`
	Mode     string  `json:"mode"` // walk, drive, bicycle
}

// GeoapifyAutocompleteRequest represents an autocomplete request
type GeoapifyAutocompleteRequest struct {
	Text  string   `json:"text" query:"text"`
	Lat   *float64 `json:"lat" query:"lat"`
	Lng   *float64 `json:"lng" query:"lng"`
	Limit int      `json:"limit" query:"limit"`
}

// MapVisibilitySettings represents admin settings for marker visibility
type MapVisibilitySettings struct {
	HiddenMarkers []HiddenMarker `json:"hiddenMarkers"`
}

// HiddenMarker represents a marker hidden by admin
type HiddenMarker struct {
	ID     uint       `json:"id"`
	Type   MarkerType `json:"type"`
	Reason string     `json:"reason,omitempty"`
}
