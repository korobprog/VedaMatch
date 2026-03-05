package services

import "testing"

func TestNormalizeChatVideoCircleMediaURL_KeyToCDN(t *testing.T) {
	t.Setenv("CDN_BASE_URL", "https://cdn.vedamatch.ru")
	t.Setenv("S3_PUBLIC_URL", "https://s3.timeweb.cloud/bucket")

	got, err := NormalizeChatVideoCircleMediaURL("messages/video_circle/u1_1700000000.mp4")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := "https://cdn.vedamatch.ru/messages/video_circle/u1_1700000000.mp4"
	if got != want {
		t.Fatalf("got=%q want=%q", got, want)
	}
}

func TestNormalizeChatVideoCircleMediaURL_S3ToCDN(t *testing.T) {
	t.Setenv("CDN_BASE_URL", "https://cdn.vedamatch.ru")
	t.Setenv("S3_PUBLIC_URL", "https://s3.timeweb.cloud/bucket")

	got, err := NormalizeChatVideoCircleMediaURL("https://s3.timeweb.cloud/bucket/messages/video_circle/u1_1700000000.mp4")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := "https://cdn.vedamatch.ru/messages/video_circle/u1_1700000000.mp4"
	if got != want {
		t.Fatalf("got=%q want=%q", got, want)
	}
}

func TestNormalizeChatVideoCircleMediaURL_RejectForeignPath(t *testing.T) {
	t.Setenv("CDN_BASE_URL", "https://cdn.vedamatch.ru")
	t.Setenv("S3_PUBLIC_URL", "https://s3.timeweb.cloud/bucket")

	_, err := NormalizeChatVideoCircleMediaURL("https://cdn.vedamatch.ru/messages/audio/u1_1700000000.m4a")
	if err == nil {
		t.Fatalf("expected error for non video_circle path")
	}
}

func TestNormalizeChatVideoCircleMediaURL_RequiresConfig(t *testing.T) {
	t.Setenv("CDN_BASE_URL", "")
	t.Setenv("S3_PUBLIC_URL", "")

	_, err := NormalizeChatVideoCircleMediaURL("messages/video_circle/u1_1700000000.mp4")
	if err == nil {
		t.Fatalf("expected config error")
	}
}

