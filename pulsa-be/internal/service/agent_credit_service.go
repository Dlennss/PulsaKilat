package service

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
)

type AgentCreditService struct {
	repo *repository.AgentCreditRepository
}

func NewAgentCreditService(repo *repository.AgentCreditRepository) *AgentCreditService {
	return &AgentCreditService{repo: repo}
}

type AgentCreditSubmitInput struct {
	MemberID        int64          `json:"member_id"`
	RequestedAmount int64          `json:"requested_amount"`
	ApplicantData   map[string]any `json:"applicant_data"`
	DocumentData    map[string]any `json:"document_data"`
	AgentSignature  string         `json:"agent_signature"`
	TermsAccepted   bool           `json:"terms_accepted"`
}

type AgentCreditDecisionInput struct {
	ID             int64  `json:"id"`
	Decision       string `json:"decision"`
	ApprovedAmount int64  `json:"approved_amount"`
	Note           string `json:"note"`
	ReviewerMode   string `json:"reviewer_mode"`
}

type AgentCreditPaymentInput struct {
	ApplicationID int64          `json:"application_id"`
	MemberID      int64          `json:"member_id"`
	Amount        int64          `json:"amount"`
	Note          string         `json:"note"`
	PaymentMethod string         `json:"payment_method"`
	PaymentProof  map[string]any `json:"payment_proof"`
}

func isCreditReviewer(role string) bool {
	normalized := helper.NormalizeRole(role)
	return normalized == helper.RoleRetailMaster || normalized == helper.RoleRetailMarketing
}

func normalizeCreditTenor(value any) int64 {
	var tenor int64
	switch v := value.(type) {
	case int:
		tenor = int64(v)
	case int64:
		tenor = v
	case float64:
		tenor = int64(math.Round(v))
	case string:
		switch strings.TrimSpace(v) {
		case "3":
			tenor = 3
		case "6":
			tenor = 6
		case "12":
			tenor = 12
		}
	}
	switch tenor {
	case 3, 6, 12:
		return tenor
	default:
		return 0
	}
}

func (s *AgentCreditService) SubmitApplication(ctx context.Context, auth helper.AuthInfo, in AgentCreditSubmitInput) (*repository.AgentCreditApplication, error) {
	role := helper.NormalizeRole(auth.Role)
	targetMemberID := auth.MemberID
	if role == helper.RoleRetailAgent {
		if in.MemberID > 0 && in.MemberID != auth.MemberID {
			return nil, errors.New("agent hanya bisa mengajukan untuk akun sendiri")
		}
	} else if isCreditReviewer(role) {
		if in.MemberID <= 0 {
			return nil, errors.New("member_id peminjam wajib diisi")
		}
		targetMemberID = in.MemberID
	} else {
		return nil, errors.New("tidak punya akses pengajuan kredit")
	}
	if in.ApplicantData == nil {
		in.ApplicantData = map[string]any{}
	}
	if !in.TermsAccepted {
		if accepted, ok := in.ApplicantData["terms_accepted"].(bool); ok {
			in.TermsAccepted = accepted
		}
	}
	if !in.TermsAccepted {
		return nil, errors.New("syarat dan ketentuan wajib disetujui")
	}
	in.ApplicantData["terms_accepted"] = true
	in.ApplicantData["terms_version"] = "pulsakilat-agent-credit-2026-07"
	tenorMonths := normalizeCreditTenor(in.ApplicantData["tenor_months"])
	if tenorMonths == 0 {
		return nil, errors.New("tenor cicilan wajib pilih 3, 6, atau 12 bulan")
	}
	in.ApplicantData["tenor_months"] = tenorMonths
	in.ApplicantData["tenor_label"] = fmt.Sprintf("%d bulan", tenorMonths)
	if role == helper.RoleRetailAgent {
		profile, err := s.repo.GetMemberCreditProfile(ctx, auth.MemberID)
		if err != nil {
			return nil, err
		}
		in.RequestedAmount = profile.LimitAmount
	}
	if in.RequestedAmount <= 0 {
		return nil, errors.New("nominal kredit wajib diisi")
	}
	limitAmount := int64(500000)
	if profile, err := s.repo.GetMemberCreditProfile(ctx, targetMemberID); err == nil && profile != nil {
		limitAmount = profile.LimitAmount
	}
	if in.RequestedAmount > limitAmount {
		return nil, fmt.Errorf("nominal kredit maksimal Rp%d", limitAmount)
	}
	if role == helper.RoleRetailAgent && strings.TrimSpace(in.AgentSignature) == "" {
		return nil, errors.New("tanda tangan wajib diisi")
	}
	if in.DocumentData == nil {
		in.DocumentData = map[string]any{}
	}
	if role == helper.RoleRetailAgent {
		if selfie, hasLegacySelfie := in.DocumentData["selfie"]; hasLegacySelfie {
			if _, ok := in.DocumentData["selfie_ktp"]; !ok {
				in.DocumentData["selfie_ktp"] = selfie
			}
		}
		requiredDocuments := map[string]string{
			"ktp":              "foto KTP wajib diupload",
			"store":            "foto toko wajib diupload",
			"selfie_ktp":       "foto selfie memegang KTP wajib diupload",
			"selfie_marketing": "foto selfie dengan marketing wajib diupload",
		}
		for key, message := range requiredDocuments {
			if in.DocumentData[key] == nil {
				return nil, errors.New(message)
			}
		}
	}
	return s.repo.CreateApplication(ctx, repository.AgentCreditApplicationInput{
		MemberID:        targetMemberID,
		RequestedAmount: in.RequestedAmount,
		ApplicantData:   in.ApplicantData,
		DocumentData:    in.DocumentData,
		AgentSignature:  strings.TrimSpace(in.AgentSignature),
	})
}

func (s *AgentCreditService) ListApplications(ctx context.Context, auth helper.AuthInfo) ([]repository.AgentCreditApplication, error) {
	if !isCreditReviewer(auth.Role) {
		return nil, errors.New("reviewer only")
	}
	return s.repo.ListApplications(ctx, 50)
}

func (s *AgentCreditService) ListMyApplications(ctx context.Context, auth helper.AuthInfo) ([]repository.AgentCreditApplication, error) {
	role := helper.NormalizeRole(auth.Role)
	if role != helper.RoleRetailAgent && role != helper.RoleUser {
		return nil, errors.New("user only")
	}
	return s.repo.ListMemberApplications(ctx, auth.MemberID, 10)
}

func (s *AgentCreditService) DecideApplication(ctx context.Context, auth helper.AuthInfo, in AgentCreditDecisionInput) (*repository.AgentCreditApplication, error) {
	if !isCreditReviewer(auth.Role) {
		return nil, errors.New("reviewer only")
	}
	if in.ID <= 0 {
		return nil, errors.New("pengajuan tidak valid")
	}

	decision := strings.TrimSpace(strings.ToLower(in.Decision))
	role := helper.NormalizeRole(auth.Role)
	note := strings.TrimSpace(in.Note)
	approvedAmount := in.ApprovedAmount
	limitAmount, err := s.repo.GetApplicationCreditLimit(ctx, in.ID)
	if err != nil {
		return nil, err
	}
	reviewState, err := s.repo.GetApplicationReviewState(ctx, in.ID)
	if err != nil {
		return nil, err
	}

	switch role {
	case helper.RoleRetailMarketing:
		return s.decideAsMaster(ctx, auth.MemberID, in.ID, reviewState, decision, note, approvedAmount, limitAmount)
	case helper.RoleRetailMaster:
		return s.decideAsMaster(ctx, auth.MemberID, in.ID, reviewState, decision, note, approvedAmount, limitAmount)
	default:
		return nil, errors.New("role reviewer tidak valid")
	}
}

func (s *AgentCreditService) decideAsMaster(ctx context.Context, masterID, applicationID int64, reviewState *repository.AgentCreditReviewState, decision, note string, approvedAmount, limitAmount int64) (*repository.AgentCreditApplication, error) {
	if reviewState.Status != "submitted" && reviewState.Status != "marketing_review" && reviewState.Status != "analysis_review" && reviewState.Status != "master_review" && reviewState.Status != "approved" && reviewState.Status != "master_rejected" && reviewState.Status != "rejected" {
		return nil, errors.New("status pengajuan belum bisa diputuskan master")
	}
	status := ""
	switch decision {
	case "approve", "approved", "setujui":
		status = "approved"
		if approvedAmount <= 0 {
			approvedAmount = limitAmount
		}
		if approvedAmount > limitAmount {
			return nil, fmt.Errorf("nominal disetujui maksimal Rp%d", limitAmount)
		}
		if approvedAmount <= 0 {
			return nil, errors.New("nominal disetujui wajib diisi")
		}
	case "reject", "rejected", "tolak":
		status = "master_rejected"
		approvedAmount = 0
	default:
		return nil, errors.New("keputusan wajib setujui atau tolak")
	}
	return s.repo.DecideApplication(ctx, repository.AgentCreditDecisionInput{
		ID:             applicationID,
		MasterID:       masterID,
		Status:         status,
		ApprovedAmount: approvedAmount,
		MarketingNote:  fallbackNote(note, "Keputusan final master."),
	})
}

func fallbackNote(note, fallback string) string {
	if strings.TrimSpace(note) != "" {
		return strings.TrimSpace(note)
	}
	return fallback
}

func (s *AgentCreditService) PayInstallment(ctx context.Context, auth helper.AuthInfo, in AgentCreditPaymentInput) error {
	role := helper.NormalizeRole(auth.Role)
	if role != helper.RoleRetailAgent && role != helper.RoleUser {
		return errors.New("user only")
	}
	if in.ApplicationID <= 0 {
		return errors.New("pengajuan tidak valid")
	}
	if in.Amount <= 0 {
		return errors.New("nominal cicilan wajib diisi")
	}
	if strings.TrimSpace(in.PaymentMethod) == "" {
		in.PaymentMethod = "transfer"
	}
	proofURL, _ := in.PaymentProof["data_url"].(string)
	if !strings.HasPrefix(strings.TrimSpace(proofURL), "data:image/") {
		return errors.New("bukti transfer wajib diupload")
	}
	return s.repo.PayInstallment(ctx, repository.AgentCreditPaymentInput{
		ApplicationID: in.ApplicationID,
		MemberID:      auth.MemberID,
		Amount:        in.Amount,
		Note:          strings.TrimSpace(in.Note),
		PaymentMethod: strings.TrimSpace(in.PaymentMethod),
		PaymentProof:  in.PaymentProof,
	})
}
