package handlers

import (
	"strings"
	"testing"
)

func TestBuildIceServersPrefersAuthSecretOverStaticCredentials(t *testing.T) {
	t.Setenv("TURN_EXTERNAL_IP", "45.150.9.229")
	t.Setenv("TURN_TLS_PORT", "5349")

	handler := &TurnHandler{
		secret:      "secret-key",
		staticUser:  "admin",
		staticPass:  "password",
		staticRealm: "vedamatch.ru",
	}

	iceServers := handler.buildIceServers()
	if len(iceServers) != 4 {
		t.Fatalf("expected 4 ice servers, got %d: %#v", len(iceServers), iceServers)
	}
	if iceServers[0].Urls != "stun:stun.l.google.com:19302" {
		t.Fatalf("unexpected stun server: %#v", iceServers[0])
	}
	expectedURLs := []string{
		"turn:45.150.9.229:3478?transport=udp",
		"turn:45.150.9.229:3478?transport=tcp",
		"turns:45.150.9.229:5349?transport=tcp",
	}
	for index, expectedURL := range expectedURLs {
		server := iceServers[index+1]
		if server.Urls != expectedURL {
			t.Fatalf("unexpected turn server at index %d: %#v", index+1, server)
		}
		if server.Username == "admin" {
			t.Fatalf("expected auth-secret credentials, got static credentials: %#v", server)
		}
		if !strings.Contains(server.Username, ":user") {
			t.Fatalf("expected timestamp username, got %#v", server)
		}
		if server.Credential == "" {
			t.Fatalf("expected generated credential, got empty")
		}
	}
}

func TestBuildIceServersFallsBackToStaticCredentials(t *testing.T) {
	t.Setenv("TURN_EXTERNAL_IP", "45.150.9.229")

	handler := &TurnHandler{
		staticUser: "admin",
		staticPass: "password",
	}

	iceServers := handler.buildIceServers()
	if len(iceServers) != 3 {
		t.Fatalf("expected 3 ice servers, got %d: %#v", len(iceServers), iceServers)
	}
	expectedURLs := []string{
		"turn:45.150.9.229:3478?transport=udp",
		"turn:45.150.9.229:3478?transport=tcp",
	}
	for index, expectedURL := range expectedURLs {
		server := iceServers[index+1]
		if server.Urls != expectedURL {
			t.Fatalf("unexpected turn server at index %d: %#v", index+1, server)
		}
		if server.Username != "admin" || server.Credential != "password" {
			t.Fatalf("expected static credentials, got %#v", server)
		}
	}
}
