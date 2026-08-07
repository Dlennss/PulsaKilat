package service

import (
	"context"
	"fmt"
	"strings"

	"pulsa2/internal/provider"
	"pulsa2/internal/repository"
)

type Pulsa24JamCatalogSyncService struct {
	repo          *repository.Pulsa24JamCatalogRepository
	client        *provider.Pulsa24JamAdapter
	yuscomCatalog *provider.YuscomPublicCatalog
}

func NewPulsa24JamCatalogSyncService(dbRepo *repository.Pulsa24JamCatalogRepository, client *provider.Pulsa24JamAdapter, yuscomCatalog *provider.YuscomPublicCatalog) *Pulsa24JamCatalogSyncService {
	return &Pulsa24JamCatalogSyncService{repo: dbRepo, client: client, yuscomCatalog: yuscomCatalog}
}

func (s *Pulsa24JamCatalogSyncService) Sync(ctx context.Context) (*repository.Pulsa24JamCatalogSyncResult, error) {
	if s == nil || s.repo == nil || s.client == nil || !s.client.Configured() || s.yuscomCatalog == nil {
		return nil, fmt.Errorf("sinkronisasi katalog Pulsa24Jam belum dikonfigurasi")
	}
	yuscomCodes, err := s.yuscomCatalog.OpenProductCodes(ctx)
	if err != nil {
		return nil, fmt.Errorf("validasi katalog Yuscom gagal: %w", err)
	}
	products, err := s.client.Products(ctx, "")
	if err != nil {
		return nil, err
	}
	items := make([]repository.Pulsa24JamCatalogItem, 0, len(products))
	for _, product := range products {
		if _, ok := yuscomCodes[strings.ToUpper(strings.TrimSpace(product.SKU))]; !ok {
			continue
		}
		price := int64(0)
		if product.Price != nil {
			price = *product.Price
		} else if product.AdditionalFee != nil {
			price = *product.AdditionalFee
		}
		items = append(items, repository.Pulsa24JamCatalogItem{
			SKU:            product.SKU,
			Name:           product.Name,
			GroupName:      product.GroupName,
			CategoryName:   product.CategoryName,
			BrandName:      product.BrandName,
			PriceType:      product.PriceType,
			Price:          price,
			MaximumNominal: product.MaximumNominal,
		})
	}
	return s.repo.Sync(ctx, items)
}
