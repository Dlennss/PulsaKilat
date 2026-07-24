package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/lib/pq"
)

func (r *UserRepository) List(ctx context.Context, q, role, scope string, limit, offset int) ([]UserRow, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}

	search := "%" + strings.TrimSpace(strings.ToLower(q)) + "%"
	role = strings.TrimSpace(strings.ToLower(role))
	scopeRoles := rolesForScope(scope)

	var sqlQ strings.Builder
	sqlQ.WriteString(`
SELECT
	m.id, m.email, COALESCE(m.nama,''), m.role, m.aktif, COALESCE(m.fee_member_rp,0),
	COALESCE(m.retail_agent_commission_rp,0),
	COALESCE(m.retail_master_commission_rp,0),
	COALESCE(m.h2h_agent_commission_rp,0),
	COALESCE(m.h2h_master_commission_rp,0),
	m.retail_agent_id,
	m.retail_master_id,
	m.h2h_agent_member_id,
	m.h2h_master_member_id,
	COALESCE(d.saldo,0), m.dibuat_pada
FROM public.member m
LEFT JOIN public.dompet_member d ON d.member_id = m.id
WHERE ($1 = '%%' OR lower(m.email) LIKE $1 OR lower(COALESCE(m.nama,'')) LIKE $1)
  AND ($2 = '' OR lower(m.role) = $2)`)

	args := []any{search, role}
	if len(scopeRoles) > 0 {
		sqlQ.WriteString(" AND lower(m.role) = ANY($3)")
		args = append(args, pq.Array(scopeRoles))
		sqlQ.WriteString(fmt.Sprintf("\nORDER BY m.id DESC\nLIMIT $%d OFFSET $%d", len(args)+1, len(args)+2))
		args = append(args, limit, offset)
	} else {
		sqlQ.WriteString("\nORDER BY m.id DESC\nLIMIT $3 OFFSET $4")
		args = append(args, limit, offset)
	}

	rows, err := r.db.QueryContext(ctx, sqlQ.String(), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]UserRow, 0)
	for rows.Next() {
		var (
			row            UserRow
			retailAgentID  sql.NullInt64
			retailMasterID sql.NullInt64
			h2hAgentID     sql.NullInt64
			h2hMasterID    sql.NullInt64
		)
		if err := rows.Scan(
			&row.ID, &row.Email, &row.Nama, &row.Role, &row.Aktif, &row.FeeMemberRp,
			&row.RetailAgentCommissionRp, &row.RetailMasterCommissionRp,
			&row.H2HAgentCommissionRp, &row.H2HMasterCommissionRp,
			&retailAgentID, &retailMasterID, &h2hAgentID, &h2hMasterID,
			&row.Saldo, &row.DibuatPada,
		); err != nil {
			return nil, err
		}
		if retailAgentID.Valid {
			v := retailAgentID.Int64
			row.RetailAgentID = &v
		}
		if retailMasterID.Valid {
			v := retailMasterID.Int64
			row.RetailMasterID = &v
		}
		if h2hAgentID.Valid {
			v := h2hAgentID.Int64
			row.H2HAgentID = &v
		}
		if h2hMasterID.Valid {
			v := h2hMasterID.Int64
			row.H2HMasterID = &v
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *UserRepository) Get(ctx context.Context, id int64) (*UserRow, error) {
	const q = `
SELECT
	m.id, m.email, COALESCE(m.nama,''), m.role, m.aktif, COALESCE(m.fee_member_rp,0),
	COALESCE(m.retail_agent_commission_rp,0),
	COALESCE(m.retail_master_commission_rp,0),
	COALESCE(m.h2h_agent_commission_rp,0),
	COALESCE(m.h2h_master_commission_rp,0),
	m.retail_agent_id,
	m.retail_master_id,
	m.h2h_agent_member_id,
	m.h2h_master_member_id,
	COALESCE(d.saldo,0), m.dibuat_pada
FROM public.member m
LEFT JOIN public.dompet_member d ON d.member_id = m.id
WHERE m.id = $1
LIMIT 1`
	var row UserRow
	var (
		retailAgentID  sql.NullInt64
		retailMasterID sql.NullInt64
		h2hAgentID     sql.NullInt64
		h2hMasterID    sql.NullInt64
	)
	err := r.db.QueryRowContext(ctx, q, id).Scan(
		&row.ID, &row.Email, &row.Nama, &row.Role, &row.Aktif, &row.FeeMemberRp,
		&row.RetailAgentCommissionRp, &row.RetailMasterCommissionRp,
		&row.H2HAgentCommissionRp, &row.H2HMasterCommissionRp,
		&retailAgentID, &retailMasterID, &h2hAgentID, &h2hMasterID,
		&row.Saldo, &row.DibuatPada,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if retailAgentID.Valid {
		v := retailAgentID.Int64
		row.RetailAgentID = &v
	}
	if retailMasterID.Valid {
		v := retailMasterID.Int64
		row.RetailMasterID = &v
	}
	if h2hAgentID.Valid {
		v := h2hAgentID.Int64
		row.H2HAgentID = &v
	}
	if h2hMasterID.Valid {
		v := h2hMasterID.Int64
		row.H2HMasterID = &v
	}
	return &row, nil
}
