package services

import (
	"strings"
	"testing"
)

func TestSanitizeSupportReply_RemovesEmailGuidance(t *testing.T) {
	reply := "1. Проверьте обновления.\n2. Напишите на support@vedamatch.ru для помощи."
	clean := sanitizeSupportReply(reply, "ru")

	if strings.Contains(strings.ToLower(clean), "support@vedamatch.ru") {
		t.Fatalf("expected email to be removed, got %q", clean)
	}
	if !strings.Contains(clean, "в этом чате") {
		t.Fatalf("expected in-chat guidance, got %q", clean)
	}
}

func TestEnsureSupportDiagnosticsPrompt_AppendsForTechnicalIssue(t *testing.T) {
	reply := "Понял проблему. Давайте проверим шаги."
	userText := "У меня не работает кнопка в приложении"
	result := ensureSupportDiagnosticsPrompt(reply, userText, "ru")

	if !strings.Contains(result, "устройство") || !strings.Contains(result, "версия ОС") {
		t.Fatalf("expected diagnostics request in reply, got %q", result)
	}
}

func TestEnsureSupportDiagnosticsPrompt_SkipsWhenDetailsAlreadyProvided(t *testing.T) {
	reply := "Спасибо, проверяем."
	userText := "Android 14, Samsung S23, версия 2.1.0, кнопка не работает"
	result := ensureSupportDiagnosticsPrompt(reply, userText, "ru")

	if result != reply {
		t.Fatalf("expected no extra diagnostics prompt, got %q", result)
	}
}
