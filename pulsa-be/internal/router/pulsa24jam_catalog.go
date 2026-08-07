package router

import (
	"context"
	"database/sql"
	"log"
	"os"
	"strings"
	"time"

	"pulsa2/internal/provider"
	"pulsa2/internal/repository"
	"pulsa2/internal/service"
)

func startPulsa24JamCatalogSync(db *sql.DB, client *provider.Pulsa24JamAdapter) {
	if db == nil || client == nil || !client.Configured() {
		return
	}
	interval := 15 * time.Minute
	if raw := strings.TrimSpace(os.Getenv("PULSA24JAM_PRODUCT_SYNC_INTERVAL")); raw != "" {
		if parsed, err := time.ParseDuration(raw); err == nil && parsed >= time.Minute {
			interval = parsed
		} else {
			log.Printf("pulsa24jam product sync interval tidak valid: %q; memakai %s", raw, interval)
		}
	}
	yuscomCatalogURL := strings.TrimSpace(os.Getenv("YUSCOM_PUBLIC_CATALOG_URL"))
	yuscomCatalog := provider.NewYuscomPublicCatalog(yuscomCatalogURL, 45*time.Second)
	syncService := service.NewPulsa24JamCatalogSyncService(repository.NewPulsa24JamCatalogRepository(db), client, yuscomCatalog)
	run := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
		defer cancel()
		result, err := syncService.Sync(ctx)
		if err != nil {
			log.Printf("pulsa24jam product sync gagal: %v", err)
			return
		}
		log.Printf("pulsa24jam product sync selesai: %d produk", result.Synced)
	}
	go func() {
		run()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			run()
		}
	}()
}
