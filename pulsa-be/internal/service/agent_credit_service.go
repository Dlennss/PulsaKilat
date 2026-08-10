package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
)

const minimumAgentCreditAmount int64 = 100000

type AgentCreditService struct {
	repo *repository.AgentCreditRepository
}

func NewAgentCreditService(repo *repository.AgentCreditRepository) *AgentCreditService {
	return &AgentCreditService{repo: repo}
}

type AgentCreditSubmitInput struct {
	ID              int64          `json:"id"`
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
	SignatureData  string `json:"signature_data"`
	RiskLevel      string `json:"risk_level"`
	RiskScore      int64  `json:"risk_score"`
}

type AgentCreditPaymentInput struct {
	ApplicationID int64          `json:"application_id"`
	MemberID      int64          `json:"member_id"`
	Amount        int64          `json:"amount"`
	Note          string         `json:"note"`
	PaymentMethod string         `json:"payment_method"`
	PaymentProof  map[string]any `json:"payment_proof"`
}

type AgentCreditTransferInput struct {
	ApplicationID int64 `json:"application_id"`
	Amount        int64 `json:"amount"`
}

type AgentCreditRankChangeInput struct {
	MemberID int64  `json:"member_id"`
	RankID   int64  `json:"rank_id"`
	Reason   string `json:"reason"`
}

func isCreditReviewer(role string) bool {
	normalized := helper.NormalizeRole(role)
	return normalized == helper.RoleAdmin ||
		normalized == helper.RoleStaff ||
		normalized == helper.RoleRetailMaster ||
		normalized == helper.RoleRetailMarketing ||
		normalized == helper.RoleRetailAnalyst
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
	if role == helper.RoleRetailAgent {
		if !in.TermsAccepted {
			return nil, errors.New("syarat dan ketentuan wajib disetujui")
		}
		in.ApplicantData["terms_accepted"] = in.TermsAccepted
		in.ApplicantData["terms_version"] = "pulsakilat-agent-credit-2026-07"
	} else if in.TermsAccepted {
		in.ApplicantData["terms_accepted"] = true
		in.ApplicantData["terms_version"] = "pulsakilat-agent-credit-2026-07"
	}
	if role == helper.RoleRetailAgent {
		profile, err := s.repo.GetMemberCreditProfile(ctx, auth.MemberID)
		if err != nil {
			return nil, err
		}
		if in.RequestedAmount <= 0 {
			in.RequestedAmount = profile.LimitAmount
		}
	}
	if in.RequestedAmount <= 0 {
		return nil, errors.New("nominal kredit wajib diisi")
	}
	limitAmount := int64(500000)
	if profile, err := s.repo.GetMemberCreditProfile(ctx, targetMemberID); err == nil && profile != nil {
		limitAmount = profile.LimitAmount
	}
	if in.RequestedAmount < minimumAgentCreditAmount {
		return nil, errors.New("nominal kredit minimal Rp100000")
	}
	if in.RequestedAmount > limitAmount {
		return nil, fmt.Errorf("nominal kredit maksimal Rp%d", limitAmount)
	}
	if in.DocumentData == nil {
		in.DocumentData = map[string]any{}
	}
	validateFullSubmission := role == helper.RoleRetailAgent || (isCreditReviewer(role) && in.ID <= 0)
	if validateFullSubmission {
		validateDocuments := role == helper.RoleRetailMarketing || role == helper.RoleRetailMaster
		if err := validateAgentCreditSubmission(&in, validateDocuments); err != nil {
			return nil, fmt.Errorf(" %w", err)
		}
	}
	if role == helper.RoleRetailAgent {
		if strings.TrimSpace(in.AgentSignature) == "" {
			return nil, errors.New("tanda tangan wajib diisi")
		}
		if in.ID > 0 {
			return s.repo.CompleteApplicationConsent(ctx, repository.AgentCreditApplicationInput{
				ID:              in.ID,
				MemberID:        targetMemberID,
				RequestedAmount: in.RequestedAmount,
				ApplicantData:   in.ApplicantData,
				DocumentData:    in.DocumentData,
				AgentSignature:  strings.TrimSpace(in.AgentSignature),
			})
		}
		existingID, err := s.repo.FindOpenEarlyApplicationID(ctx, targetMemberID)
		if err != nil {
			return nil, err
		}
		if existingID > 0 {
			return s.repo.CompleteApplicationConsent(ctx, repository.AgentCreditApplicationInput{
				ID:              existingID,
				MemberID:        targetMemberID,
				RequestedAmount: in.RequestedAmount,
				ApplicantData:   in.ApplicantData,
				DocumentData:    in.DocumentData,
				AgentSignature:  strings.TrimSpace(in.AgentSignature),
			})
		}
	} else if isCreditReviewer(role) && in.ID > 0 {
		if selfie, hasLegacySelfie := in.DocumentData["selfie"]; hasLegacySelfie {
			if _, ok := in.DocumentData["selfie_ktp"]; !ok {
				in.DocumentData["selfie_ktp"] = selfie
			}
		}
		if role == helper.RoleRetailMarketing || role == helper.RoleRetailMaster {
			if err := validateAgentCreditDocuments(in.DocumentData); err != nil {
				return nil, fmt.Errorf("validasi dokumen sistem: %w", err)
			}
			stampAgentCreditDocumentValidation(in.ApplicantData)
		}
		return s.repo.CompleteApplicationConsent(ctx, repository.AgentCreditApplicationInput{
			ID:              in.ID,
			MemberID:        targetMemberID,
			MarketingID:     creditApplicationMarketingID(role, auth.MemberID),
			RequestedAmount: in.RequestedAmount,
			ApplicantData:   in.ApplicantData,
			DocumentData:    in.DocumentData,
			AgentSignature:  "",
		})
	}
	return s.repo.CreateApplication(ctx, repository.AgentCreditApplicationInput{
		ID:              in.ID,
		MemberID:        targetMemberID,
		MarketingID:     creditApplicationMarketingID(role, auth.MemberID),
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

func (s *AgentCreditService) ListRanks(ctx context.Context, auth helper.AuthInfo) ([]repository.AgentCreditRank, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleRetailAnalyst {
		return nil, errors.New("operator kredit only")
	}
	return s.repo.ListActiveRanks(ctx)
}

func (s *AgentCreditService) ChangeMemberCreditRank(ctx context.Context, auth helper.AuthInfo, in AgentCreditRankChangeInput) (*repository.AgentCreditRank, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleRetailAnalyst {
		return nil, errors.New("operator kredit only")
	}
	if in.MemberID <= 0 || in.RankID <= 0 {
		return nil, errors.New("agent dan limit wajib dipilih")
	}
	reason := strings.TrimSpace(in.Reason)
	if reason == "" {
		return nil, errors.New("catatan keputusan wajib diisi")
	}
	return s.repo.ChangeMemberCreditRank(ctx, in.MemberID, in.RankID, auth.MemberID, reason)
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
	case helper.RoleAdmin, helper.RoleStaff:
		return s.decideAsAdmin(ctx, auth.MemberID, in.ID, reviewState, decision, note, strings.TrimSpace(in.SignatureData), strings.TrimSpace(in.RiskLevel), in.RiskScore, approvedAmount, limitAmount)
	case helper.RoleRetailMarketing:
		return s.decideAsMarketing(ctx, auth.MemberID, in.ID, reviewState, decision, note, strings.TrimSpace(in.SignatureData))
	case helper.RoleRetailAnalyst:
		return s.decideAsAnalyst(ctx, auth.MemberID, in.ID, reviewState, decision, note, strings.TrimSpace(in.SignatureData), strings.TrimSpace(in.RiskLevel), in.RiskScore, approvedAmount, limitAmount)
	case helper.RoleRetailMaster:
		return s.decideAsMaster(ctx, auth.MemberID, in.ID, reviewState, decision, note, strings.TrimSpace(in.SignatureData))
	default:
		return nil, errors.New("role reviewer tidak valid")
	}
}

func creditApplicationMarketingID(role string, memberID int64) int64 {
	if helper.NormalizeRole(role) == helper.RoleRetailMarketing {
		return memberID
	}
	return 0
}

func (s *AgentCreditService) decideAsAdmin(ctx context.Context, adminID, applicationID int64, reviewState *repository.AgentCreditReviewState, decision, note, signatureData, riskLevel string, riskScore int64, approvedAmount, limitAmount int64) (*repository.AgentCreditApplication, error) {
	if reviewState.Status == "approved" || reviewState.Status == "rejected" {
		return nil, errors.New("pengajuan sudah memiliki keputusan akhir")
	}
	riskLevel = normalizeRiskLevel(riskLevel)
	switch decision {
	case "approve", "approved", "setujui":
		if approvedAmount <= 0 {
			approvedAmount = limitAmount
		}
		if approvedAmount > limitAmount {
			return nil, fmt.Errorf("nominal disetujui maksimal Rp%d", limitAmount)
		}
		if approvedAmount <= 0 {
			return nil, errors.New("nominal disetujui wajib diisi")
		}
		return s.repo.AnalystFinalDecision(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			AnalystID:      adminID,
			Status:         "approved",
			ApprovedAmount: approvedAmount,
			AnalystNote:    fallbackNote(note, "Admin menyetujui pengajuan kredit secara manual."),
			Recommendation: "approved_by_admin",
		}, signatureData, riskLevel, riskScore)
	case "reject", "rejected", "tolak":
		return s.repo.AnalystFinalDecision(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			AnalystID:      adminID,
			Status:         "rejected",
			ApprovedAmount: 0,
			AnalystNote:    fallbackNote(note, "Ditolak oleh admin."),
			Recommendation: "rejected_by_admin",
		}, signatureData, riskLevel, riskScore)
	default:
		return nil, errors.New("admin wajib memilih setuju atau tolak")
	}
}

func (s *AgentCreditService) decideAsMarketing(ctx context.Context, marketingID, applicationID int64, reviewState *repository.AgentCreditReviewState, decision, note, signatureData string) (*repository.AgentCreditApplication, error) {
	if reviewState.Status != "submitted" && reviewState.Status != "marketing_review" {
		return nil, errors.New("status pengajuan belum bisa diverifikasi marketing")
	}
	switch decision {
	case "approve", "approved", "setujui", "forward_to_analysis", "kirim_analis":
		if !reviewState.TermsAccepted {
			return nil, errors.New("agent wajib menyetujui syarat dan ketentuan sebelum dikirim ke operator")
		}
		if !reviewState.HasAgentSignature {
			return nil, errors.New("agent wajib tanda tangan sebelum dikirim ke operator")
		}
		if !reviewState.HasKTPDocument || !reviewState.HasStoreDocument || !reviewState.HasSelfieKTPDocument || !reviewState.HasSelfieMarketing {
			missing := make([]string, 0, 4)
			if !reviewState.HasKTPDocument {
				missing = append(missing, "foto KTP")
			}
			if !reviewState.HasStoreDocument {
				missing = append(missing, "foto toko")
			}
			if !reviewState.HasSelfieKTPDocument {
				missing = append(missing, "selfie pegang KTP")
			}
			if !reviewState.HasSelfieMarketing {
				missing = append(missing, "foto bersama marketing")
			}
			return nil, fmt.Errorf("%s wajib lengkap sebelum dikirim ke operator", strings.Join(missing, ", "))
		}
		if !strings.HasPrefix(signatureData, "data:image/") {
			return nil, errors.New("tanda tangan marketing wajib diisi")
		}
		return s.repo.MarketingReviewApplication(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			MarketingID:    marketingID,
			Status:         "analysis_review",
			MarketingNote:  fallbackNote(note, "Marketing sudah verifikasi lapangan dan dokumen."),
			Recommendation: "marketing_verified",
			ApprovedAmount: 0,
		}, signatureData)
	case "reject", "rejected", "tolak":
		return nil, errors.New("marketing hanya bisa verifikasi dan mengirim pengajuan ke operator")
	default:
		return nil, errors.New("marketing wajib memilih verifikasi dan kirim ke operator")
	}
}

func (s *AgentCreditService) decideAsAnalyst(ctx context.Context, analystID, applicationID int64, reviewState *repository.AgentCreditReviewState, decision, note, signatureData, riskLevel string, riskScore int64, approvedAmount, limitAmount int64) (*repository.AgentCreditApplication, error) {
	if reviewState.Status != "analysis_review" {
		return nil, errors.New("pengajuan belum masuk tahap operator")
	}
	if !reviewState.MasterVerified {
		return nil, errors.New("marketing wajib verifikasi dan tanda tangan sebelum operator ACC")
	}
	riskLevel = normalizeRiskLevel(riskLevel)
	switch decision {
	case "approve", "approved", "setujui":
		if approvedAmount <= 0 {
			approvedAmount = limitAmount
		}
		if approvedAmount > limitAmount {
			return nil, fmt.Errorf("nominal disetujui maksimal Rp%d", limitAmount)
		}
		if approvedAmount <= 0 {
			return nil, errors.New("nominal disetujui wajib diisi")
		}
		return s.repo.AnalystFinalDecision(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			AnalystID:      analystID,
			Status:         "approved",
			ApprovedAmount: approvedAmount,
			AnalystNote:    fallbackNote(note, "Operator menyetujui risiko dan nominal. Pinjaman saldo aktif."),
			Recommendation: "approved",
		}, signatureData, riskLevel, riskScore)
	case "reject", "rejected", "tolak":
		return s.repo.AnalystFinalDecision(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			AnalystID:      analystID,
			Status:         "rejected",
			ApprovedAmount: 0,
			AnalystNote:    fallbackNote(note, "Ditolak oleh operator."),
			Recommendation: "rejected",
		}, signatureData, riskLevel, riskScore)
	default:
		return nil, errors.New("operator wajib memilih setuju atau tolak")
	}
}

func (s *AgentCreditService) decideAsMaster(ctx context.Context, masterID, applicationID int64, reviewState *repository.AgentCreditReviewState, decision, note, signatureData string) (*repository.AgentCreditApplication, error) {
	if reviewState.Status == "submitted" || reviewState.Status == "marketing_review" {
		switch decision {
		case "approve", "approved", "setujui", "forward_to_analysis", "kirim_analis":
			if !reviewState.TermsAccepted {
				return nil, errors.New("agent wajib menyetujui syarat dan ketentuan sebelum dikirim ke operator")
			}
			if !reviewState.HasAgentSignature {
				return nil, errors.New("agent wajib tanda tangan sebelum dikirim ke operator")
			}
			if !reviewState.HasKTPDocument || !reviewState.HasStoreDocument || !reviewState.HasSelfieKTPDocument || !reviewState.HasSelfieMarketing {
				return nil, errors.New("foto KTP, foto toko, selfie pegang KTP, dan foto bersama marketing wajib lengkap")
			}
			if !strings.HasPrefix(signatureData, "data:image/") {
				return nil, errors.New("tanda tangan marketing wajib diisi")
			}
			return s.repo.MarketingReviewApplication(ctx, repository.AgentCreditDecisionInput{
				ID:             applicationID,
				MarketingID:    masterID,
				Status:         "analysis_review",
				MarketingNote:  fallbackNote(note, "Marketing sudah verifikasi data agent dan dokumen, lalu dikirim ke operator."),
				Recommendation: "marketing_verified",
				ApprovedAmount: 0,
			}, signatureData)
		case "reject", "rejected", "tolak":
			return nil, errors.New("marketing tidak bisa menolak pengajuan agent; keputusan tolak ada di operator")
		default:
			return nil, errors.New("marketing wajib tanda tangan dan kirim ke operator")
		}
	}
	return nil, errors.New("keputusan akhir pinjaman ada di operator")
}

func fallbackNote(note, fallback string) string {
	if strings.TrimSpace(note) != "" {
		return strings.TrimSpace(note)
	}
	return fallback
}

func normalizeRiskLevel(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "aman", "low", "rendah":
		return "aman"
	case "perhatian", "medium", "sedang":
		return "perhatian"
	case "tinggi", "high":
		return "tinggi"
	default:
		return "perhatian"
	}
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
		return errors.New("nominal pembayaran wajib diisi")
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

func (s *AgentCreditService) TransferToMainBalance(ctx context.Context, auth helper.AuthInfo, in AgentCreditTransferInput) (*repository.AgentCreditTransferResult, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleRetailAgent {
		return nil, errors.New("hanya agent yang dapat memindahkan saldo kredit")
	}
	if in.ApplicationID <= 0 {
		return nil, errors.New("pinjaman kredit tidak valid")
	}
	if in.Amount <= 0 {
		return nil, errors.New("nominal mutasi wajib lebih dari Rp0")
	}
	refID := fmt.Sprintf("KRM-%s-%s", time.Now().Format("20060102150405"), strings.ToUpper(helper.RandHex(4)))
	return s.repo.TransferCreditToMainBalance(ctx, in.ApplicationID, auth.MemberID, in.Amount, refID)
}
