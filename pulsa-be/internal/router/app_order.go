package router

import (
	"database/sql"
	"net/http"

	"pulsa2/gemilang"
	"pulsa2/internal/controller"
	"pulsa2/internal/repository"
	"pulsa2/internal/service"
	"pulsa2/yuscom"
)

func AppOrderRouter(mux *http.ServeMux, db *sql.DB, jwtSecret []byte, ysClient *yuscom.Client, gmClient *gemilang.Client) {
	orderRepo := repository.NewAppOrderRepository(db)
	produkRepo := repository.NewProdukRepository(db)
	pricingRepo := repository.NewProdukAppPricingRepository(db)
	feeRepo := repository.NewKategoriFeeAppRepository(db)
	paymentRepo := repository.NewAppOrderPaymentRepository(db)
	bankRepo := repository.NewBankRepository(db)
	appProviderRepo := repository.NewAppOrderProviderTrxRepository(db)
	billingCheckRepo := repository.NewAppBillingCheckRepository(db)
	svc := service.NewAppOrderService(orderRepo, paymentRepo, produkRepo, pricingRepo, feeRepo, appProviderRepo, billingCheckRepo)
	billingCheckSvc := service.NewAppBillingCheckService(billingCheckRepo, produkRepo, pricingRepo, ysClient)
	callbackRepo := repository.NewProviderCallbackRepository(db)
	fulfillmentSvc := service.NewAppOrderFulfillmentService(orderRepo, appProviderRepo, callbackRepo, pricingRepo, ysClient, gmClient)
	paymentSvc := service.NewAppOrderPaymentService(paymentRepo, orderRepo, bankRepo, fulfillmentSvc)
	ctrl := controller.NewAppOrderController(svc, paymentSvc, "/v1/app", jwtSecret)
	billingCtrl := controller.NewAppBillingCheckController(billingCheckSvc, "/v1/app", jwtSecret)

	mux.HandleFunc("/v1/app/orders", ctrl.Handle)
	mux.HandleFunc("/v1/app/orders/", ctrl.Handle)
	mux.HandleFunc("/v1/app/billing-checks", billingCtrl.Handle)
	mux.HandleFunc("/v1/app/billing-checks/", billingCtrl.Handle)
}
