package router

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"time"

	"pulsa2/internal/controller"
	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
	"pulsa2/internal/service"
	"pulsa2/loketbayar"
)

func DepositRouter(mux *http.ServeMux, wrap Middleware, db *sql.DB, lbClient *loketbayar.Client) {
	repo := repository.NewDepositRepository(db)
	bankRepo := repository.NewBankRepository(db)
	svc := service.NewDepositService(repo, bankRepo, lbClient)
	ctrl := controller.NewDepositController(svc)

	// member
	mux.HandleFunc("/v1/deposit/banks", wrap(ctrl.MemberBanks))
	mux.HandleFunc("/v1/deposit/request", wrap(ctrl.MemberCreate))
	mux.HandleFunc("/v1/deposit/request/confirm-transfer", wrap(ctrl.MemberConfirmTransfer))
	mux.HandleFunc("/v1/deposit/request/cancel-ticket", wrap(ctrl.MemberCancelTicket))
	mux.HandleFunc("/v1/deposit/request/qris", wrap(ctrl.MemberCreateQris))
	mux.HandleFunc("/v1/deposit/request/qris/status", wrap(ctrl.MemberQrisStatus))
	mux.HandleFunc("/v1/deposit/request/va", wrap(ctrl.MemberCreateVA))
	mux.HandleFunc("/v1/history/deposit", wrap(ctrl.MemberList))

	// admin / operator read-only list
	mux.HandleFunc("/v1/admin/deposit/requests", wrap(helper.RequireRoles("admin", "operator_trx", "operator_wallet")(ctrl.AdminList)))
	mux.HandleFunc("/v1/admin/deposit/requests/va", wrap(helper.RequireRoles("admin", "operator_trx", "operator_wallet")(ctrl.AdminListVA)))
	// admin / operator wallet write actions
	mux.HandleFunc("/v1/admin/deposit/requests/approve", wrap(helper.RequireRoles("admin", "operator_wallet")(ctrl.AdminApprove)))
	mux.HandleFunc("/v1/admin/deposit/requests/reject", wrap(helper.RequireRoles("admin", "operator_wallet")(ctrl.AdminReject)))
	mux.HandleFunc("/v1/admin/deposit/requests/va/approve", wrap(helper.RequireRoles("admin", "operator_wallet")(ctrl.AdminApproveVA)))
	mux.HandleFunc("/v1/admin/deposit/requests/va/reject", wrap(helper.RequireRoles("admin", "operator_wallet")(ctrl.AdminRejectVA)))

	// internal admin token
	mux.HandleFunc("/admin/deposit/credit", ctrl.AdminCreditInternal)

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			n, err := svc.AutoApprovePendingFromBankMutations(ctx, 5)
			cancel()
			if err != nil {
				log.Printf("[deposit_auto_approve] error: %v", err)
				continue
			}
			if n > 0 {
				log.Printf("[deposit_auto_approve] %d deposit approved", n)
			}
		}
	}()
}
