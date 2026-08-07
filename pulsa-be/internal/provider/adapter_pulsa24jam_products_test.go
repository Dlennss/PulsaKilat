package provider

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPulsa24JamProducts(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Api-Key"); got != "api-key" {
			t.Fatalf("unexpected API key %q", got)
		}
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		if payload["commands"] != "PRODUK" || payload["pin"] != "1234" {
			t.Fatalf("unexpected payload %#v", payload)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"commands":"PRODUK","items":[{"id":1,"sku":"ML10","nama":"Mobile Legend 10 Diamond","group_name":"GAME","kategori_nama":"Game","brand_nama":"Mobile Legend","tipe_harga":"FIXED","harga":2500}]}`))
	}))
	defer server.Close()

	adapter := NewPulsa24JamAdapter(Pulsa24JamConfig{
		BaseURL:  server.URL,
		APIKey:   "api-key",
		PIN:      "1234",
		Password: "password",
	})
	items, err := adapter.Products(context.Background(), "")
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 || items[0].SKU != "ML10" || items[0].Price == nil || *items[0].Price != 2500 {
		t.Fatalf("unexpected products %#v", items)
	}
}

func TestPulsa24JamProductsRejectsEmptyOrFailedResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"ok":false,"msg":"PIN salah"}`))
	}))
	defer server.Close()

	adapter := NewPulsa24JamAdapter(Pulsa24JamConfig{
		BaseURL:  server.URL,
		APIKey:   "api-key",
		PIN:      "1234",
		Password: "password",
	})
	if _, err := adapter.Products(context.Background(), ""); err == nil {
		t.Fatal("expected product request error")
	}
}
