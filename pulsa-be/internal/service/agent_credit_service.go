package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

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

type AgentCreditLoanStatusInput struct {
	ApplicationID int64  `json:"application_id"`
	Suspended     bool   `json:"suspended"`
	Reason        string `json:"reason"`
}

func (s *AgentCreditService) ListTeamActivity(ctx context.Context, auth helper.AuthInfo, actorRole string, limit int) ([]repository.AgentCreditTeamActivity, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleAdmin {
		return nil, errors.New("super admin only")
	}
	actorRole = strings.TrimSpace(strings.ToLower(actorRole))
	if actorRole != "" && actorRole != "marketing" && actorRole != "operator_credit" && actorRole != "super_admin" {
		return nil, errors.New("filter role tidak valid")
	}
	return s.repo.ListTeamActivity(ctx, actorRole, limit)
}

func isCreditReviewer(role string) bool {
	normalized := helper.NormalizeRole(role)
	return normalized == helper.RoleAdmin ||
		normalized == helper.RoleStaff ||
		normalized == helper.RoleRetailAnalyst
}

func canViewCreditApplications(role string) bool {
	normalized := helper.NormalizeRole(role)
	return isCreditReviewer(normalized) || normalized == helper.RoleRetailMarketing || normalized == helper.RoleRetailMaster
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
		if err := validateAgentCreditSubmission(&in, true); err != nil {
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
		if err := s.repo.EnsureAgentCanSubmitNextApplication(ctx, targetMemberID); err != nil {
			return nil, err
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

func (s *AgentCreditService) ListApplications(ctx context.Context, auth helper.AuthInfo, limit int) ([]repository.AgentCreditApplication, error) {
	if !canViewCreditApplications(auth.Role) {
		return nil, errors.New("akses pemantauan kredit tidak tersedia")
	}
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	items, err := s.repo.ListApplications(ctx, limit)
	if err != nil {
		return nil, err
	}
	if helper.NormalizeRole(auth.Role) == helper.RoleRetailMarketing {
		// Marketing only receives a non-financial operational view of its own
		// agents. Never leak balance, loan, limit, payment, or document data.
		visible := make([]repository.AgentCreditApplication, 0, len(items))
		for _, item := range items {
			if item.MarketingID != auth.MemberID {
				continue
			}
			item.RequestedAmount = 0
			item.ApprovedAmount = 0
			item.ApplicantData = map[string]any{
				"agent_name":    item.ApplicantData["agent_name"],
				"store_name":    item.ApplicantData["store_name"],
				"whatsapp":      item.ApplicantData["whatsapp"],
				"store_address": item.ApplicantData["store_address"],
			}
			item.DocumentData = nil
			item.AgentSignatureData = ""
			item.HasAgentSignature = false
			item.OutstandingAmount = 0
			item.CreditAvailableAmount = 0
			item.PaidAmount = 0
			item.PaymentCount = 0
			item.CreditLimitAmount = 0
			item.LoanApprovedAt = nil
			item.LoanDueDate = nil
			visible = append(visible, item)
		}
		return visible, nil
	}
	// Operator and admin receive the complete operational and financial view.
	return items, nil
}

func (s *AgentCreditService) ListMyApplications(ctx context.Context, auth helper.AuthInfo) ([]repository.AgentCreditApplication, error) {
	role := helper.NormalizeRole(auth.Role)
	if role != helper.RoleRetailAgent && role != helper.RoleUser {
		return nil, errors.New("user only")
	}
	return s.repo.ListMemberApplications(ctx, auth.MemberID, 10)
}

func (s *AgentCreditService) ListRanks(ctx context.Context, auth helper.AuthInfo) ([]repository.AgentCreditRank, error) {
	role := helper.NormalizeRole(auth.Role)
	if role != helper.RoleRetailAnalyst && role != helper.RoleAdmin {
		return nil, errors.New("operator kredit only")
	}
	return s.repo.ListActiveRanks(ctx)
}

func (s *AgentCreditService) ChangeMemberCreditRank(ctx context.Context, auth helper.AuthInfo, in AgentCreditRankChangeInput) (*repository.AgentCreditRank, error) {
	role := helper.NormalizeRole(auth.Role)
	if role != helper.RoleRetailAnalyst && role != helper.RoleAdmin {
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

func (s *AgentCreditService) SetLoanOperationalStatus(ctx context.Context, auth helper.AuthInfo, in AgentCreditLoanStatusInput) (*repository.AgentCreditLoanStatusResult, error) {
	if helper.NormalizeRole(auth.Role) != helper.RoleAdmin {
		return nil, errors.New("super admin only")
	}
	if in.ApplicationID <= 0 {
		return nil, errors.New("pengajuan kredit tidak valid")
	}
	reason := strings.TrimSpace(in.Reason)
	if reason == "" {
		return nil, errors.New("alasan perubahan status kredit wajib diisi")
	}
	return s.repo.SetLoanOperationalStatus(ctx, in.ApplicationID, auth.MemberID, in.Suspended, reason)
}

func (s *AgentCreditService) DecideApplication(ctx context.Context, auth helper.AuthInfo, in AgentCreditDecisionInput) (*repository.AgentCreditApplication, error) {
	if !isCreditReviewer(auth.Role) {
		return nil, errors.New("keputusan kredit hanya dapat dilakukan operator")
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
	case helper.RoleRetailAnalyst:
		return s.decideAsAnalyst(ctx, auth.MemberID, in.ID, reviewState, decision, note, strings.TrimSpace(in.SignatureData), strings.TrimSpace(in.RiskLevel), in.RiskScore, approvedAmount, limitAmount)
	default:
		return nil, errors.New("keputusan kredit hanya dapat dilakukan operator")
	}
}

func (s *AgentCreditService) DeleteRejectedApplication(ctx context.Context, auth helper.AuthInfo, applicationID int64) error {
	if !isCreditReviewer(auth.Role) {
		return errors.New("penghapusan pengajuan hanya dapat dilakukan operator")
	}
	if applicationID <= 0 {
		return errors.New("pengajuan tidak valid")
	}
	return s.repo.DeleteRejectedApplication(ctx, applicationID)
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
			ActorRole:      "super_admin",
		}, signatureData, riskLevel, riskScore)
	case "reject", "rejected", "tolak":
		return s.repo.AnalystFinalDecision(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			AnalystID:      adminID,
			Status:         "rejected",
			ApprovedAmount: 0,
			AnalystNote:    fallbackNote(note, "Ditolak oleh admin."),
			Recommendation: "rejected_by_admin",
			ActorRole:      "super_admin",
		}, signatureData, riskLevel, riskScore)
	default:
		return nil, errors.New("admin wajib memilih setuju atau tolak")
	}
}

func (s *AgentCreditService) decideAsMarketing(ctx context.Context, marketingID, applicationID int64, reviewState *repository.AgentCreditReviewState, decision, note, signatureData, actorRole string) (*repository.AgentCreditApplication, error) {
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
		defaultReviewNote := "Marketing sudah verifikasi lapangan dan dokumen."
		if actorRole == "super_admin" {
			defaultReviewNote = "Super Admin sudah memverifikasi dokumen dan survei lapangan."
		}
		return s.repo.MarketingReviewApplication(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			MarketingID:    marketingID,
			Status:         "analysis_review",
			MarketingNote:  fallbackNote(note, defaultReviewNote),
			Recommendation: "marketing_verified",
			ApprovedAmount: 0,
			ActorRole:      actorRole,
		}, signatureData)
	case "reject", "rejected", "tolak":
		return nil, errors.New("marketing hanya bisa verifikasi dan mengirim pengajuan ke operator")
	default:
		return nil, errors.New("marketing wajib memilih verifikasi dan kirim ke operator")
	}
}

func (s *AgentCreditService) decideAsAnalyst(ctx context.Context, analystID, applicationID int64, reviewState *repository.AgentCreditReviewState, decision, note, signatureData, riskLevel string, riskScore int64, approvedAmount, limitAmount int64) (*repository.AgentCreditApplication, error) {
	if reviewState.Status != "submitted" && reviewState.Status != "analysis_review" && reviewState.Status != "marketing_review" {
		return nil, errors.New("pengajuan belum masuk tahap operator")
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
			ActorRole:      "operator_credit",
		}, signatureData, riskLevel, riskScore)
	case "reject", "rejected", "tolak":
		return s.repo.AnalystFinalDecision(ctx, repository.AgentCreditDecisionInput{
			ID:             applicationID,
			AnalystID:      analystID,
			Status:         "rejected",
			ApprovedAmount: 0,
			AnalystNote:    fallbackNote(note, "Ditolak oleh operator."),
			Recommendation: "rejected",
			ActorRole:      "operator_credit",
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
	// Active partnerships do not use recurring installments. Settlement is an
	// operator-controlled action when the agent ends the partnership.
	return errors.New("pembayaran kredit belum diperlukan selama agent masih aktif menjadi mitra")

	/*
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
	*/
}

func (s *AgentCreditService) TransferToMainBalance(ctx context.Context, auth helper.AuthInfo, in AgentCreditTransferInput) (*repository.AgentCreditTransferResult, error) {
	return nil, errors.New("saldo kredit sudah tidak digunakan; kredit yang disetujui langsung masuk ke saldo utama")
}
