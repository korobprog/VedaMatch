package models

import (
	"time"

	"gorm.io/gorm"
)

// OrderStatus represents the status of an order
type OrderStatus string

const (
	OrderStatusNew       OrderStatus = "new"       // Just created, seller notified
	OrderStatusConfirmed OrderStatus = "confirmed" // Seller confirmed
	OrderStatusPaid      OrderStatus = "paid"      // Buyer confirmed payment (through chat)
	OrderStatusShipped   OrderStatus = "shipped"   // Seller shipped
	OrderStatusDelivered OrderStatus = "delivered" // Buyer received
	OrderStatusCompleted OrderStatus = "completed" // Order finished
	OrderStatusCancelled OrderStatus = "cancelled" // Cancelled by buyer or seller
	OrderStatusDispute   OrderStatus = "dispute"   // Issue reported
)

// DeliveryType represents how the product will be delivered
type DeliveryType string

const (
	DeliveryTypePickup   DeliveryType = "pickup"   // Self-pickup from shop
	DeliveryTypeDelivery DeliveryType = "delivery" // Delivery to address
	DeliveryTypeDigital  DeliveryType = "digital"  // Digital download
)

// Order represents a customer order
type Order struct {
	gorm.Model

	// Unique order number for display
	OrderNumber string `json:"orderNumber" gorm:"type:varchar(50);uniqueIndex;not null"`

	// Parties
	BuyerID  uint  `json:"buyerId" gorm:"not null;index"`
	Buyer    *User `json:"buyer,omitempty" gorm:"foreignKey:BuyerID"`
	ShopID   uint  `json:"shopId" gorm:"not null;index"`
	Shop     *Shop `json:"shop,omitempty" gorm:"foreignKey:ShopID"`
	SellerID uint  `json:"sellerId" gorm:"not null;index"` // Denormalized for easy query

	// Status
	Status OrderStatus `json:"status" gorm:"type:varchar(20);default:'new';index"`

	// Items Summary
	ItemsCount int     `json:"itemsCount" gorm:"not null"`
	Subtotal   float64 `json:"subtotal" gorm:"type:decimal(12,2);not null"`
	Total      float64 `json:"total" gorm:"type:decimal(12,2);not null"`
	Currency   string  `json:"currency" gorm:"type:varchar(10);default:'RUB'"`

	// Delivery
	DeliveryType    DeliveryType `json:"deliveryType" gorm:"type:varchar(20);not null"`
	DeliveryAddress string       `json:"deliveryAddress" gorm:"type:text"`
	DeliveryNote    string       `json:"deliveryNote" gorm:"type:text"`

	// Buyer Contact (for this order)
	BuyerName  string `json:"buyerName" gorm:"type:varchar(200)"`
	BuyerPhone string `json:"buyerPhone" gorm:"type:varchar(30)"`
	BuyerEmail string `json:"buyerEmail" gorm:"type:varchar(100)"`

	// Attribution (optional analytics source)
	Source          string `json:"source" gorm:"type:varchar(80);index"`
	SourcePostID    *uint  `json:"sourcePostId" gorm:"index"`
	SourceChannelID *uint  `json:"sourceChannelId" gorm:"index"`

	// Communication (through messenger)
	// The notification is sent to shop's TechRoom, and includes deep link to buyer's contact
	NotificationSent   bool       `json:"notificationSent" gorm:"default:false"`
	NotificationSentAt *time.Time `json:"notificationSentAt"`

	// Notes
	BuyerNote  string `json:"buyerNote" gorm:"type:text"`  // Note from buyer
	SellerNote string `json:"sellerNote" gorm:"type:text"` // Internal seller note

	// Timestamps
	ConfirmedAt  *time.Time `json:"confirmedAt"`
	ShippedAt    *time.Time `json:"shippedAt"`
	DeliveredAt  *time.Time `json:"deliveredAt"`
	CompletedAt  *time.Time `json:"completedAt"`
	CancelledAt  *time.Time `json:"cancelledAt"`
	CancelledBy  *uint      `json:"cancelledBy"`
	CancelReason string     `json:"cancelReason" gorm:"type:text"`

	// Relations
	Items []OrderItem `json:"items,omitempty" gorm:"foreignKey:OrderID"`
}

// OrderItem represents a single item in an order
type OrderItem struct {
	gorm.Model
	OrderID uint   `json:"orderId" gorm:"not null;index"`
	Order   *Order `json:"-" gorm:"foreignKey:OrderID"`

	// Product Info (denormalized for historical record)
	ProductID   uint   `json:"productId" gorm:"not null;index"`
	VariantID   *uint  `json:"variantId" gorm:"index"`
	ProductName string `json:"productName" gorm:"type:varchar(300);not null"`
	VariantName string `json:"variantName" gorm:"type:varchar(200)"`
	SKU         string `json:"sku" gorm:"type:varchar(100)"`
	ImageURL    string `json:"imageUrl" gorm:"type:varchar(500)"`

	// Pricing at time of order
	UnitPrice float64 `json:"unitPrice" gorm:"type:decimal(12,2);not null"`
	Quantity  int     `json:"quantity" gorm:"not null"`
	Total     float64 `json:"total" gorm:"type:decimal(12,2);not null"`

	// For digital products
	DigitalURL string `json:"digitalUrl" gorm:"type:varchar(500)"`
}

// ===== Request/Response DTOs =====

// CartItem for creating order from cart
type CartItem struct {
	ProductID uint  `json:"productId" binding:"required"`
	VariantID *uint `json:"variantId"`
	Quantity  int   `json:"quantity" binding:"required,min=1"`
}

// OrderCreateRequest for placing a new order
type OrderCreateRequest struct {
	ShopID          uint         `json:"shopId" binding:"required"`
	Items           []CartItem   `json:"items" binding:"required,min=1"`
	DeliveryType    DeliveryType `json:"deliveryType" binding:"required"`
	DeliveryAddress string       `json:"deliveryAddress"`
	DeliveryNote    string       `json:"deliveryNote"`
	BuyerName       string       `json:"buyerName" binding:"required"`
	BuyerPhone      string       `json:"buyerPhone"`
	BuyerEmail      string       `json:"buyerEmail"`
	BuyerNote       string       `json:"buyerNote"`
	Source          string       `json:"source"`
	SourcePostID    *uint        `json:"sourcePostId"`
	SourceChannelID *uint        `json:"sourceChannelId"`
}

// OrderUpdateRequest for seller to update order
type OrderUpdateRequest struct {
	Status     *OrderStatus `json:"status"`
	SellerNote *string      `json:"sellerNote"`
}

// OrderCancelRequest for cancelling an order
type OrderCancelRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// OrderFilters for querying orders
type OrderFilters struct {
	ShopID          *uint        `json:"shopId"`
	BuyerID         *uint        `json:"buyerId"`
	SellerID        *uint        `json:"sellerId"`
	Status          OrderStatus  `json:"status"`
	DeliveryType    DeliveryType `json:"deliveryType"`
	Source          string       `json:"source"`
	SourcePostID    *uint        `json:"sourcePostId"`
	SourceChannelID *uint        `json:"sourceChannelId"`
	DateFrom        *time.Time   `json:"dateFrom"`
	DateTo          *time.Time   `json:"dateTo"`
	Search          string       `json:"search"` // By order number
	Sort            string       `json:"sort"`   // newest, oldest
	Page            int          `json:"page"`
	Limit           int          `json:"limit"`
}

// OrderResponse for API responses
type OrderResponse struct {
	Order
	BuyerInfo *OrderUserInfo `json:"buyerInfo,omitempty"`
	ShopInfo  *OrderShopInfo `json:"shopInfo,omitempty"`
}

// OrderUserInfo simplified user info for order display
type OrderUserInfo struct {
	ID            uint   `json:"id"`
	SpiritualName string `json:"spiritualName"`
	KarmicName    string `json:"karmicName"`
	AvatarURL     string `json:"avatarUrl"`
}

// OrderShopInfo simplified shop info for order display
type OrderShopInfo struct {
	ID      uint   `json:"id"`
	Name    string `json:"name"`
	LogoURL string `json:"logoUrl"`
	City    string `json:"city"`
}

// OrderListResponse for paginated list
type OrderListResponse struct {
	Orders     []OrderResponse `json:"orders"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	TotalPages int             `json:"totalPages"`
}

// OrderNotification for sending to seller's tech room
type OrderNotification struct {
	OrderID     uint    `json:"orderId"`
	OrderNumber string  `json:"orderNumber"`
	BuyerID     uint    `json:"buyerId"`
	BuyerName   string  `json:"buyerName"`
	ItemsCount  int     `json:"itemsCount"`
	Total       float64 `json:"total"`
	Currency    string  `json:"currency"`
	DeepLink    string  `json:"deepLink"` // Deep link to start chat with buyer
}
