package handlers

import (
	"math"
	"rag-agent-server/internal/database"
	"rag-agent-server/internal/models"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type NearByUsersRequest struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	RadiusKm  float64 `json:"radiusKm"`
}

type UserWithDistance struct {
	models.User
	Distance float64 `json:"distance"`
}

func (h *AuthHandler) GetNearbyUsers(c *fiber.Ctx) error {
	var req NearByUsersRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	if req.Latitude == 0 || req.Longitude == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Latitude and longitude are required",
		})
	}

	if req.RadiusKm == 0 {
		req.RadiusKm = 50 // Default 50km radius
	}

	// Get all users with coordinates
	var users []models.User
	if err := database.DB.Where("latitude IS NOT NULL AND longitude IS NOT NULL").Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch users",
		})
	}

	// Calculate distance for each user and filter by radius
	var nearbyUsers []UserWithDistance
	for _, user := range users {
		if user.Latitude == nil || user.Longitude == nil {
			continue
		}

		distance := h.calculateDistance(
			req.Latitude,
			req.Longitude,
			*user.Latitude,
			*user.Longitude,
		)

		if distance <= req.RadiusKm {
			nearbyUsers = append(nearbyUsers, UserWithDistance{
				User:     user,
				Distance: distance,
			})
		}
	}

	// Sort by distance
	nearbyUsers = h.sortByDistance(nearbyUsers)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"users":    nearbyUsers,
		"count":    len(nearbyUsers),
		"radiusKm": req.RadiusKm,
	})
}

func (h *AuthHandler) calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth's radius in kilometers

	dLat := h.deg2rad(lat2 - lat1)
	dLon := h.deg2rad(lon2 - lon1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(h.deg2rad(lat1))*math.Cos(h.deg2rad(lat2))*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

func (h *AuthHandler) deg2rad(deg float64) float64 {
	return deg * (math.Pi / 180)
}

func (h *AuthHandler) sortByDistance(users []UserWithDistance) []UserWithDistance {
	for i := 0; i < len(users); i++ {
		for j := i + 1; j < len(users); j++ {
			if users[i].Distance > users[j].Distance {
				users[i], users[j] = users[j], users[i]
			}
		}
	}
	return users
}

func (h *AuthHandler) UpdateLocationCoordinates(c *fiber.Ctx) error {
	userId := c.Params("id")
	var req struct {
		Latitude  *float64 `json:"latitude"`
		Longitude *float64 `json:"longitude"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Cannot parse JSON",
		})
	}

	var user models.User
	if err := database.DB.First(&user, userId).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	user.Latitude = req.Latitude
	user.Longitude = req.Longitude

	if err := database.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update coordinates",
		})
	}

	user.Password = ""
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Coordinates updated successfully",
		"user":    user,
	})
}

func (h *AuthHandler) SearchByCity(c *fiber.Ctx) error {
	city := c.Query("city")
	if city == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "City parameter is required",
		})
	}

	city = strings.TrimSpace(city)

	var users []models.User
	if err := database.DB.Where("city LIKE ?", "%"+city+"%").Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to search users",
		})
	}

	// Remove passwords
	for i := range users {
		users[i].Password = ""
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"users": users,
		"count": len(users),
	})
}

func (h *AuthHandler) GetUsersByCountry(c *fiber.Ctx) error {
	country := c.Query("country")
	if country == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Country parameter is required",
		})
	}

	country = strings.TrimSpace(country)

	var users []models.User
	if err := database.DB.Where("country LIKE ?", "%"+country+"%").Find(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch users",
		})
	}

	// Remove passwords
	for i := range users {
		users[i].Password = ""
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"users": users,
		"count": len(users),
	})
}
