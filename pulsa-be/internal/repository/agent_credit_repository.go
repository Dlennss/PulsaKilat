package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

type AgentCreditRepository struct {
	db *sql.DB
}

func NewAgentCreditRepository(db *sql.DB) *AgentCreditRepository {
	return &AgentCreditRepository{db: db}
}

type AgentCreditApplicationInput struct {
	ID              int64
	MemberID        int64
	MarketingID     int64
	RequestedAmount int64
	ApplicantData   map[string]any
	DocumentData    map[string]any
	AgentSignature  string
}

type AgentCreditPaymentInput struct {
	ApplicationID int64
	MemberID      int64
	Amount        int64
	Note          string
	PaymentMethod string
	PaymentProof  map[string]any
}

type AgentCreditDecisionInput struct {
	ID             int64
	MarketingID    int64
	AnalystID      int64
	MasterID       int64
	Status         string
	ApprovedAmount int64
	MarketingNote  string
	AnalystNote    string
	Recommendation string
}

type AgentCreditProfile struct {
	LevelCode          string `json:"credit_level_code"`
	LevelName          string `json:"credit_level_name"`
	LimitAmount        int64  `json:"credit_limit_amount"`
	NeedsRepair        bool   `json:"credit_needs_repair"`
	QualifiedPaidTotal int64  `json:"qualified_paid_total"`
	QualifiedPaidCount int64  `json:"qualified_paid_count"`
}

type AgentCreditApplication struct {
	ID                       int64                `json:"id"`
	MemberID                 int64                `json:"member_id"`
	MemberName               string               `json:"member_name"`
	MemberEmail              string               `json:"member_email"`
	MemberPhone              string               `json:"member_phone"`
	RequestedAmount          int64                `json:"requested_amount"`
	ApprovedAmount           int64                `json:"approved_amount"`
	Status                   string               `json:"status"`
	ApplicantData            map[string]any       `json:"applicant_data"`
	DocumentData             map[string]any       `json:"document_data"`
	HasAgentSignature        bool                 `json:"has_agent_signature"`
	AgentSignatureData       string               `json:"agent_signature_data,omitempty"`
	AgentSignatureAt         *time.Time           `json:"agent_signature_at,omitempty"`
	MarketingNote            string               `json:"marketing_note"`
	AnalystNote              string               `json:"analyst_note"`
	AnalystRecommendation    string               `json:"analyst_recommendation"`
	AnalystRecommendedAmount int64                `json:"analyst_recommended_amount"`
	LoanStatus               string               `json:"loan_status"`
	OutstandingAmount        int64                `json:"outstanding_amount"`
	CreditAvailableAmount    int64                `json:"credit_available_amount"`
	PaidAmount               int64                `json:"paid_amount"`
	PaymentCount             int64                `json:"payment_count"`
	Payments                 []AgentCreditPayment `json:"payments,omitempty"`
	CreditLevelCode          string               `json:"credit_level_code"`
	CreditLevelName          string               `json:"credit_level_name"`
	CreditNeedsRepair        bool                 `json:"credit_needs_repair"`
	QualifiedPaidTotal       int64                `json:"qualified_paid_total"`
	CreditLimitAmount        int64                `json:"credit_limit_amount"`
	LoanApprovedAt           *time.Time           `json:"loan_approved_at,omitempty"`
	LoanDueDate              *time.Time           `json:"loan_due_date,omitempty"`
	CreatedAt                time.Time            `json:"created_at"`
	UpdatedAt                time.Time            `json:"updated_at"`
}

type AgentCreditPayment struct {
	ID            int64          `json:"id"`
	LoanID        int64          `json:"loan_id"`
	ApplicationID int64          `json:"application_id"`
	MemberID      int64          `json:"member_id"`
	Amount        int64          `json:"amount"`
	DueDate       time.Time      `json:"due_date"`
	PaidAt        time.Time      `json:"paid_at"`
	DaysLate      int64          `json:"days_late"`
	Status        string         `json:"status"`
	Note          string         `json:"note"`
	PaymentProof  map[string]any `json:"payment_proof,omitempty"`
}

type AgentCreditRank struct {
	ID          int64  `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	LimitAmount int64  `json:"limit_amount"`
	SortOrder   int64  `json:"sort_order"`
}

type AgentCreditReviewState struct {
	Status                   string
	AnalystRecommendation    string
	AnalystRecommendedAmount int64
	HasAgentSignature        bool
	TermsAccepted            bool
	HasKTPDocument           bool
	HasStoreDocument         bool
	HasSelfieKTPDocument     bool
	HasSelfieMarketing       bool
	MarketingVerified        bool
	MasterVerified           bool
	AnalystVerified          bool
}

func (r *AgentCreditRepository) CreateApplication(ctx context.Context, in AgentCreditApplicationInput) (*AgentCreditApplication, error) {
	applicantJSON, err := json.Marshal(in.ApplicantData)
	if err != nil {
		return nil, err
	}
	documentJSON, err := json.Marshal(in.DocumentData)
	if err != nil {
		return nil, err
	}

	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err = r.db.QueryRowContext(ctx, `
INSERT INTO public.agent_credit_application
  (member_id, marketing_user_id, requested_amount, status, applicant_data, document_data, agent_signature_data, agent_signature_at)
VALUES
  ($1, NULLIF($2, 0), $3, 'submitted', $4::jsonb, $5::jsonb, NULLIF($6, ''), CASE WHEN NULLIF($6, '') IS NULL THEN NULL ELSE now() END)
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note, created_at, updated_at
`, in.MemberID, in.MarketingID, in.RequestedAmount, string(applicantJSON), string(documentJSON), in.AgentSignature).Scan(
		&item.ID,
		&item.MemberID,
		&item.RequestedAmount,
		&item.ApprovedAmount,
		&item.Status,
		&applicantRaw,
		&documentRaw,
		&item.AgentSignatureData,
		&item.AgentSignatureAt,
		&item.MarketingNote,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""
	return &item, nil
}

func (r *AgentCreditRepository) ListActiveRanks(ctx context.Context) ([]AgentCreditRank, error) {
	rows, err := r.db.QueryContext(ctx, `
SELECT id, code, name, COALESCE(description, ''), limit_amount, sort_order
FROM public.agent_credit_rank
WHERE active = TRUE
ORDER BY sort_order ASC, limit_amount ASC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]AgentCreditRank, 0)
	for rows.Next() {
		var item AgentCreditRank
		if err := rows.Scan(&item.ID, &item.Code, &item.Name, &item.Description, &item.LimitAmount, &item.SortOrder); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AgentCreditRepository) ChangeMemberCreditRank(ctx context.Context, memberID, newRankID, actorID int64, reason string) (*AgentCreditRank, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var newRank AgentCreditRank
	if err := tx.QueryRowContext(ctx, `
SELECT id, code, name, COALESCE(description, ''), limit_amount, sort_order
FROM public.agent_credit_rank
WHERE id = $1 AND active = TRUE
`, newRankID).Scan(&newRank.ID, &newRank.Code, &newRank.Name, &newRank.Description, &newRank.LimitAmount, &newRank.SortOrder); err != nil {
		return nil, err
	}

	var oldRankID sql.NullInt64
	_ = tx.QueryRowContext(ctx, `
SELECT h.new_rank_id
FROM public.agent_credit_rank_history h
WHERE h.member_id = $1
ORDER BY h.created_at DESC, h.id DESC
LIMIT 1
`, memberID).Scan(&oldRankID)
	if !oldRankID.Valid {
		_ = tx.QueryRowContext(ctx, `SELECT id FROM public.agent_credit_rank WHERE active = TRUE ORDER BY sort_order ASC LIMIT 1`).Scan(&oldRankID)
	}

	var onTimeCount, lateCount int64
	_ = tx.QueryRowContext(ctx, `
SELECT
  COUNT(*) FILTER (WHERE COALESCE(days_late, 0) <= 0),
  COUNT(*) FILTER (WHERE COALESCE(days_late, 0) > 0)
FROM public.agent_credit_payment
WHERE member_id = $1
`, memberID).Scan(&onTimeCount, &lateCount)

	if _, err := tx.ExecContext(ctx, `
INSERT INTO public.agent_credit_rank_history
  (member_id, old_rank_id, new_rank_id, reason, on_time_payment_count, late_payment_count, created_by)
VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, 0))
`, memberID, oldRankID, newRank.ID, reason, onTimeCount, lateCount, actorID); err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE public.agent_credit_loan
SET rank_id = $2,
    principal_amount = $3,
    available_amount = GREATEST($3 - outstanding_amount, 0),
    updated_at = now()
WHERE member_id = $1
  AND status IN ('active', 'due', 'overdue', 'suspended')
`, memberID, newRank.ID, newRank.LimitAmount); err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE public.agent_credit_application
SET rank_id = $2,
    approved_amount = CASE WHEN status = 'approved' THEN $3 ELSE approved_amount END,
    updated_at = now()
WHERE id = (
  SELECT id
  FROM public.agent_credit_application
  WHERE member_id = $1
  ORDER BY created_at DESC, id DESC
  LIMIT 1
)
`, memberID, newRank.ID, newRank.LimitAmount); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &newRank, nil
}

func (r *AgentCreditRepository) FindOpenEarlyApplicationID(ctx context.Context, memberID int64) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
SELECT id
FROM public.agent_credit_application
WHERE member_id = $1
  AND status IN ('draft', 'submitted', 'marketing_review')
ORDER BY created_at DESC, id DESC
LIMIT 1
`, memberID).Scan(&id)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return id, nil
}

func (r *AgentCreditRepository) GetApplicationReviewState(ctx context.Context, applicationID int64) (*AgentCreditReviewState, error) {
	var state AgentCreditReviewState
	err := r.db.QueryRowContext(ctx, `
SELECT
  status,
  COALESCE(analyst_recommendation, ''),
  COALESCE(analyst_recommended_amount, 0),
  COALESCE(agent_signature_data, '') <> '',
  COALESCE((applicant_data->>'terms_accepted')::boolean, false),
  COALESCE(document_data->'ktp'->>'data_url', '') <> '',
  COALESCE(document_data->'store'->>'data_url', '') <> '',
  COALESCE(document_data->'selfie_ktp'->>'data_url', '') <> '',
  COALESCE(document_data->'selfie_marketing'->>'data_url', document_data->'selfie'->>'data_url', '') <> '',
  COALESCE(applicant_data->>'marketing_signature_data', '') <> '',
  COALESCE(applicant_data->>'master_signature_data', applicant_data->>'marketing_signature_data', '') <> '',
  COALESCE(analyst_recommendation, '') = 'approved'
FROM public.agent_credit_application
WHERE id = $1
`, applicationID).Scan(
		&state.Status,
		&state.AnalystRecommendation,
		&state.AnalystRecommendedAmount,
		&state.HasAgentSignature,
		&state.TermsAccepted,
		&state.HasKTPDocument,
		&state.HasStoreDocument,
		&state.HasSelfieKTPDocument,
		&state.HasSelfieMarketing,
		&state.MarketingVerified,
		&state.MasterVerified,
		&state.AnalystVerified,
	)
	if err != nil {
		return nil, err
	}
	return &state, nil
}

func (r *AgentCreditRepository) CompleteApplicationConsent(ctx context.Context, in AgentCreditApplicationInput) (*AgentCreditApplication, error) {
	applicantJSON, err := json.Marshal(in.ApplicantData)
	if err != nil {
		return nil, err
	}
	documentJSON, err := json.Marshal(in.DocumentData)
	if err != nil {
		return nil, err
	}

	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err = r.db.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  requested_amount = CASE WHEN $3 > 0 THEN $3 ELSE requested_amount END,
  applicant_data = COALESCE(applicant_data, '{}'::jsonb) || $4::jsonb,
  document_data = COALESCE(document_data, '{}'::jsonb) || $5::jsonb,
  marketing_user_id = COALESCE(marketing_user_id, NULLIF($7, 0)),
  agent_signature_data = CASE WHEN NULLIF($6, '') IS NULL THEN agent_signature_data ELSE $6 END,
  agent_signature_at = CASE WHEN NULLIF($6, '') IS NULL THEN agent_signature_at ELSE now() END,
  status = CASE
    WHEN status IN ('draft', 'marketing_review') THEN 'submitted'
    ELSE status
  END,
  updated_at = now()
WHERE id = $1
  AND member_id = $2
  AND status IN ('draft', 'submitted', 'marketing_review', 'analysis_review', 'master_review')
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note, created_at, updated_at
`, in.ID, in.MemberID, in.RequestedAmount, string(applicantJSON), string(documentJSON), in.AgentSignature, in.MarketingID).Scan(
		&item.ID,
		&item.MemberID,
		&item.RequestedAmount,
		&item.ApprovedAmount,
		&item.Status,
		&applicantRaw,
		&documentRaw,
		&item.AgentSignatureData,
		&item.AgentSignatureAt,
		&item.MarketingNote,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""
	return &item, nil
}

func creditLevelFromProgress(qualifiedPaidCount int64, needsRepair bool) (string, string, int64) {
	if needsRepair {
		return "start", "Kilat Start", 500000
	}
	switch {
	case qualifiedPaidCount >= 5:
		return "elite", "Kilat Elite", 2000000
	case qualifiedPaidCount >= 3:
		return "plus", "Kilat Plus", 1000000
	default:
		return "start", "Kilat Start", 500000
	}
}

func (r *AgentCreditRepository) GetMemberCreditProfile(ctx context.Context, memberID int64) (*AgentCreditProfile, error) {
	var qualifiedPaidTotal int64
	var qualifiedPaidCount int64
	var needsRepair bool
	err := r.db.QueryRowContext(ctx, `
SELECT
  COALESCE(SUM(pl.principal_amount) FILTER (
    WHERE pl.status = 'paid'
      AND NOT EXISTS (
        SELECT 1
        FROM public.agent_credit_payment pp
        WHERE pp.loan_id = pl.id
          AND COALESCE(pp.days_late, 0) > 0
      )
  ), 0)::bigint AS qualified_paid_total,
  COUNT(*) FILTER (
    WHERE pl.status = 'paid'
      AND NOT EXISTS (
        SELECT 1
        FROM public.agent_credit_payment pp
        WHERE pp.loan_id = pl.id
          AND COALESCE(pp.days_late, 0) > 0
      )
  )::bigint AS qualified_paid_count,
  EXISTS (
    SELECT 1
    FROM public.agent_credit_payment rp
    WHERE rp.member_id = $1
      AND COALESCE(rp.days_late, 0) > 3
  ) AS needs_repair
FROM public.agent_credit_loan pl
WHERE pl.member_id = $1
`, memberID).Scan(&qualifiedPaidTotal, &qualifiedPaidCount, &needsRepair)
	if err != nil {
		return nil, err
	}
	code, name, limit := creditLevelFromProgress(qualifiedPaidCount, needsRepair)
	return &AgentCreditProfile{
		LevelCode:          code,
		LevelName:          name,
		LimitAmount:        limit,
		NeedsRepair:        needsRepair,
		QualifiedPaidTotal: qualifiedPaidTotal,
		QualifiedPaidCount: qualifiedPaidCount,
	}, nil
}

func (r *AgentCreditRepository) GetApplicationCreditLimit(ctx context.Context, applicationID int64) (int64, error) {
	var memberID int64
	if err := r.db.QueryRowContext(ctx, `SELECT member_id FROM public.agent_credit_application WHERE id = $1`, applicationID).Scan(&memberID); err != nil {
		return 0, err
	}
	profile, err := r.GetMemberCreditProfile(ctx, memberID)
	if err != nil {
		return 0, err
	}
	return profile.LimitAmount, nil
}

func (r *AgentCreditRepository) ListApplications(ctx context.Context, limit int) ([]AgentCreditApplication, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	rows, err := r.db.QueryContext(ctx, `
SELECT
  a.id,
  a.member_id,
  COALESCE(m.nama, '') AS member_name,
  COALESCE(m.email, '') AS member_email,
  COALESCE(m.phone, '') AS member_phone,
  a.requested_amount,
  a.approved_amount,
  a.status,
  a.applicant_data,
  a.document_data,
  COALESCE(a.agent_signature_data, '') AS agent_signature_data,
  a.agent_signature_at,
  a.marketing_note,
  COALESCE(a.analyst_note, '') AS analyst_note,
  COALESCE(a.analyst_recommendation, '') AS analyst_recommendation,
  COALESCE(a.analyst_recommended_amount, 0) AS analyst_recommended_amount,
  COALESCE(l.status, '') AS loan_status,
  COALESCE(l.outstanding_amount, 0) AS outstanding_amount,
  COALESCE(l.available_amount, 0) AS credit_available_amount,
  COALESCE(pay.paid_amount, 0) AS paid_amount,
  COALESCE(pay.payment_count, 0) AS payment_count,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 'start'
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 5 THEN 'elite'
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 3 THEN 'plus'
    ELSE 'start'
  END AS credit_level_code,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 'Kilat Start'
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 5 THEN 'Kilat Elite'
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 3 THEN 'Kilat Plus'
    ELSE 'Kilat Start'
  END AS credit_level_name,
  COALESCE(credit.needs_repair, false) AS credit_needs_repair,
  COALESCE(credit.qualified_paid_total, 0) AS qualified_paid_total,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 500000
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 5 THEN 2000000
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 3 THEN 1000000
    ELSE 500000
  END AS credit_limit_amount,
  l.approved_at AS loan_approved_at,
  l.due_date AS loan_due_date,
  a.created_at,
  a.updated_at
FROM public.agent_credit_application a
JOIN public.member m ON m.id = a.member_id
LEFT JOIN public.agent_credit_loan l ON l.application_id = a.id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(p.amount), 0)::bigint AS paid_amount, COUNT(*)::bigint AS payment_count
  FROM public.agent_credit_payment p
  WHERE p.loan_id = l.id
) pay ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(pl.principal_amount) FILTER (
      WHERE pl.status = 'paid'
        AND NOT EXISTS (
          SELECT 1
          FROM public.agent_credit_payment pp
          WHERE pp.loan_id = pl.id
            AND COALESCE(pp.days_late, 0) > 0
        )
    ), 0)::bigint AS qualified_paid_total,
    COUNT(*) FILTER (
      WHERE pl.status = 'paid'
        AND NOT EXISTS (
          SELECT 1
          FROM public.agent_credit_payment pp
          WHERE pp.loan_id = pl.id
            AND COALESCE(pp.days_late, 0) > 0
        )
    )::bigint AS qualified_paid_count,
    EXISTS (
      SELECT 1
      FROM public.agent_credit_payment rp
      WHERE rp.member_id = a.member_id
        AND COALESCE(rp.days_late, 0) > 3
    ) AS needs_repair
  FROM public.agent_credit_loan pl
  WHERE pl.member_id = a.member_id
) credit ON TRUE
ORDER BY a.created_at DESC, a.id DESC
LIMIT $1
`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]AgentCreditApplication, 0)
	for rows.Next() {
		var item AgentCreditApplication
		var applicantRaw, documentRaw []byte
		var loanApprovedAt, loanDueDate sql.NullTime
		if err := rows.Scan(
			&item.ID,
			&item.MemberID,
			&item.MemberName,
			&item.MemberEmail,
			&item.MemberPhone,
			&item.RequestedAmount,
			&item.ApprovedAmount,
			&item.Status,
			&applicantRaw,
			&documentRaw,
			&item.AgentSignatureData,
			&item.AgentSignatureAt,
			&item.MarketingNote,
			&item.AnalystNote,
			&item.AnalystRecommendation,
			&item.AnalystRecommendedAmount,
			&item.LoanStatus,
			&item.OutstandingAmount,
			&item.CreditAvailableAmount,
			&item.PaidAmount,
			&item.PaymentCount,
			&item.CreditLevelCode,
			&item.CreditLevelName,
			&item.CreditNeedsRepair,
			&item.QualifiedPaidTotal,
			&item.CreditLimitAmount,
			&loanApprovedAt,
			&loanDueDate,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
		_ = json.Unmarshal(documentRaw, &item.DocumentData)
		item.HasAgentSignature = item.AgentSignatureData != ""
		if loanApprovedAt.Valid {
			item.LoanApprovedAt = &loanApprovedAt.Time
		}
		if loanDueDate.Valid {
			item.LoanDueDate = &loanDueDate.Time
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := r.attachPayments(ctx, items); err != nil {
		return nil, err
	}
	return items, nil
}

func (r *AgentCreditRepository) ListMemberApplications(ctx context.Context, memberID int64, limit int) ([]AgentCreditApplication, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	rows, err := r.db.QueryContext(ctx, `
SELECT
  a.id,
  a.member_id,
  COALESCE(m.nama, '') AS member_name,
  COALESCE(m.email, '') AS member_email,
  COALESCE(m.phone, '') AS member_phone,
  a.requested_amount,
  a.approved_amount,
  a.status,
  a.applicant_data,
  a.document_data,
  COALESCE(a.agent_signature_data, '') AS agent_signature_data,
  a.agent_signature_at,
  a.marketing_note,
  COALESCE(a.analyst_note, '') AS analyst_note,
  COALESCE(a.analyst_recommendation, '') AS analyst_recommendation,
  COALESCE(a.analyst_recommended_amount, 0) AS analyst_recommended_amount,
  COALESCE(l.status, '') AS loan_status,
  COALESCE(l.outstanding_amount, 0) AS outstanding_amount,
  COALESCE(l.available_amount, 0) AS credit_available_amount,
  COALESCE(pay.paid_amount, 0) AS paid_amount,
  COALESCE(pay.payment_count, 0) AS payment_count,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 'start'
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 5 THEN 'elite'
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 3 THEN 'plus'
    ELSE 'start'
  END AS credit_level_code,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 'Kilat Start'
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 5 THEN 'Kilat Elite'
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 3 THEN 'Kilat Plus'
    ELSE 'Kilat Start'
  END AS credit_level_name,
  COALESCE(credit.needs_repair, false) AS credit_needs_repair,
  COALESCE(credit.qualified_paid_total, 0) AS qualified_paid_total,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 500000
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 5 THEN 2000000
    WHEN COALESCE(credit.qualified_paid_count, 0) >= 3 THEN 1000000
    ELSE 500000
  END AS credit_limit_amount,
  l.approved_at AS loan_approved_at,
  l.due_date AS loan_due_date,
  a.created_at,
  a.updated_at
FROM public.agent_credit_application a
JOIN public.member m ON m.id = a.member_id
LEFT JOIN public.agent_credit_loan l ON l.application_id = a.id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(p.amount), 0)::bigint AS paid_amount, COUNT(*)::bigint AS payment_count
  FROM public.agent_credit_payment p
  WHERE p.loan_id = l.id
) pay ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(pl.principal_amount) FILTER (
      WHERE pl.status = 'paid'
        AND NOT EXISTS (
          SELECT 1
          FROM public.agent_credit_payment pp
          WHERE pp.loan_id = pl.id
            AND COALESCE(pp.days_late, 0) > 0
        )
    ), 0)::bigint AS qualified_paid_total,
    COUNT(*) FILTER (
      WHERE pl.status = 'paid'
        AND NOT EXISTS (
          SELECT 1
          FROM public.agent_credit_payment pp
          WHERE pp.loan_id = pl.id
            AND COALESCE(pp.days_late, 0) > 0
        )
    )::bigint AS qualified_paid_count,
    EXISTS (
      SELECT 1
      FROM public.agent_credit_payment rp
      WHERE rp.member_id = a.member_id
        AND COALESCE(rp.days_late, 0) > 3
    ) AS needs_repair
  FROM public.agent_credit_loan pl
  WHERE pl.member_id = a.member_id
) credit ON TRUE
WHERE a.member_id = $1
ORDER BY a.created_at DESC, a.id DESC
LIMIT $2
`, memberID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]AgentCreditApplication, 0)
	for rows.Next() {
		var item AgentCreditApplication
		var applicantRaw, documentRaw []byte
		var loanApprovedAt, loanDueDate sql.NullTime
		if err := rows.Scan(
			&item.ID,
			&item.MemberID,
			&item.MemberName,
			&item.MemberEmail,
			&item.MemberPhone,
			&item.RequestedAmount,
			&item.ApprovedAmount,
			&item.Status,
			&applicantRaw,
			&documentRaw,
			&item.AgentSignatureData,
			&item.AgentSignatureAt,
			&item.MarketingNote,
			&item.AnalystNote,
			&item.AnalystRecommendation,
			&item.AnalystRecommendedAmount,
			&item.LoanStatus,
			&item.OutstandingAmount,
			&item.CreditAvailableAmount,
			&item.PaidAmount,
			&item.PaymentCount,
			&item.CreditLevelCode,
			&item.CreditLevelName,
			&item.CreditNeedsRepair,
			&item.QualifiedPaidTotal,
			&item.CreditLimitAmount,
			&loanApprovedAt,
			&loanDueDate,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
		_ = json.Unmarshal(documentRaw, &item.DocumentData)
		item.HasAgentSignature = item.AgentSignatureData != ""
		if loanApprovedAt.Valid {
			item.LoanApprovedAt = &loanApprovedAt.Time
		}
		if loanDueDate.Valid {
			item.LoanDueDate = &loanDueDate.Time
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if err := r.attachPayments(ctx, items); err != nil {
		return nil, err
	}
	return items, nil
}

func parseAgentCreditPaymentNote(raw string) (string, map[string]any) {
	payload := map[string]any{}
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return raw, nil
	}
	note := raw
	if value, ok := payload["note"].(string); ok {
		note = value
	}
	proof, _ := payload["payment_proof"].(map[string]any)
	return note, proof
}

func insertAuditLogTx(ctx context.Context, tx *sql.Tx, actorID int64, actorRole, action, entityType string, entityID any, beforeData, afterData map[string]any, reason string) error {
	if tx == nil {
		return nil
	}
	beforeJSON, err := json.Marshal(beforeData)
	if err != nil {
		return err
	}
	afterJSON, err := json.Marshal(afterData)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO public.audit_log
  (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, reason)
VALUES
  (NULLIF($1, 0), $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
`, actorID, actorRole, action, entityType, fmt.Sprint(entityID), string(beforeJSON), string(afterJSON), reason)
	return err
}

func (r *AgentCreditRepository) attachPayments(ctx context.Context, items []AgentCreditApplication) error {
	if len(items) == 0 {
		return nil
	}
	ids := make([]int64, 0, len(items))
	indexByID := make(map[int64]int, len(items))
	for i := range items {
		ids = append(ids, items[i].ID)
		indexByID[items[i].ID] = i
	}
	idsJSON, err := json.Marshal(ids)
	if err != nil {
		return err
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT
  p.id,
  p.loan_id,
  COALESCE(l.application_id, 0) AS application_id,
  p.member_id,
  p.amount,
  p.due_date,
  p.paid_at,
  p.days_late,
  p.status,
  p.note
FROM public.agent_credit_payment p
JOIN public.agent_credit_loan l ON l.id = p.loan_id
WHERE l.application_id IN (
  SELECT value::bigint FROM jsonb_array_elements_text($1::jsonb)
)
ORDER BY p.paid_at DESC, p.id DESC
`, string(idsJSON))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var payment AgentCreditPayment
		var rawNote string
		if err := rows.Scan(
			&payment.ID,
			&payment.LoanID,
			&payment.ApplicationID,
			&payment.MemberID,
			&payment.Amount,
			&payment.DueDate,
			&payment.PaidAt,
			&payment.DaysLate,
			&payment.Status,
			&rawNote,
		); err != nil {
			return err
		}
		payment.Note, payment.PaymentProof = parseAgentCreditPaymentNote(rawNote)
		if index, ok := indexByID[payment.ApplicationID]; ok {
			items[index].Payments = append(items[index].Payments, payment)
		}
	}
	return rows.Err()
}

func (r *AgentCreditRepository) MarketingReviewApplication(ctx context.Context, in AgentCreditDecisionInput, signatureData string) (*AgentCreditApplication, error) {
	meta := map[string]any{
		"marketing_signature_data": signatureData,
		"marketing_signature_at":   time.Now().Format(time.RFC3339),
		"marketing_verified":       true,
	}
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return nil, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var oldStatus string
	_ = tx.QueryRowContext(ctx, `SELECT status FROM public.agent_credit_application WHERE id = $1 FOR UPDATE`, in.ID).Scan(&oldStatus)

	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err = tx.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  status = $2,
  marketing_user_id = $3,
  marketing_reviewed_at = now(),
  marketing_note = $4,
  applicant_data = COALESCE(applicant_data, '{}'::jsonb) || $5::jsonb,
  updated_at = now()
WHERE id = $1 AND status IN ('submitted', 'marketing_review')
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note, created_at, updated_at
`, in.ID, in.Status, in.MarketingID, in.MarketingNote, string(metaJSON)).Scan(
		&item.ID,
		&item.MemberID,
		&item.RequestedAmount,
		&item.ApprovedAmount,
		&item.Status,
		&applicantRaw,
		&documentRaw,
		&item.AgentSignatureData,
		&item.AgentSignatureAt,
		&item.MarketingNote,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if err := insertAuditLogTx(ctx, tx, in.MarketingID, "marketing", "agent_credit_marketing_review", "agent_credit_application", in.ID, map[string]any{
		"status": oldStatus,
	}, map[string]any{
		"status": in.Status,
		"note":   in.MarketingNote,
	}, in.MarketingNote); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""
	return &item, nil
}

func (r *AgentCreditRepository) MasterReviewApplication(ctx context.Context, in AgentCreditDecisionInput, signatureData string) (*AgentCreditApplication, error) {
	meta := map[string]any{
		"master_signature_data": signatureData,
		"master_signature_at":   time.Now().Format(time.RFC3339),
		"master_verified":       true,
	}
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return nil, err
	}
	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err = r.db.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  status = $2,
  marketing_user_id = $3,
  marketing_reviewed_at = now(),
  marketing_note = $4,
  applicant_data = COALESCE(applicant_data, '{}'::jsonb) || $5::jsonb,
  updated_at = now()
WHERE id = $1 AND status IN ('submitted', 'marketing_review')
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note, created_at, updated_at
`, in.ID, in.Status, in.MasterID, in.MarketingNote, string(metaJSON)).Scan(
		&item.ID,
		&item.MemberID,
		&item.RequestedAmount,
		&item.ApprovedAmount,
		&item.Status,
		&applicantRaw,
		&documentRaw,
		&item.AgentSignatureData,
		&item.AgentSignatureAt,
		&item.MarketingNote,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""
	return &item, nil
}

func (r *AgentCreditRepository) AnalystFinalDecision(ctx context.Context, in AgentCreditDecisionInput, signatureData, riskLevel string, riskScore int64) (*AgentCreditApplication, error) {
	meta := map[string]any{
		"analyst_decision_at": time.Now().Format(time.RFC3339),
		"risk_level":          riskLevel,
		"risk_score":          riskScore,
	}
	metaJSON, err := json.Marshal(meta)
	if err != nil {
		return nil, err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var oldStatus string
	_ = tx.QueryRowContext(ctx, `SELECT status FROM public.agent_credit_application WHERE id = $1 FOR UPDATE`, in.ID).Scan(&oldStatus)

	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err = tx.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  status = $2,
  approved_amount = CASE WHEN $2 IN ('approved', 'ready_to_disburse') THEN $3 ELSE 0 END,
  analyst_user_id = $4,
  analyst_reviewed_at = now(),
  analyst_note = $5,
  analyst_recommendation = $6,
  analyst_recommended_amount = CASE WHEN $2 IN ('approved', 'ready_to_disburse') THEN $3 ELSE 0 END,
  applicant_data = COALESCE(applicant_data, '{}'::jsonb) || $7::jsonb,
  updated_at = now()
WHERE id = $1
  AND status IN ('submitted', 'marketing_review', 'analysis_review', 'master_review', 'ready_to_disburse')
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note,
  COALESCE(analyst_note, ''), COALESCE(analyst_recommendation, ''), COALESCE(analyst_recommended_amount, 0),
  created_at, updated_at
`, in.ID, in.Status, in.ApprovedAmount, in.AnalystID, in.AnalystNote, in.Recommendation, string(metaJSON)).Scan(
		&item.ID,
		&item.MemberID,
		&item.RequestedAmount,
		&item.ApprovedAmount,
		&item.Status,
		&applicantRaw,
		&documentRaw,
		&item.AgentSignatureData,
		&item.AgentSignatureAt,
		&item.MarketingNote,
		&item.AnalystNote,
		&item.AnalystRecommendation,
		&item.AnalystRecommendedAmount,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""

	if in.Status == "approved" {
		_, err = tx.ExecContext(ctx, `
INSERT INTO public.agent_credit_loan
  (application_id, member_id, principal_amount, outstanding_amount, available_amount, status, approved_at, due_date)
VALUES
  ($1, $2, $3, $3, $3, 'active', now(), (now() + interval '1 month')::date)
ON CONFLICT (application_id) DO UPDATE SET
  principal_amount = EXCLUDED.principal_amount,
  outstanding_amount = EXCLUDED.principal_amount,
  available_amount = EXCLUDED.available_amount,
  status = 'active',
  due_date = EXCLUDED.due_date,
  updated_at = now()
`, item.ID, item.MemberID, in.ApprovedAmount)
		if err != nil {
			return nil, err
		}
	} else if in.Status != "ready_to_disburse" {
		_, err = tx.ExecContext(ctx, `
UPDATE public.agent_credit_loan
SET status = 'cancelled', updated_at = now()
WHERE application_id = $1 AND status <> 'paid'
`, item.ID)
		if err != nil {
			return nil, err
		}
	}
	if err := insertAuditLogTx(ctx, tx, in.AnalystID, "admin_or_operator", "agent_credit_final_decision", "agent_credit_application", in.ID, map[string]any{
		"status": oldStatus,
	}, map[string]any{
		"status":          in.Status,
		"approved_amount": in.ApprovedAmount,
		"recommendation":  in.Recommendation,
	}, in.AnalystNote); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *AgentCreditRepository) AnalystReviewApplication(ctx context.Context, in AgentCreditDecisionInput) (*AgentCreditApplication, error) {
	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err := r.db.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  status = 'analysis_review',
  analyst_user_id = $2,
  analyst_reviewed_at = now(),
  analyst_note = $3,
  analyst_recommendation = $4,
  analyst_recommended_amount = $5,
  updated_at = now()
WHERE id = $1 AND status IN ('submitted', 'marketing_review', 'analysis_review')
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note,
  COALESCE(analyst_note, ''), COALESCE(analyst_recommendation, ''), COALESCE(analyst_recommended_amount, 0),
  created_at, updated_at
`, in.ID, in.AnalystID, in.AnalystNote, in.Recommendation, in.ApprovedAmount).Scan(
		&item.ID,
		&item.MemberID,
		&item.RequestedAmount,
		&item.ApprovedAmount,
		&item.Status,
		&applicantRaw,
		&documentRaw,
		&item.AgentSignatureData,
		&item.AgentSignatureAt,
		&item.MarketingNote,
		&item.AnalystNote,
		&item.AnalystRecommendation,
		&item.AnalystRecommendedAmount,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""
	return &item, nil
}

func (r *AgentCreditRepository) AnalystRejectApplication(ctx context.Context, in AgentCreditDecisionInput) (*AgentCreditApplication, error) {
	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err := r.db.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  status = 'analysis_rejected',
  approved_amount = 0,
  analyst_user_id = $2,
  analyst_reviewed_at = now(),
  analyst_note = $3,
  analyst_recommendation = 'rejected',
  analyst_recommended_amount = 0,
  updated_at = now()
WHERE id = $1 AND status IN ('submitted', 'marketing_review', 'analysis_review')
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note,
  COALESCE(analyst_note, ''), COALESCE(analyst_recommendation, ''), COALESCE(analyst_recommended_amount, 0),
  created_at, updated_at
`, in.ID, in.AnalystID, in.AnalystNote).Scan(
		&item.ID,
		&item.MemberID,
		&item.RequestedAmount,
		&item.ApprovedAmount,
		&item.Status,
		&applicantRaw,
		&documentRaw,
		&item.AgentSignatureData,
		&item.AgentSignatureAt,
		&item.MarketingNote,
		&item.AnalystNote,
		&item.AnalystRecommendation,
		&item.AnalystRecommendedAmount,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""
	return &item, nil
}

func (r *AgentCreditRepository) DecideApplication(ctx context.Context, in AgentCreditDecisionInput) (*AgentCreditApplication, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err = tx.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  status = $2,
  approved_amount = CASE WHEN $2 = 'approved' THEN $3 ELSE 0 END,
  marketing_user_id = $4,
  marketing_reviewed_at = now(),
  marketing_note = $5,
  updated_at = now()
WHERE id = $1 AND (
  ($2 = 'approved' AND status = 'ready_to_disburse')
  OR ($2 <> 'approved' AND status IN ('submitted', 'marketing_review', 'analysis_review', 'master_review', 'ready_to_disburse', 'approved', 'rejected', 'master_rejected'))
)
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note, created_at, updated_at
`, in.ID, in.Status, in.ApprovedAmount, in.MasterID, in.MarketingNote).Scan(
		&item.ID,
		&item.MemberID,
		&item.RequestedAmount,
		&item.ApprovedAmount,
		&item.Status,
		&applicantRaw,
		&documentRaw,
		&item.AgentSignatureData,
		&item.AgentSignatureAt,
		&item.MarketingNote,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
	if in.Status == "approved" {
		_, err = tx.ExecContext(ctx, `
INSERT INTO public.agent_credit_loan
  (application_id, member_id, principal_amount, outstanding_amount, available_amount, status, approved_at, due_date)
VALUES
  ($1, $2, $3, $3, $3, 'active', now(), (now() + interval '1 month')::date)
ON CONFLICT (application_id) DO UPDATE SET
  principal_amount = EXCLUDED.principal_amount,
  outstanding_amount = EXCLUDED.principal_amount,
  available_amount = EXCLUDED.available_amount,
  status = 'active',
  due_date = EXCLUDED.due_date,
  updated_at = now()
`, item.ID, item.MemberID, in.ApprovedAmount)
		if err != nil {
			return nil, err
		}
	} else {
		_, err = tx.ExecContext(ctx, `
UPDATE public.agent_credit_loan
SET status = 'cancelled', updated_at = now()
WHERE application_id = $1 AND status <> 'paid'
`, item.ID)
		if err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""
	return &item, nil
}

func (r *AgentCreditRepository) PayInstallment(ctx context.Context, in AgentCreditPaymentInput) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var loanID, memberID, outstanding int64
	var dueDate time.Time
	err = tx.QueryRowContext(ctx, `
SELECT
  l.id,
  l.member_id,
  l.outstanding_amount,
  l.due_date
FROM public.agent_credit_loan l
WHERE l.application_id = $1 AND l.status IN ('active', 'overdue')
FOR UPDATE
`, in.ApplicationID).Scan(&loanID, &memberID, &outstanding, &dueDate)
	if err != nil {
		return err
	}
	if in.MemberID > 0 && in.MemberID != memberID {
		return sql.ErrNoRows
	}
	amount := in.Amount
	if amount > outstanding {
		amount = outstanding
	}
	if amount <= 0 {
		return sql.ErrNoRows
	}
	if amount < outstanding {
		return fmt.Errorf("pembayaran kredit wajib lunas: tagihan=%d pembayaran=%d", outstanding, amount)
	}
	daysLate := 0
	now := time.Now()
	if now.After(dueDate) {
		daysLate = int(now.Sub(dueDate).Hours() / 24)
	}
	paymentStatus := "on_time"
	if daysLate > 0 {
		paymentStatus = "late"
	}
	paymentNote := in.Note
	if len(in.PaymentProof) > 0 {
		notePayload, marshalErr := json.Marshal(map[string]any{
			"payment_method": in.PaymentMethod,
			"note":           in.Note,
			"payment_proof":  in.PaymentProof,
		})
		if marshalErr != nil {
			return marshalErr
		}
		paymentNote = string(notePayload)
	}

	_, err = tx.ExecContext(ctx, `
INSERT INTO public.agent_credit_payment
  (loan_id, member_id, amount, due_date, days_late, status, note)
VALUES
  ($1, $2, $3, $4, $5, $6, $7)
`, loanID, memberID, amount, dueDate, daysLate, paymentStatus, paymentNote)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
UPDATE public.agent_credit_loan
SET
  outstanding_amount = GREATEST(outstanding_amount - $2, 0),
  available_amount = CASE WHEN GREATEST(outstanding_amount - $2, 0) = 0 THEN principal_amount ELSE available_amount END,
  status = CASE WHEN GREATEST(outstanding_amount - $2, 0) = 0 THEN 'paid' ELSE status END,
  paid_at = CASE WHEN GREATEST(outstanding_amount - $2, 0) = 0 THEN now() ELSE paid_at END,
  updated_at = now()
WHERE id = $1
`, loanID, amount)
	if err != nil {
		return err
	}
	if err := insertAuditLogTx(ctx, tx, in.MemberID, "agent", "agent_credit_paid", "agent_credit_loan", loanID, map[string]any{
		"outstanding_amount": outstanding,
	}, map[string]any{
		"paid_amount": amount,
		"status":      "paid",
	}, in.Note); err != nil {
		return err
	}
	return tx.Commit()
}
