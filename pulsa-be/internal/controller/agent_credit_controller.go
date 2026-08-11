package controller

import (
	"encoding/json"
	"net/http"

	"pulsa2/internal/helper"
	"pulsa2/internal/service"
)

type AgentCreditController struct {
	svc *service.AgentCreditService
}

func NewAgentCreditController(svc *service.AgentCreditService) *AgentCreditController {
	return &AgentCreditController{svc: svc}
}

func (h *AgentCreditController) MyApplications(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		auth, ok := helper.GetAuth(r.Context())
		if !ok {
			helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
			return
		}
		items, err := h.svc.ListMyApplications(r.Context(), auth)
		if err != nil {
			helper.WriteJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": err.Error()})
			return
		}
		helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "items": items})
		return
	}
	if r.Method != http.MethodPost {
		helper.WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	auth, ok := helper.GetAuth(r.Context())
	if !ok {
		helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	var in service.AgentCreditSubmitInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	item, err := h.svc.SubmitApplication(r.Context(), auth, in)
	if err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "item": item})
}

func (h *AgentCreditController) MasterApplications(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		auth, ok := helper.GetAuth(r.Context())
		if !ok {
			helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
			return
		}
		var in service.AgentCreditSubmitInput
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
			return
		}
		item, err := h.svc.SubmitApplication(r.Context(), auth, in)
		if err != nil {
			helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": err.Error()})
			return
		}
		helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "item": item})
		return
	}
	if r.Method != http.MethodGet {
		helper.WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	auth, ok := helper.GetAuth(r.Context())
	if !ok {
		helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	items, err := h.svc.ListApplications(r.Context(), auth)
	if err != nil {
		helper.WriteJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "items": items})
}

func (h *AgentCreditController) MasterDecision(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helper.WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	auth, ok := helper.GetAuth(r.Context())
	if !ok {
		helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	var in service.AgentCreditDecisionInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	item, err := h.svc.DecideApplication(r.Context(), auth, in)
	if err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "item": item})
}

func (h *AgentCreditController) CreditRanks(w http.ResponseWriter, r *http.Request) {
	auth, ok := helper.GetAuth(r.Context())
	if !ok {
		helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	if r.Method == http.MethodGet {
		items, err := h.svc.ListRanks(r.Context(), auth)
		if err != nil {
			helper.WriteJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": err.Error()})
			return
		}
		helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "items": items})
		return
	}
	if r.Method != http.MethodPost {
		helper.WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	var in service.AgentCreditRankChangeInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	item, err := h.svc.ChangeMemberCreditRank(r.Context(), auth, in)
	if err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "item": item})
}

func (h *AgentCreditController) AdminLoanStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helper.WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	auth, ok := helper.GetAuth(r.Context())
	if !ok {
		helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	var in service.AgentCreditLoanStatusInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	item, err := h.svc.SetLoanOperationalStatus(r.Context(), auth, in)
	if err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "item": item})
}

func (h *AgentCreditController) AdminTeamActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		helper.WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	auth, ok := helper.GetAuth(r.Context())
	if !ok {
		helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	items, err := h.svc.ListTeamActivity(r.Context(), auth, helper.QueryString(r, "role"), helper.QueryInt(r, "limit", 50))
	if err != nil {
		helper.WriteJSON(w, http.StatusForbidden, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "items": items})
}

func (h *AgentCreditController) PayInstallment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helper.WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	auth, ok := helper.GetAuth(r.Context())
	if !ok {
		helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	var in service.AgentCreditPaymentInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	if err := h.svc.PayInstallment(r.Context(), auth, in); err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *AgentCreditController) TransferToMainBalance(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		helper.WriteJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "method not allowed"})
		return
	}
	auth, ok := helper.GetAuth(r.Context())
	if !ok {
		helper.WriteJSON(w, http.StatusUnauthorized, map[string]any{"ok": false, "error": "unauthorized"})
		return
	}
	var in service.AgentCreditTransferInput
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "invalid json"})
		return
	}
	item, err := h.svc.TransferToMainBalance(r.Context(), auth, in)
	if err != nil {
		helper.WriteJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	helper.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "item": item})
}
