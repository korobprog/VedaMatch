package models

import (
	"gorm.io/gorm"
)

// FriendRequestStatus represents the status of a friend request
type FriendRequestStatus string

const (
	FriendRequestStatusPending  FriendRequestStatus = "pending"
	FriendRequestStatusAccepted FriendRequestStatus = "accepted"
	FriendRequestStatusRejected FriendRequestStatus = "rejected"
)

// FriendRequest represents a friend request from one user to another
type FriendRequest struct {
	gorm.Model
	SenderID   uint              `json:"senderId" gorm:"not null;index:idx_sender_receiver,priority:1"`
	ReceiverID uint              `json:"receiverId" gorm:"not null;index:idx_sender_receiver,priority:2;index:idx_receiver_status"`
	Status     FriendRequestStatus `json:"status" gorm:"type:varchar(20);default:'pending';index:idx_receiver_status"`
	
	// Associations
	Sender User `json:"sender,omitempty" gorm:"foreignKey:SenderID"`
}
