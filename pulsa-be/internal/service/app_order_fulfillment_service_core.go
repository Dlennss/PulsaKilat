package service

import (
	"pulsa2/gemilang"
	"pulsa2/internal/repository"
	"pulsa2/yuscom"
)

type AppOrderFulfillmentService struct {
	orderRepo       *repository.AppOrderRepository
	providerTrxRepo *repository.AppOrderProviderTrxRepository
	callbackRepo    *repository.ProviderCallbackRepository
	pricingRepo     *repository.ProdukAppPricingRepository
	ysClient        *yuscom.Client
	gmClient        *gemilang.Client
}

func NewAppOrderFulfillmentService(orderRepo *repository.AppOrderRepository, providerTrxRepo *repository.AppOrderProviderTrxRepository, callbackRepo *repository.ProviderCallbackRepository, pricingRepo *repository.ProdukAppPricingRepository, ysClient *yuscom.Client, gmClient *gemilang.Client) *AppOrderFulfillmentService {
	return &AppOrderFulfillmentService{
		orderRepo:       orderRepo,
		providerTrxRepo: providerTrxRepo,
		callbackRepo:    callbackRepo,
		pricingRepo:     pricingRepo,
		ysClient:        ysClient,
		gmClient:        gmClient,
	}
}
