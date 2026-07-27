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
	ReviewerMode   string `json:"reviewer_mode"`
}

type AgentCreditPaymentInput struct {
	ApplicationID int64  `json:"application_id"`
	MemberID      int64  `json:"member_id"`
	Amount        int64  `json:"amount"`
	Note          string `json:"note"`
}

func isCreditReviewer(role string) bool {
	normalized := helper.NormalizeRole(role)
	return normalized == helper.RoleRetailMaster || normalized == helper.RoleRetailMarketing || normalized == helper.RoleRetailAnalyst
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
	reviewerMode := strings.TrimSpace(strings.ToLower(in.ReviewerMode))
	approvedAmount := in.ApprovedAmount
	limitAmount, err := s.repo.GetApplicationCreditLimit(ctx, in.ID)
	if err != nil {
		return nil, err
	}
	reviewState, err := s.repo.GetApplicationReviewState(ctx, in.ID)
	if err != nil {
		return nil, err
	}

	if reviewerMode == "analyst" || strings.HasPrefix(decision, "recommend_") || reviewState.Status == "submitted" || reviewState.Status == "marketing_review" || reviewState.Status == "analysis_review" {
		return s.reviewAsAnalyst(ctx, auth, in.ID, reviewState, decision, note, approvedAmount, limitAmount)
	}

	switch role {
	case helper.RoleRetailMarketing:
		switch decision {
		case "approve", "approved", "setujui", "forward", "teruskan":
			return s.repo.MarketingReviewApplication(ctx, repository.AgentCreditDecisionInput{
				ID:            in.ID,
				MarketingID:   auth.MemberID,
				Status:        "analysis_review",
				MarketingNote: fallbackNote(note, "Dokumen lengkap, diteruskan ke analis."),
			})
		case "reject", "rejected", "tolak":
			return s.repo.MarketingReviewApplication(ctx, repository.AgentCreditDecisionInput{
				ID:            in.ID,
				MarketingID:   auth.MemberID,
				Status:        "rejected",
				MarketingNote: fallbackNote(note, "Dokumen belum sesuai."),
			})
		default:
			return nil, errors.New("marketing hanya bisa teruskan atau tolak")
		}
	case helper.RoleRetailMaster:
		switch reviewState.Status {
		case "submitted", "marketing_review":
			switch decision {
			case "approve", "approved", "setujui", "forward", "teruskan":
				return s.repo.MarketingReviewApplication(ctx, repository.AgentCreditDecisionInput{
					ID:            in.ID,
					MarketingID:   auth.MemberID,
					Status:        "analysis_review",
					MarketingNote: fallbackNote(note, "Dokumen lengkap, diteruskan ke analis."),
				})
			case "reject", "rejected", "tolak":
				return s.repo.MarketingReviewApplication(ctx, repository.AgentCreditDecisionInput{
					ID:            in.ID,
					MarketingID:   auth.MemberID,
					Status:        "rejected",
					MarketingNote: fallbackNote(note, "Dokumen belum sesuai."),
				})
			default:
				return nil, errors.New("master hanya bisa teruskan ke analis atau tolak")
			}
		case "analysis_review":
			return nil, errors.New("pengajuan masih menunggu persetujuan analis")
		case "master_review", "approved", "rejected":
		default:
			return nil, errors.New("status pengajuan belum bisa diputuskan master")
		}
		status := ""
		switch decision {
		case "approve", "approved", "setujui":
			status = "approved"
		case "reject", "rejected", "tolak":
			status = "rejected"
		default:
			return nil, errors.New("keputusan wajib setujui atau tolak")
		}
		if status == "approved" {
			if reviewState.AnalystRecommendation != "approved" {
				return nil, errors.New("pengajuan harus disetujui analis sebelum ACC master")
			}
			if approvedAmount <= 0 {
				approvedAmount = reviewState.AnalystRecommendedAmount
			}
			if approvedAmount <= 0 {
				return nil, errors.New("nominal disetujui wajib diisi")
			}
			if approvedAmount > limitAmount {
				return nil, fmt.Errorf("nominal disetujui maksimal Rp%d", limitAmount)
			}
		}
		return s.repo.DecideApplication(ctx, repository.AgentCreditDecisionInput{
			ID:             in.ID,
			MasterID:       auth.MemberID,
			Status:         status,
			ApprovedAmount: approvedAmount,
			MarketingNote:  fallbackNote(note, "Keputusan final master."),
		})
	case helper.RoleRetailAnalyst:
		return s.reviewAsAnalyst(ctx, auth, in.ID, reviewState, decision, note, approvedAmount, limitAmount)
	default:
		return nil, errors.New("role reviewer tidak valid")
	}
}

func (s *AgentCreditService) reviewAsAnalyst(ctx context.Context, auth helper.AuthInfo, applicationID int64, reviewState *repository.AgentCreditReviewState, decision, note string, approvedAmount, limitAmount int64) (*repository.AgentCreditApplication, error) {
	if reviewState.Status != "submitted" && reviewState.Status != "marketing_review" && reviewState.Status != "analysis_review" {
		return nil, errors.New("pengajuan belum masuk atau sudah selesai dianalisa")
	}
	switch decision {
	case "approve", "approved", "setujui", "recommend_approve":
		if approvedAmount <= 0 {
			approvedAmount = limitAmount
		}
		if approvedAmount > limitAmount {
			return nil, fmt.Errorf("nominal rekomendasi maksimal Rp%d", limitAmount)
		}
		return s.repo.AnalystReviewApplication(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			AnalystID:      auth.MemberID,
			ApprovedAmount: approvedAmount,
			AnalystNote:    fallbackNote(note, "Agent layak dengan risiko terkendali."),
			Recommendation: "approved",
		})
	case "reject", "rejected", "tolak", "recommend_reject":
		return s.repo.AnalystReviewApplication(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			AnalystID:      auth.MemberID,
			ApprovedAmount: 0,
			AnalystNote:    fallbackNote(note, "Risiko belum memenuhi kriteria."),
			Recommendation: "rejected",
		})
	default:
		return nil, errors.New("analis hanya bisa rekomendasikan setuju atau tolak")
	}
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
	return s.repo.PayInstallment(ctx, repository.AgentCreditPaymentInput{
		ApplicationID: in.ApplicationID,
		MemberID:      auth.MemberID,
		Amount:        in.Amount,
		Note:          strings.TrimSpace(in.Note),
	})
}
