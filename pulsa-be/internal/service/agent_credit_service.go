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
}

type AgentCreditDecisionInput struct {
	ID             int64  `json:"id"`
	Decision       string `json:"decision"`
	ApprovedAmount int64  `json:"approved_amount"`
	Note           string `json:"note"`
}

type AgentCreditPaymentInput struct {
	ApplicationID int64  `json:"application_id"`
	MemberID      int64  `json:"member_id"`
	Amount        int64  `json:"amount"`
	Note          string `json:"note"`
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
	tenorMonths := normalizeCreditTenor(in.ApplicantData["tenor_months"])
	if tenorMonths == 0 {
		return nil, errors.New("tenor cicilan wajib pilih 3, 6, atau 12 bulan")
	}
	in.ApplicantData["tenor_months"] = tenorMonths
	in.ApplicantData["tenor_label"] = fmt.Sprintf("%d bulan", tenorMonths)
	if role == helper.RoleRetailAgent {
		in.RequestedAmount = 500000
	}
	if in.RequestedAmount <= 0 {
		return nil, errors.New("nominal kredit wajib diisi")
	}
	if in.RequestedAmount > 500000 {
		return nil, errors.New("nominal kredit maksimal Rp500.000")
	}
	if role == helper.RoleRetailAgent && strings.TrimSpace(in.AgentSignature) == "" {
		return nil, errors.New("tanda tangan wajib diisi")
	}
	if in.DocumentData == nil {
		in.DocumentData = map[string]any{}
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
	status := ""
	switch decision {
	case "approve", "approved", "setujui":
		status = "approved"
	case "reject", "rejected", "tolak":
		status = "rejected"
	default:
		return nil, errors.New("keputusan wajib setujui atau tolak")
	}

	approvedAmount := in.ApprovedAmount
	if status == "approved" {
		if approvedAmount <= 0 {
			return nil, errors.New("nominal disetujui wajib diisi")
		}
		if approvedAmount > 500000 {
			return nil, errors.New("nominal disetujui maksimal Rp500.000")
		}
	}

	return s.repo.DecideApplication(ctx, repository.AgentCreditDecisionInput{
		ID:             in.ID,
		MarketingID:    auth.MemberID,
		Status:         status,
		ApprovedAmount: approvedAmount,
		MarketingNote:  strings.TrimSpace(in.Note),
	})
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
	return s.repo.PayInstallment(ctx, repository.AgentCreditPaymentInput{
		ApplicationID: in.ApplicationID,
		MemberID:      auth.MemberID,
		Amount:        in.Amount,
		Note:          strings.TrimSpace(in.Note),
	})
}
