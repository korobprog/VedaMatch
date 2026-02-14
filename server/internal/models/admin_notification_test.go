package models

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSyncAdminNotificationAliases(t *testing.T) {
	n := AdminNotification{
		Read:   true,
		LinkTo: "/admin/yatra/123",
	}
	n.SyncAliases()

	require.True(t, n.IsRead)
	require.Equal(t, "/admin/yatra/123", n.Link)
}
