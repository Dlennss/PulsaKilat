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
	Status         string
	ApprovedAmount int64
	MarketingNote  string
}

type AgentCreditApplication struct {
	ID                 int64          `json:"id"`
	MemberID           int64          `json:"member_id"`
	MemberName         string         `json:"member_name"`
	MemberEmail        string         `json:"member_email"`
	MemberPhone        string         `json:"member_phone"`
	RequestedAmount    int64          `json:"requested_amount"`
	ApprovedAmount     int64          `json:"approved_amount"`
	Status             string         `json:"status"`
	ApplicantData      map[string]any `json:"applicant_data"`
	DocumentData       map[string]any `json:"document_data"`
	HasAgentSignature  bool           `json:"has_agent_signature"`
	AgentSignatureData string         `json:"agent_signature_data,omitempty"`
	AgentSignatureAt   *time.Time     `json:"agent_signature_at,omitempty"`
	MarketingNote      string         `json:"marketing_note"`
	LoanStatus         string         `json:"loan_status"`
	OutstandingAmount  int64          `json:"outstanding_amount"`
	PaidAmount         int64          `json:"paid_amount"`
	PaymentCount       int64          `json:"payment_count"`
	LoanApprovedAt     *time.Time     `json:"loan_approved_at,omitempty"`
	LoanDueDate        *time.Time     `json:"loan_due_date,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
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
  ($1, $2, 'submitted', $3::jsonb, $4::jsonb, NULLIF($5, ''), CASE WHEN NULLIF($5, '') IS NULL THEN NULL ELSE now() END)
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
  COALESCE(l.status, '') AS loan_status,
  COALESCE(l.outstanding_amount, 0) AS outstanding_amount,
  COALESCE(pay.paid_amount, 0) AS paid_amount,
  COALESCE(pay.payment_count, 0) AS payment_count,
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
			&item.LoanStatus,
			&item.OutstandingAmount,
			&item.PaidAmount,
			&item.PaymentCount,
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
  COALESCE(l.status, '') AS loan_status,
  COALESCE(l.outstanding_amount, 0) AS outstanding_amount,
  COALESCE(pay.paid_amount, 0) AS paid_amount,
  COALESCE(pay.payment_count, 0) AS payment_count,
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
			&item.LoanStatus,
			&item.OutstandingAmount,
			&item.PaidAmount,
			&item.PaymentCount,
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
WHERE id = $1
RETURNING id, member_id, requested_amount, approved_amount, status, applicant_data, document_data,
  COALESCE(agent_signature_data, ''), agent_signature_at, marketing_note, created_at, updated_at
`, in.ID, in.Status, in.ApprovedAmount, in.MarketingID, in.MarketingNote).Scan(
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

	var loanID, memberID, principal, outstanding, paymentCount int64
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
  a.applicant_data,
  COALESCE(pay.payment_count, 0) AS payment_count
FROM public.agent_credit_loan l
JOIN public.agent_credit_application a ON a.id = l.application_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS payment_count
  FROM public.agent_credit_payment p
  WHERE p.loan_id = l.id
) pay ON TRUE
WHERE l.application_id = $1 AND l.status IN ('active', 'overdue')
FOR UPDATE
`, in.ApplicationID).Scan(&loanID, &memberID, &principal, &outstanding, &approvedAt, &finalDueDate, &applicantRaw, &paymentCount)
	if err != nil {
		return err
	}
	if in.MemberID > 0 && in.MemberID != memberID {
		return sql.ErrNoRows
	}
	applicantData := map[string]any{}
	_ = json.Unmarshal(applicantRaw, &applicantData)
	tenorMonths := tenorMonthsFromApplicant(applicantData)
	installmentNo := paymentCount + 1
	if installmentNo > tenorMonths {
		installmentNo = tenorMonths
	}
	dueDate := approvedAt.AddDate(0, int(installmentNo), 0)
	if dueDate.After(finalDueDate) {
		dueDate = finalDueDate
	}
	currentBill := installmentAmount(principal, tenorMonths)
	amount := in.Amount
	if currentBill > 0 && amount > currentBill {
		amount = currentBill
	}
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
