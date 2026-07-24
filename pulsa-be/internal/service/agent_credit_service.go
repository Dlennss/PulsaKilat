package service

import (
	"context"
	"errors"
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

func (s *AgentCreditService) SubmitApplication(ctx context.Context, auth helper.AuthInfo, in AgentCreditSubmitInput) (*repository.AgentCreditApplication, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleRetailAgent {
		return nil, errors.New("agent only")
	}
	if in.RequestedAmount <= 0 {
		return nil, errors.New("nominal kredit wajib diisi")
	}
	if in.RequestedAmount > 500000 {
		return nil, errors.New("nominal kredit maksimal Rp500.000")
	}
	if strings.TrimSpace(in.AgentSignature) == "" {
		return nil, errors.New("tanda tangan wajib diisi")
	}
	if in.ApplicantData == nil {
		in.ApplicantData = map[string]any{}
	}
	if in.DocumentData == nil {
		in.DocumentData = map[string]any{}
	}
	return s.repo.CreateApplication(ctx, repository.AgentCreditApplicationInput{
		MemberID:        auth.MemberID,
		RequestedAmount: in.RequestedAmount,
		ApplicantData:   in.ApplicantData,
		DocumentData:    in.DocumentData,
		AgentSignature:  strings.TrimSpace(in.AgentSignature),
	})
}

func (s *AgentCreditService) ListApplications(ctx context.Context, auth helper.AuthInfo) ([]repository.AgentCreditApplication, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleRetailMaster {
		return nil, errors.New("master only")
	}
	return s.repo.ListApplications(ctx, 50)
}

func (s *AgentCreditService) ListMyApplications(ctx context.Context, auth helper.AuthInfo) ([]repository.AgentCreditApplication, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleRetailAgent {
		return nil, errors.New("agent only")
	}
	return s.repo.ListMemberApplications(ctx, auth.MemberID, 10)
}

func (s *AgentCreditService) DecideApplication(ctx context.Context, auth helper.AuthInfo, in AgentCreditDecisionInput) (*repository.AgentCreditApplication, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleRetailMaster {
		return nil, errors.New("master only")
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
