package repository

import (
	"context"
	"database/sql"
	"encoding/json"
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
  a.created_at,
  a.updated_at
FROM public.agent_credit_application a
JOIN public.member m ON m.id = a.member_id
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
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
		_ = json.Unmarshal(documentRaw, &item.DocumentData)
		item.HasAgentSignature = item.AgentSignatureData != ""
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
  a.created_at,
  a.updated_at
FROM public.agent_credit_application a
JOIN public.member m ON m.id = a.member_id
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
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(applicantRaw, &item.ApplicantData)
		_ = json.Unmarshal(documentRaw, &item.DocumentData)
		item.HasAgentSignature = item.AgentSignatureData != ""
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *AgentCreditRepository) DecideApplication(ctx context.Context, in AgentCreditDecisionInput) (*AgentCreditApplication, error) {
	var item AgentCreditApplication
	var applicantRaw, documentRaw []byte
	err := r.db.QueryRowContext(ctx, `
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
	_ = json.Unmarshal(documentRaw, &item.DocumentData)
	item.HasAgentSignature = item.AgentSignatureData != ""
	return &item, nil
}
