package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"
)

type ImageProcessingService struct{}

var imageInstance *ImageProcessingService

func GetImageProcessingService() *ImageProcessingService {
	if imageInstance == nil {
		imageInstance = &ImageProcessingService{}
	}
	return imageInstance
}

// TranslatePromptToEnglish translates a prompt to English using Gemini or a fallback
func (s *ImageProcessingService) TranslatePromptToEnglish(original, apiKey string) (string, error) {
	// Try Gemini first (faster and more reliable)
	geminiService := GetGeminiService()
	if geminiService != nil && geminiService.HasKeys() {
		messages := []map[string]string{
			{
				"role": "user",
				"content": fmt.Sprintf(`You are a professional prompt engineer for image generation AI models (Flux, DALL-E, Midjourney).

TASK: Convert this user request into an English image generation prompt.

RULES:
1. Remove any instruction words like "draw", "нарисуй", "создай", "сгенерируй", "make", "generate"
2. Focus ONLY on describing WHAT should be in the image
3. Add quality descriptors: "high quality, detailed, 4k, professional"
4. Keep the artistic intent and subject matter
5. Output ONLY the English prompt, nothing else

User request: %s`, original),
			},
		}

		translated, err := geminiService.SendMessage("gemini-2.5-flash", messages)
		if err == nil && translated != "" {
			log.Printf("[Translator] Gemini translated: %s", translated)
			return strings.TrimSpace(translated), nil
		}
		log.Printf("[Translator] Gemini translation failed: %v, trying OpenAI fallback", err)
	}

	// Fallback to OpenAI/RVFreeLLM
	externalURL := "https://rvlautoai.ru/webhook/v1/chat/completions"

	translateReq := map[string]interface{}{
		"model":    "turbo",
		"provider": "Perplexity",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a prompt engineer for image AI. Convert the user's request to an English image prompt. Remove words like 'draw', 'нарисуй', 'создай'. Output ONLY the descriptive English prompt with quality tags like 'high quality, detailed'. No explanations.",
			},
			{
				"role":    "user",
				"content": original,
			},
		},
	}

	jsonBody, err := json.Marshal(translateReq)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", externalURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("translation service returned status: %d. Body: %s", resp.StatusCode, string(respBody))
	}

	var respData struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.Unmarshal(respBody, &respData); err != nil {
		return "", err
	}

	if len(respData.Choices) > 0 {
		return strings.TrimSpace(respData.Choices[0].Message.Content), nil
	}

	return "", fmt.Errorf("no translation provided by AI")
}

// ProcessAndCacheImages finds image URLs in the response, downloads them locally,
// or falls back to proxy if download fails/times out.
func (s *ImageProcessingService) ProcessAndCacheImages(content string) string {
	// 1. First, strip link wrappers around images like [![alt](img_url)](link_url)
	reLinkWrap := regexp.MustCompile(`\[(!\[.*?\]\(.*?\))\]\(https?://.*?\)`)
	newContent := reLinkWrap.ReplaceAllString(content, "$1")

	// 2. Wrap "naked" HF Gradio URLs in Markdown
	reRaw := regexp.MustCompile(`(?m)(^|\s)(https?://[^\s)\]"]+?hf\.space/gradio_api/file=[^\s)\]"]+)`)
	newContent = reRaw.ReplaceAllString(newContent, `$1![Generated Image]($2)`)

	// 3. Process all Markdown images: ![alt](url)
	re := regexp.MustCompile(`!\[(.*?)\]\((https?://.*?)\)`)

	newContent = re.ReplaceAllStringFunc(newContent, func(match string) string {
		submatches := re.FindStringSubmatch(match)
		if len(submatches) < 3 {
			return match
		}
		altText := submatches[1]
		originalURL := submatches[2]

		// If nested markdown was somehow created, clean it up manually here
		if strings.HasPrefix(originalURL, "![") {
			innerRe := regexp.MustCompile(`\((https?://.*?)\)`)
			innerMatch := innerRe.FindStringSubmatch(originalURL)
			if len(innerMatch) > 1 {
				originalURL = innerMatch[1]
			}
		}

		// Skip if already local
		if strings.Contains(originalURL, "/uploads/") {
			return match
		}

		// Generate local filename
		ext := ".jpg"
		if strings.Contains(strings.ToLower(originalURL), ".png") {
			ext = ".png"
		} else if strings.Contains(strings.ToLower(originalURL), ".webp") {
			ext = ".webp"
		}

		filename := fmt.Sprintf("gen_%d%s", time.Now().UnixNano(), ext)
		localRelPath := "uploads/generated/" + filename
		localFullPath := "./" + localRelPath
		publicLocalURL := fmt.Sprintf("http://10.0.2.2:8081/%s", localRelPath)

		log.Printf("[ImageCache] Processing %s ...", originalURL)

		// Try to download with longer timeout (30s) for HF
		err := s.downloadFile(originalURL, localFullPath)
		if err == nil {
			log.Printf("[ImageCache] Download success: %s", publicLocalURL)
			return fmt.Sprintf("![%s](%s)", altText, publicLocalURL)
		}

		log.Printf("[ImageCache] Download failed or timed out: %v. Using Proxy.", err)

		// Fallback to Cloudflare Proxy
		proxyURL := fmt.Sprintf("https://mute-waterfall-ef1e.makstreid.workers.dev/?url=%s", url.QueryEscape(originalURL))
		return fmt.Sprintf("![%s](%s)", altText, proxyURL)
	})

	return newContent
}

func (s *ImageProcessingService) downloadFile(urlStr, filepath string) error {
	// Ensure directory exists
	if err := os.MkdirAll("./uploads/generated", 0755); err != nil {
		return err
	}

	// Try download with 60s timeout (HuggingFace can be slow)
	client := &http.Client{Timeout: 60 * time.Second}

	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return err
	}
	// Mimic a real browser to avoid 403
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("status %d", resp.StatusCode)
	}

	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}
