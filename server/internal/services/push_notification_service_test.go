package services

import (
	"math/rand"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestResolveSettingOrEnvPriority(t *testing.T) {
	key, source := resolveSettingOrEnv(" db-value ", "env-value")
	require.Equal(t, "db-value", key)
	require.Equal(t, "db", source)

	key, source = resolveSettingOrEnv("", " env-value ")
	require.Equal(t, "env-value", key)
	require.Equal(t, "env", source)

	key, source = resolveSettingOrEnv("", "")
	require.Equal(t, "", key)
	require.Equal(t, "none", source)
}

func TestClassifyFCMError(t *testing.T) {
	require.Equal(t, errorTypePermanent, classifyFCMError("NotRegistered"))
	require.Equal(t, errorTypeTransient, classifyFCMError("Unavailable"))
	require.Equal(t, errorTypeUnknown, classifyFCMError("SomethingElse"))
}

func TestNormalizeFCMSenderMode(t *testing.T) {
	require.Equal(t, fcmSenderModeAuto, normalizeFCMSenderMode(""))
	require.Equal(t, fcmSenderModeAuto, normalizeFCMSenderMode("something"))
	require.Equal(t, fcmSenderModeLegacy, normalizeFCMSenderMode("legacy"))
	require.Equal(t, fcmSenderModeV1, normalizeFCMSenderMode("v1"))
}

func TestClassifyFCMV1Error(t *testing.T) {
	require.Equal(t, errorTypePermanent, classifyFCMV1Error(404, "NOT_FOUND", "UNREGISTERED", "Requested entity was not found."))
	require.Equal(t, errorTypeTransient, classifyFCMV1Error(503, "UNAVAILABLE", "", "service unavailable"))
	require.Equal(t, errorTypeConfig, classifyFCMV1Error(401, "UNAUTHENTICATED", "", "auth issue"))
	require.Equal(t, errorTypeUnknown, classifyFCMV1Error(400, "INVALID_ARGUMENT", "INVALID_ARGUMENT", "Bad request payload"))
}

func TestLoadFCMV1ServiceAccountInlineJSON(t *testing.T) {
	raw := `{
		"project_id": "demo-project",
		"private_key": "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n",
		"client_email": "firebase-adminsdk@demo-project.iam.gserviceaccount.com",
		"token_uri": "https://oauth2.googleapis.com/token"
	}`
	cfg, format, err := loadFCMV1ServiceAccount(raw)
	require.NoError(t, err)
	require.Equal(t, "inline_json", format)
	require.Equal(t, "demo-project", cfg.ProjectID)
	require.Equal(t, "firebase-adminsdk@demo-project.iam.gserviceaccount.com", cfg.ClientEmail)
}

func TestClassifyExpoError(t *testing.T) {
	require.Equal(t, errorTypePermanent, classifyExpoError("DeviceNotRegistered"))
	require.Equal(t, errorTypeTransient, classifyExpoError("MessageRateExceeded"))
	require.Equal(t, errorTypeUnknown, classifyExpoError("Other"))
}

func TestNormalizeAndDedupTargets(t *testing.T) {
	userID := uint(42)
	svc := &PushNotificationService{}
	targets := svc.normalizeAndDedupTargets([]pushTokenTarget{
		{Token: "token-a", Provider: "", Platform: "unknown", UserID: nil},
		{Token: "token-a", Provider: "fcm", Platform: "ios", UserID: &userID},
		{Token: "ExponentPushToken[abc]", Provider: "", Platform: "", UserID: nil},
		{Token: "", Provider: "fcm", Platform: "android", UserID: nil},
	})

	require.Len(t, targets, 2)
	require.Equal(t, "token-a", targets[1].Token)
	require.Equal(t, "ios", targets[1].Platform)
	require.NotNil(t, targets[1].UserID)
	require.Equal(t, providerExpo, targets[0].Provider)
}

func TestNextRetryDelayBackoff(t *testing.T) {
	svc := &PushNotificationService{
		retryBaseDelay: 100 * time.Millisecond,
		rng:            rand.New(rand.NewSource(1)),
	}
	d1 := svc.nextRetryDelay(1)
	d2 := svc.nextRetryDelay(2)
	require.Greater(t, d1, time.Duration(0))
	require.Greater(t, d2, d1)
}
