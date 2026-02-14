package models

import (
	"time"

	"gorm.io/gorm"
)

// CafeOrderType represents the type of cafe order
type CafeOrderType string

const (
	CafeOrderTypeDineIn   CafeOrderType = "dine_in"  // At table
	CafeOrderTypeTakeaway CafeOrderType = "takeaway" // Self-pickup
	CafeOrderTypeDelivery CafeOrderType = "delivery" // Delivery to address
)

// CafeOrderStatus represents the status of a cafe order
type CafeOrderStatus string

const (
	CafeOrderStatusNew        CafeOrderStatus = "new"        // Just created
	CafeOrderStatusConfirmed  CafeOrderStatus = "confirmed"  // Accepted by staff
	CafeOrderStatusPreparing  CafeOrderStatus = "preparing"  // In the kitchen
	CafeOrderStatusReady      CafeOrderStatus = "ready"      // Ready for pickup/serving
	CafeOrderStatusServed     CafeOrderStatus = "served"     // Served to table (dine_in)
	CafeOrderStatusDelivering CafeOrderStatus = "delivering" // On the way (delivery)
	CafeOrderStatusCompleted  CafeOrderStatus = "completed"  // Finished
	CafeOrderStatusCancelled  CafeOrderStatus = "cancelled"  // Cancelled
)

// CafeOrder represents an order in a cafe
type CafeOrder struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Unique order number for display
	OrderNumber string `json:"orderNumber" gorm:"type:varchar(50);uniqueIndex;not null"`

	// Cafe reference
	CafeID uint  `json:"cafeId" gorm:"not null;index"`
	Cafe   *Cafe `json:"cafe,omitempty" gorm:"foreignKey:CafeID"`

	// Customer
	CustomerID   *uint  `json:"customerId" gorm:"index"` // Optional - guest orders allowed
	Customer     *User  `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	CustomerName string `json:"customerName" gorm:"type:varchar(200)"` // For guest orders

	// Order type
	OrderType CafeOrderType `json:"orderType" gorm:"type:varchar(20);not null;index"`

	// For dine-in orders
	TableID *uint      `json:"tableId" gorm:"index"`
	Table   *CafeTable `json:"table,omitempty" gorm:"foreignKey:TableID"`

	// For delivery orders
	DeliveryAddress   string   `json:"deliveryAddress" gorm:"type:text"`
	DeliveryLatitude  *float64 `json:"deliveryLatitude" gorm:"type:decimal(10,8)"`
	DeliveryLongitude *float64 `json:"deliveryLongitude" gorm:"type:decimal(11,8)"`
	DeliveryPhone     string   `json:"deliveryPhone" gorm:"type:varchar(30)"`

	// Status
	Status CafeOrderStatus `json:"status" gorm:"type:varchar(20);default:'new';index"`

	// Items Summary
	ItemsCount  int     `json:"itemsCount" gorm:"not null"`
	Subtotal    float64 `json:"subtotal" gorm:"type:decimal(12,2);not null"` // Before delivery fee
	DeliveryFee float64 `json:"deliveryFee" gorm:"type:decimal(10,2);default:0"`
	Total       float64 `json:"total" gorm:"type:decimal(12,2);not null"`
	Currency    string  `json:"currency" gorm:"type:varchar(10);default:'RUB'"`

	// Payment
	PaymentMethod  string     `json:"paymentMethod" gorm:"type:varchar(20)"` // cash, card_terminal, lkm
	IsPaid         bool       `json:"isPaid" gorm:"default:false"`
	PaidAt         *time.Time `json:"paidAt"`
	RegularLkmPaid int        `json:"regularLkmPaid" gorm:"default:0"`
	BonusLkmPaid   int        `json:"bonusLkmPaid" gorm:"default:0"`

	// Notes
	CustomerNote string `json:"customerNote" gorm:"type:text"` // Special requests
	StaffNote    string `json:"staffNote" gorm:"type:text"`    // Internal notes

	// Estimated times
	EstimatedReadyAt    *time.Time `json:"estimatedReadyAt"`
	EstimatedDeliveryAt *time.Time `json:"estimatedDeliveryAt"`

	// Timestamps for status changes
	ConfirmedAt  *time.Time `json:"confirmedAt"`
	PreparingAt  *time.Time `json:"preparingAt"`
	ReadyAt      *time.Time `json:"readyAt"`
	ServedAt     *time.Time `json:"servedAt"`
	DeliveredAt  *time.Time `json:"deliveredAt"`
	CompletedAt  *time.Time `json:"completedAt"`
	CancelledAt  *time.Time `json:"cancelledAt"`
	CancelledBy  *uint      `json:"cancelledBy"`
	CancelReason string     `json:"cancelReason" gorm:"type:text"`

	// Staff handling
	AcceptedBy  *uint `json:"acceptedBy" gorm:"index"`  // Who confirmed the order
	PreparedBy  *uint `json:"preparedBy" gorm:"index"`  // Kitchen staff
	ServedBy    *uint `json:"servedBy" gorm:"index"`    // Waiter who served
	DeliveredBy *uint `json:"deliveredBy" gorm:"index"` // Courier

	// Relations
	Items []CafeOrderItem `json:"items,omitempty" gorm:"foreignKey:OrderID"`
}

// CafeOrderItem represents a single item in a cafe order
type CafeOrderItem struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OrderID uint       `json:"orderId" gorm:"not null;index"`
	Order   *CafeOrder `json:"-" gorm:"foreignKey:OrderID"`

	// Dish reference (denormalized for historical record)
	DishID   uint   `json:"dishId" gorm:"not null;index"`
	DishName string `json:"dishName" gorm:"type:varchar(200);not null"`
	ImageURL string `json:"imageUrl" gorm:"type:varchar(500)"`

	// Pricing at time of order
	UnitPrice float64 `json:"unitPrice" gorm:"type:decimal(10,2);not null"`
	Quantity  int     `json:"quantity" gorm:"not null"`
	Total     float64 `json:"total" gorm:"type:decimal(10,2);not null"`

	// Customization
	RemovedIngredients string `json:"removedIngredients" gorm:"type:text"` // JSON array of ingredient names
	CustomerNote       string `json:"customerNote" gorm:"type:text"`       // Special instructions for this item

	// Status for individual item
	Status     string     `json:"status" gorm:"type:varchar(20);default:'pending'"` // pending, preparing, ready
	PreparedAt *time.Time `json:"preparedAt"`

	// Relations
	Modifiers []CafeOrderItemModifier `json:"modifiers,omitempty" gorm:"foreignKey:OrderItemID"`
}

// CafeOrderItemModifier represents a modifier applied to an order item
type CafeOrderItemModifier struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	OrderItemID uint `json:"orderItemId" gorm:"not null;index"`

	// Denormalized from DishModifier
	ModifierID   uint    `json:"modifierId" gorm:"not null"`
	ModifierName string  `json:"modifierName" gorm:"type:varchar(100);not null"`
	Price        float64 `json:"price" gorm:"type:decimal(10,2);not null"`
	Quantity     int     `json:"quantity" gorm:"default:1"`
	Total        float64 `json:"total" gorm:"type:decimal(10,2);not null"`
}

// ===== Request/Response DTOs =====

// CafeOrderItemRequest for creating order items
type CafeOrderItemRequest struct {
	DishID             uint                       `json:"dishId" binding:"required"`
	Quantity           int                        `json:"quantity" binding:"required,min=1"`
	RemovedIngredients []string                   `json:"removedIngredients"` // Ingredient names to remove
	Modifiers          []CafeOrderModifierRequest `json:"modifiers"`
	Note               string                     `json:"note"`
}

// CafeOrderModifierRequest for order item modifiers
type CafeOrderModifierRequest struct {
	ModifierID uint `json:"modifierId" binding:"required"`
	Quantity   int  `json:"quantity"`
}

// CafeOrderCreateRequest for creating a new order
type CafeOrderCreateRequest struct {
	CafeID          uint                   `json:"cafeId" binding:"required"`
	OrderType       CafeOrderType          `json:"orderType" binding:"required"`
	TableID         *uint                  `json:"tableId"`         // Required for dine_in
	CustomerName    string                 `json:"customerName"`    // For guest orders
	DeliveryAddress string                 `json:"deliveryAddress"` // Required for delivery
	DeliveryPhone   string                 `json:"deliveryPhone"`   // Required for delivery
	DeliveryLat     *float64               `json:"deliveryLat"`
	DeliveryLng     *float64               `json:"deliveryLng"`
	Items           []CafeOrderItemRequest `json:"items" binding:"required,min=1"`
	CustomerNote    string                 `json:"customerNote"`
	PaymentMethod   string                 `json:"paymentMethod"` // cash, card_terminal, lkm
}

// CafeOrderUpdateRequest for staff to update order
type CafeOrderUpdateRequest struct {
	Status    *CafeOrderStatus `json:"status"`
	StaffNote *string          `json:"staffNote"`
	IsPaid    *bool            `json:"isPaid"`
}

// CafeOrderCancelRequest for cancelling an order
type CafeOrderCancelRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// CafeOrderFilters for querying orders
type CafeOrderFilters struct {
	CafeID     uint            `json:"cafeId"`
	CustomerID *uint           `json:"customerId"`
	Status     CafeOrderStatus `json:"status"`
	OrderType  CafeOrderType   `json:"orderType"`
	TableID    *uint           `json:"tableId"`
	IsPaid     *bool           `json:"isPaid"`
	DateFrom   *time.Time      `json:"dateFrom"`
	DateTo     *time.Time      `json:"dateTo"`
	Search     string          `json:"search"` // By order number
	Sort       string          `json:"sort"`   // newest, oldest
	Page       int             `json:"page"`
	Limit      int             `json:"limit"`
}

// CafeOrderResponse for API responses
type CafeOrderResponse struct {
	CafeOrder
	CustomerInfo *CafeOrderCustomerInfo `json:"customerInfo,omitempty"`
	CafeInfo     *CafeOrderCafeInfo     `json:"cafeInfo,omitempty"`
	TableInfo    *CafeOrderTableInfo    `json:"tableInfo,omitempty"`
}

// CafeOrderCustomerInfo simplified user info for order display
type CafeOrderCustomerInfo struct {
	ID            uint   `json:"id"`
	SpiritualName string `json:"spiritualName"`
	KarmicName    string `json:"karmicName"`
	AvatarURL     string `json:"avatarUrl"`
}

// CafeOrderCafeInfo simplified cafe info for order display
type CafeOrderCafeInfo struct {
	ID      uint   `json:"id"`
	Name    string `json:"name"`
	LogoURL string `json:"logoUrl"`
	Address string `json:"address"`
}

// CafeOrderTableInfo simplified table info for order display
type CafeOrderTableInfo struct {
	ID     uint   `json:"id"`
	Number string `json:"number"`
	Name   string `json:"name"`
}

// CafeOrderListResponse for paginated list
type CafeOrderListResponse struct {
	Orders     []CafeOrderResponse `json:"orders"`
	Total      int64               `json:"total"`
	Page       int                 `json:"page"`
	TotalPages int                 `json:"totalPages"`
}

// ActiveOrdersResponse for real-time order board
type ActiveOrdersResponse struct {
	New       []CafeOrderResponse `json:"new"`
	Preparing []CafeOrderResponse `json:"preparing"`
	Ready     []CafeOrderResponse `json:"ready"`
	Total     int                 `json:"total"`
}

// CafeOrderStatsResponse for cafe dashboard
type CafeOrderStatsResponse struct {
	TodayOrders   int     `json:"todayOrders"`
	TodayRevenue  float64 `json:"todayRevenue"`
	PendingOrders int     `json:"pendingOrders"`
	AvgPrepTime   float64 `json:"avgPrepTime"` // Minutes
	TotalOrders   int     `json:"totalOrders"`
	TotalRevenue  float64 `json:"totalRevenue"`
}

// QRCodeScanResponse for scanning table QR code
type QRCodeScanResponse struct {
	CafeID      uint               `json:"cafeId"`
	CafeName    string             `json:"cafeName"`
	TableID     uint               `json:"tableId"`
	TableNumber string             `json:"tableNumber"`
	OrderType   CafeOrderType      `json:"orderType"`             // Always "dine_in" for QR
	ActiveOrder *CafeOrderResponse `json:"activeOrder,omitempty"` // If there's an existing order at this table
	Table       *CafeTable         `json:"table,omitempty"`       // Full table info including reservations
}
