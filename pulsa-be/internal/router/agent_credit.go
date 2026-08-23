package router

import (
	"database/sql"
	"net/http"

	"pulsa2/internal/controller"
	"pulsa2/internal/repository"
	"pulsa2/internal/service"
)

func AgentCreditRouter(mux *http.ServeMux, wrap Middleware, db *sql.DB) {
	repo := repository.NewAgentCreditRepository(db)
	svc := service.NewAgentCreditService(repo)
	ctrl := controller.NewAgentCreditController(svc)

	mux.HandleFunc("/v1/me/agent-credit/applications", wrap(ctrl.MyApplications))
	mux.HandleFunc("/v1/me/agent-credit/payments", wrap(ctrl.PayInstallment))
	mux.HandleFunc("/v1/me/agent-credit/transfers", wrap(ctrl.TransferToMainBalance))
	mux.HandleFunc("/v1/master/agent-credit/applications", wrap(ctrl.MasterApplications))
	mux.HandleFunc("/v1/master/agent-credit/applications/delete", wrap(ctrl.DeleteRejectedApplication))
	mux.HandleFunc("/v1/master/agent-credit/applications/decision", wrap(ctrl.MasterDecision))
	mux.HandleFunc("/v1/master/agent-credit/ranks", wrap(ctrl.CreditRanks))
	mux.HandleFunc("/v1/admin/agent-credit/applications", wrap(ctrl.MasterApplications))
	mux.HandleFunc("/v1/admin/agent-credit/applications/delete", wrap(ctrl.DeleteRejectedApplication))
	mux.HandleFunc("/v1/admin/agent-credit/applications/decision", wrap(ctrl.MasterDecision))
	mux.HandleFunc("/v1/admin/agent-credit/loans/status", wrap(ctrl.AdminLoanStatus))
	mux.HandleFunc("/v1/admin/agent-credit/team-activity", wrap(ctrl.AdminTeamActivity))
}
