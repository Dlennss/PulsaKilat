package provider

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPulsa24JamProducts(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/v1/app/produk" {
			t.Fatalf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("X-Api-Key"); got != "api-key" {
			t.Fatalf("unexpected API key %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"items":[{"id":1,"sku":"ML10","nama":"Mobile Legend 10 Diamond","group_name":"GAME","kategori_nama":"Game","brand_nama":"Mobile Legend","tipe_harga":"FIXED","harga_dasar_app":2500,"aktif":true},{"id":2,"sku":"OFF","nama":"Nonaktif","aktif":false}]}`))
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
	if len(items) != 1 || items[0].SKU != "ML10" || items[0].AppBasePrice == nil || *items[0].AppBasePrice != 2500 {
		t.Fatalf("unexpected products %#v", items)
	}
}

func TestPulsa24JamProductsRejectsEmptyOrFailedResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"ok":false,"msg":"katalog gagal"}`))
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
