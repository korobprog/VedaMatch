package services

import "testing"

// Fragment mirrors the real .verse-block markup served by vedabase.ru.
const sampleVerseBlock = `
<div class="verse-block" id="verse-block">
  <div class="for_quoting" style="display:none;">Бхагавад-гита 1.16-18</div>
  <h3 style='display:none;' class='verse-title'>Оригинал:</h3>
  <div class='verse-text'>धृतराष्ट्र उवाच<br>धर्मक्षेत्रे कुरुक्षेत्रे ॥ १ ॥</div>
  <h3 style='display:none;' class='verse-title'>Транскрипция:</h3>
  <div class='verse-transcription'>дхр̣тара̄шт̣ра ува̄ча<br>дхарма-кшетре куру-кшетре</div>
  <h3 style='display:none;' class='verse-title'>Синонимы:</h3>
  <div class='verse-synonyms'><em>дхр̣тара̄шт̣рах̣</em> — царь; <em>ува̄ча</em> — сказал.</div>
  <h3 class='verse-title'>Перевод:</h3>
  <div class='verse-translation'>Дхритараштра спросил: О Санджая, что сделали мои сыновья?</div>
  <h3 class='verse-title'>Комментарий:</h3>
  <div class='verse-purport'><div>Первый абзац комментария.</div></div>
  <div class='verse-purport'><div>Второй абзац комментария.</div></div>
</div>`

func TestParseVerseBlock(t *testing.T) {
	v, ok := parseVerseBlock(sampleVerseBlock)
	if !ok {
		t.Fatal("expected verse block to parse")
	}
	if v.Verse != "16-18" {
		t.Errorf("verse = %q, want 16-18", v.Verse)
	}
	if v.VerseReference != "Бхагавад-гита 1.16-18" {
		t.Errorf("reference = %q", v.VerseReference)
	}
	if v.Devanagari == "" || v.Transliteration == "" {
		t.Errorf("missing original/transliteration: %+v", v)
	}
	if v.Translation != "Дхритараштра спросил: О Санджая, что сделали мои сыновья?" {
		t.Errorf("translation = %q", v.Translation)
	}
	if v.Synonyms == "" {
		t.Errorf("missing synonyms")
	}
	// Both purport paragraphs should be present, joined.
	if want := "Первый абзац комментария.\n\nВторой абзац комментария."; v.Purport != want {
		t.Errorf("purport = %q, want %q", v.Purport, want)
	}
}

func TestParseVerseBlockRejectsEmpty(t *testing.T) {
	if _, ok := parseVerseBlock(`<div class="verse-block"></div>`); ok {
		t.Error("expected empty verse block to be rejected")
	}
}
