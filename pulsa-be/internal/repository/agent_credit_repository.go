package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"math"
	"time"
)

type AgentCreditRepository struct {
	db *sql.DB
}

func NewAgentCreditRepository(db *sql.DB) *AgentCreditRepository {
	return &AgentCreditRepository{db: db}
}

type AgentCreditApplicationInput struct {
	MemberID        int64
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
}

type AgentCreditApplication struct {
	ID                       int64          `json:"id"`
	MemberID                 int64          `json:"member_id"`
	MemberName               string         `json:"member_name"`
	MemberEmail              string         `json:"member_email"`
	MemberPhone              string         `json:"member_phone"`
	RequestedAmount          int64          `json:"requested_amount"`
	ApprovedAmount           int64          `json:"approved_amount"`
	Status                   string         `json:"status"`
	ApplicantData            map[string]any `json:"applicant_data"`
	DocumentData             map[string]any `json:"document_data"`
	HasAgentSignature        bool           `json:"has_agent_signature"`
	AgentSignatureData       string         `json:"agent_signature_data,omitempty"`
	AgentSignatureAt         *time.Time     `json:"agent_signature_at,omitempty"`
	MarketingNote            string         `json:"marketing_note"`
	AnalystNote              string         `json:"analyst_note"`
	AnalystRecommendation    string         `json:"analyst_recommendation"`
	AnalystRecommendedAmount int64          `json:"analyst_recommended_amount"`
	LoanStatus               string         `json:"loan_status"`
	OutstandingAmount        int64          `json:"outstanding_amount"`
	PaidAmount               int64          `json:"paid_amount"`
	PaymentCount             int64          `json:"payment_count"`
	CreditLevelCode          string         `json:"credit_level_code"`
	CreditLevelName          string         `json:"credit_level_name"`
	CreditNeedsRepair        bool           `json:"credit_needs_repair"`
	QualifiedPaidTotal       int64          `json:"qualified_paid_total"`
	CreditLimitAmount        int64          `json:"credit_limit_amount"`
	LoanApprovedAt           *time.Time     `json:"loan_approved_at,omitempty"`
	LoanDueDate              *time.Time     `json:"loan_due_date,omitempty"`
	CreatedAt                time.Time      `json:"created_at"`
	UpdatedAt                time.Time      `json:"updated_at"`
}

type AgentCreditReviewState struct {
	Status                   string
	AnalystRecommendation    string
	AnalystRecommendedAmount int64
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
  (member_id, requested_amount, status, applicant_data, document_data, agent_signature_data, agent_signature_at)
VALUES
  ($1, $2, 'analysis_review', $3::jsonb, $4::jsonb, NULLIF($5, ''), CASE WHEN NULLIF($5, '') IS NULL THEN NULL ELSE now() END)
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note, created_at, updated_at
`, in.MemberID, in.RequestedAmount, string(applicantJSON), string(documentJSON), in.AgentSignature).Scan(
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

func (r *AgentCreditRepository) GetApplicationReviewState(ctx context.Context, applicationID int64) (*AgentCreditReviewState, error) {
	var state AgentCreditReviewState
	err := r.db.QueryRowContext(ctx, `
SELECT status, COALESCE(analyst_recommendation, ''), COALESCE(analyst_recommended_amount, 0)
FROM public.agent_credit_application
WHERE id = $1
`, applicationID).Scan(&state.Status, &state.AnalystRecommendation, &state.AnalystRecommendedAmount)
	if err != nil {
		return nil, err
	}
	return &state, nil
}

func tenorMonthsFromApplicant(data map[string]any) int64 {
	value, ok := data["tenor_months"]
	if !ok {
		return 1
	}
	var tenor int64
	switch v := value.(type) {
	case int:
		tenor = int64(v)
	case int64:
		tenor = v
	case float64:
		tenor = int64(math.Round(v))
	case string:
		switch v {
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
		return 1
	}
}

func installmentAmount(principal int64, tenorMonths int64) int64 {
	if principal <= 0 {
		return 0
	}
	if tenorMonths <= 0 {
		return principal
	}
	return (principal + tenorMonths - 1) / tenorMonths
}

func creditLevelFromProgress(qualifiedPaidTotal int64, needsRepair bool) (string, string, int64) {
	if needsRepair {
		return "start", "Kilat Start", 500000
	}
	switch {
	case qualifiedPaidTotal >= 5000000:
		return "elite", "Kilat Elite", 5000000
	case qualifiedPaidTotal >= 3000000:
		return "max", "Kilat Max", 3000000
	case qualifiedPaidTotal >= 2000000:
		return "pro", "Kilat Pro", 2000000
	case qualifiedPaidTotal >= 1000000:
		return "plus", "Kilat Plus", 1000000
	default:
		return "start", "Kilat Start", 500000
	}
}

func (r *AgentCreditRepository) GetMemberCreditProfile(ctx context.Context, memberID int64) (*AgentCreditProfile, error) {
	var qualifiedPaidTotal int64
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
  EXISTS (
    SELECT 1
    FROM public.agent_credit_payment rp
    WHERE rp.member_id = $1
      AND COALESCE(rp.days_late, 0) > 3
  ) AS needs_repair
FROM public.agent_credit_loan pl
WHERE pl.member_id = $1
`, memberID).Scan(&qualifiedPaidTotal, &needsRepair)
	if err != nil {
		return nil, err
	}
	code, name, limit := creditLevelFromProgress(qualifiedPaidTotal, needsRepair)
	return &AgentCreditProfile{
		LevelCode:          code,
		LevelName:          name,
		LimitAmount:        limit,
		NeedsRepair:        needsRepair,
		QualifiedPaidTotal: qualifiedPaidTotal,
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
  COALESCE(pay.paid_amount, 0) AS paid_amount,
  COALESCE(pay.payment_count, 0) AS payment_count,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 'start'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 5000000 THEN 'elite'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 3000000 THEN 'max'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 2000000 THEN 'pro'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 1000000 THEN 'plus'
    ELSE 'start'
  END AS credit_level_code,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 'Kilat Start'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 5000000 THEN 'Kilat Elite'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 3000000 THEN 'Kilat Max'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 2000000 THEN 'Kilat Pro'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 1000000 THEN 'Kilat Plus'
    ELSE 'Kilat Start'
  END AS credit_level_name,
  COALESCE(credit.needs_repair, false) AS credit_needs_repair,
  COALESCE(credit.qualified_paid_total, 0) AS qualified_paid_total,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 500000
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 5000000 THEN 5000000
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 3000000 THEN 3000000
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 2000000 THEN 2000000
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 1000000 THEN 1000000
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
	return items, rows.Err()
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
  COALESCE(pay.paid_amount, 0) AS paid_amount,
  COALESCE(pay.payment_count, 0) AS payment_count,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 'start'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 5000000 THEN 'elite'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 3000000 THEN 'max'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 2000000 THEN 'pro'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 1000000 THEN 'plus'
    ELSE 'start'
  END AS credit_level_code,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 'Kilat Start'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 5000000 THEN 'Kilat Elite'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 3000000 THEN 'Kilat Max'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 2000000 THEN 'Kilat Pro'
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 1000000 THEN 'Kilat Plus'
    ELSE 'Kilat Start'
  END AS credit_level_name,
  COALESCE(credit.needs_repair, false) AS credit_needs_repair,
  COALESCE(credit.qualified_paid_total, 0) AS qualified_paid_total,
  CASE
    WHEN COALESCE(credit.needs_repair, false) THEN 500000
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 5000000 THEN 5000000
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 3000000 THEN 3000000
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 2000000 THEN 2000000
    WHEN COALESCE(credit.qualified_paid_total, 0) >= 1000000 THEN 1000000
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
	return items, rows.Err()
}

func (r *AgentCreditRepository) MarketingReviewApplication(ctx context.Context, in AgentCreditDecisionInput) (*AgentCreditApplication, error) {
	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err := r.db.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  status = $2,
  marketing_user_id = $3,
  marketing_reviewed_at = now(),
  marketing_note = $4,
  updated_at = now()
WHERE id = $1 AND status IN ('submitted', 'marketing_review')
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note, created_at, updated_at
`, in.ID, in.Status, in.MarketingID, in.MarketingNote).Scan(
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

func (r *AgentCreditRepository) AnalystReviewApplication(ctx context.Context, in AgentCreditDecisionInput) (*AgentCreditApplication, error) {
	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err := r.db.QueryRowContext(ctx, `
UPDATE public.agent_credit_application
SET
  status = 'master_review',
  analyst_user_id = $2,
  analyst_reviewed_at = now(),
  analyst_note = $3,
  analyst_recommendation = $4,
  analyst_recommended_amount = $5,
  updated_at = now()
WHERE id = $1 AND status IN ('submitted', 'marketing_review', 'analysis_review', 'master_review')
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
WHERE id = $1 AND status IN ('master_review', 'approved', 'rejected')
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
	tenorMonths := tenorMonthsFromApplicant(item.ApplicantData)
	if in.Status == "approved" {
		_, err = tx.ExecContext(ctx, `
INSERT INTO public.agent_credit_loan
  (application_id, member_id, principal_amount, outstanding_amount, status, approved_at, due_date)
VALUES
  ($1, $2, $3, $3, 'active', now(), (now() + ($4::text || ' months')::interval)::date)
ON CONFLICT (application_id) DO UPDATE SET
  principal_amount = EXCLUDED.principal_amount,
  outstanding_amount = LEAST(public.agent_credit_loan.outstanding_amount, EXCLUDED.principal_amount),
  status = CASE WHEN public.agent_credit_loan.outstanding_amount <= 0 THEN 'paid' ELSE 'active' END,
  due_date = EXCLUDED.due_date,
  updated_at = now()
`, item.ID, item.MemberID, in.ApprovedAmount, tenorMonths)
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

	var loanID, memberID, principal, outstanding int64
	var approvedAt, finalDueDate time.Time
	var applicantRaw []byte
	err = tx.QueryRowContext(ctx, `
SELECT
  l.id,
  l.member_id,
  l.principal_amount,
  l.outstanding_amount,
  l.approved_at,
  l.due_date,
  a.applicant_data
FROM public.agent_credit_loan l
JOIN public.agent_credit_application a ON a.id = l.application_id
WHERE l.application_id = $1 AND l.status IN ('active', 'overdue')
FOR UPDATE
`, in.ApplicationID).Scan(&loanID, &memberID, &principal, &outstanding, &approvedAt, &finalDueDate, &applicantRaw)
	if err != nil {
		return err
	}
	if in.MemberID > 0 && in.MemberID != memberID {
		return sql.ErrNoRows
	}
	applicantData := map[string]any{}
	_ = json.Unmarshal(applicantRaw, &applicantData)
	tenorMonths := tenorMonthsFromApplicant(applicantData)
	currentBill := installmentAmount(principal, tenorMonths)
	remainingInstallments := int64(1)
	if currentBill > 0 {
		remainingInstallments = (outstanding + currentBill - 1) / currentBill
	}
	if remainingInstallments > tenorMonths {
		remainingInstallments = tenorMonths
	}
	installmentNo := tenorMonths - remainingInstallments + 1
	if installmentNo < 1 {
		installmentNo = 1
	}
	dueDate := approvedAt.AddDate(0, int(installmentNo), 0)
	if dueDate.After(finalDueDate) {
		dueDate = finalDueDate
	}
	amount := in.Amount
	if amount > outstanding {
		amount = outstanding
	}
	if amount <= 0 {
		return sql.ErrNoRows
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
	if amount < outstanding {
		paymentStatus = "partial"
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO public.agent_credit_payment
  (loan_id, member_id, amount, due_date, days_late, status, note)
VALUES
  ($1, $2, $3, $4, $5, $6, $7)
`, loanID, memberID, amount, dueDate, daysLate, paymentStatus, in.Note)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
UPDATE public.agent_credit_loan
SET
  outstanding_amount = GREATEST(outstanding_amount - $2, 0),
  status = CASE WHEN GREATEST(outstanding_amount - $2, 0) = 0 THEN 'paid' ELSE status END,
  paid_at = CASE WHEN GREATEST(outstanding_amount - $2, 0) = 0 THEN now() ELSE paid_at END,
  updated_at = now()
WHERE id = $1
`, loanID, amount)
	if err != nil {
		return err
	}
	return tx.Commit()
}
