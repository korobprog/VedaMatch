package handlers

import (
	"strings"
	"testing"
)

func TestBuildIceServersPrefersAuthSecretOverStaticCredentials(t *testing.T) {
	t.Setenv("TURN_EXTERNAL_IP", "45.150.9.229")

	handler := &TurnHandler{
		secret:      "secret-key",
		staticUser:  "admin",
		staticPass:  "password",
		staticRealm: "vedamatch.ru",
	}

	iceServers := handler.buildIceServers()
	if len(iceServers) != 2 {
		t.Fatalf("expected 2 ice servers, got %d: %#v", len(iceServers), iceServers)
	}
	if iceServers[0].Urls != "stun:stun.l.google.com:19302" {
		t.Fatalf("unexpected stun server: %#v", iceServers[0])
	}
	if iceServers[1].Username == "admin" {
		t.Fatalf("expected auth-secret credentials, got static credentials: %#v", iceServers[1])
	}
	if !strings.Contains(iceServers[1].Username, ":user") {
		t.Fatalf("expected timestamp username, got %#v", iceServers[1])
	}
	if iceServers[1].Credential == "" {
		t.Fatalf("expected generated credential, got empty")
	}
}

func TestBuildIceServersFallsBackToStaticCredentials(t *testing.T) {
	t.Setenv("TURN_EXTERNAL_IP", "45.150.9.229")

	handler := &TurnHandler{
		staticUser: "admin",
		staticPass: "password",
	}

	iceServers := handler.buildIceServers()
	if len(iceServers) != 2 {
		t.Fatalf("expected 2 ice servers, got %d: %#v", len(iceServers), iceServers)
	}
	if iceServers[1].Username != "admin" || iceServers[1].Credential != "password" {
		t.Fatalf("expected static credentials, got %#v", iceServers[1])
	}
}
