package services

import "testing"

func TestResolveChatTranscriptionModelsDefaultIncludesWhisperFallback(t *testing.T) {
	t.Setenv("CHAT_TRANSCRIPTION_MODELS", "")

	models := resolveChatTranscriptionModels()
	expected := []string{"gpt-4o-mini-transcribe", "gpt-4o-transcribe", "whisper-1"}

	if len(models) != len(expected) {
		t.Fatalf("expected %d models, got %d: %#v", len(expected), len(models), models)
	}

	for index, model := range expected {
		if models[index] != model {
			t.Fatalf("expected model %q at index %d, got %q", model, index, models[index])
		}
	}
}

func TestResolveChatTranscriptionModelsForPolzaAddsOpenAIPrefixFallbacks(t *testing.T) {
	t.Setenv("CHAT_TRANSCRIPTION_MODELS", "gpt-4o-mini-transcribe, openai/gpt-4o-transcribe , whisper-1")

	models := resolveChatTranscriptionModelsForProvider(chatTranscriptionProvider{Name: "polza"})
	expected := []string{
		"openai/whisper-1",
		"whisper-1",
		"openai/gpt-4o-mini-transcribe",
		"gpt-4o-mini-transcribe",
		"openai/gpt-4o-transcribe",
		"gpt-4o-transcribe",
	}

	if len(models) != len(expected) {
		t.Fatalf("expected %d models, got %d: %#v", len(expected), len(models), models)
	}

	for index, model := range expected {
		if models[index] != model {
			t.Fatalf("expected model %q at index %d, got %q", model, index, models[index])
		}
	}
}

func TestBuildChatTranscriptionDownloadCandidatesPrefersDirectS3ForAudioCDN(t *testing.T) {
	t.Setenv("S3_ENDPOINT", "https://s3.firstvds.ru")
	t.Setenv("S3_BUCKET_NAME", "bucket-name")

	candidates := buildChatTranscriptionDownloadCandidates("https://cdn.vedamatch.ru/messages/audio/u4_1773372653.m4a")
	expected := []string{
		"https://s3.firstvds.ru/bucket-name/messages/audio/u4_1773372653.m4a",
		"https://cdn.vedamatch.ru/messages/audio/u4_1773372653.m4a",
	}

	if len(candidates) != len(expected) {
		t.Fatalf("expected %d candidates, got %d: %#v", len(expected), len(candidates), candidates)
	}
	for index, value := range expected {
		if candidates[index] != value {
			t.Fatalf("expected candidate %q at index %d, got %q", value, index, candidates[index])
		}
	}
}

func TestDetectChatTranscriptionMimeTypeForM4A(t *testing.T) {
	if got := detectChatTranscriptionMimeType("/tmp/chat_ok.m4a"); got != "audio/mp4" {
		t.Fatalf("expected audio/mp4, got %q", got)
	}
}
