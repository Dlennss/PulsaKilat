package service

import (
	"testing"

	"pulsa2/internal/provider"
)

func TestPulsa24JamCatalogProductUnavailable(t *testing.T) {
	tests := []struct {
		name    string
		product provider.Pulsa24JamProduct
		want    bool
	}{
		{
			name:    "indosat pulsa is unavailable",
			product: provider.Pulsa24JamProduct{SKU: "YIT10", BrandName: "indosat", CategoryName: "Pulsa"},
			want:    true,
		},
		{
			name:    "indosat data is unavailable",
			product: provider.Pulsa24JamProduct{SKU: "IDY1", BrandName: "indosat", CategoryName: "Paket Data"},
			want:    true,
		},
		{
			name:    "gopay driver is unavailable",
			product: provider.Pulsa24JamProduct{SKU: "UDGD15", BrandName: "gopay", CategoryName: "E-Money"},
			want:    true,
		},
		{
			name:    "dana remains available",
			product: provider.Pulsa24JamProduct{SKU: "DANA", BrandName: "dana", CategoryName: "E-Money"},
			want:    false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := pulsa24JamCatalogProductUnavailable(tt.product); got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}
