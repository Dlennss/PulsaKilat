package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

func (r *RetailRepository) CreateWithdrawRequest(ctx context.Context, memberID, amount int64, bankName, accountName, accountNumber, refID, note string) (*RetailWithdrawRequestRow, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var before int64
	if err := tx.QueryRowContext(ctx, `
SELECT saldo
FROM public.dompet_member
WHERE member_id = $1
FOR UPDATE
`, memberID).Scan(&before); err != nil {
		return nil, err
	}
	if before < amount {
		return nil, errors.New("saldo tidak cukup")
	}
	after := before - amount

	if _, err := tx.ExecContext(ctx, `
UPDATE public.dompet_member
SET saldo = $2, diperbarui_pada = now()
WHERE member_id = $1
`, memberID, after); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
INSERT INTO public.mutasi_dompet
  (member_id, ref_id, arah, jumlah, alasan, catatan, saldo_sebelum, saldo_sesudah, dibuat_pada)
VALUES
  ($1,$2,'DEBIT',$3,'RETAIL_WITHDRAW_HOLD',NULLIF($4,''),$5,$6,now())
`, memberID, refID, amount, note, before, after); err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
INSERT INTO public.retail_withdraw_request
  (member_id, amount, bank_name, account_name, account_number, status, note, reject_reason, ref_id, created_at, updated_at)
VALUES
  ($1,$2,$3,$4,$5,'pending',NULLIF($6,''),'',$7,now(),now())
`, memberID, amount, bankName, accountName, accountNumber, note, refID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return r.GetWithdrawRequestByRefID(ctx, refID)
}

func (r *RetailRepository) GetWithdrawRequestByRefID(ctx context.Context, refID string) (*RetailWithdrawRequestRow, error) {
	rows, err := r.AdminListWithdrawRequests(ctx, "", refID, 1, 0)
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, sql.ErrNoRows
	}
	return &rows[0], nil
}

func (r *RetailRepository) ListWithdrawRequestsByMember(ctx context.Context, memberID int64, limit, offset int) ([]RetailWithdrawRequestRow, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	return r.listWithdrawRequests(ctx, "rw.member_id = $1", []any{memberID, limit, offset}, limit, offset)
}

func (r *RetailRepository) AdminListWithdrawRequests(ctx context.Context, status, q string, limit, offset int) ([]RetailWithdrawRequestRow, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	search := "%" + strings.TrimSpace(strings.ToLower(q)) + "%"
	wheres := []string{"1=1"}
	args := []any{}
	if strings.TrimSpace(status) != "" && strings.TrimSpace(strings.ToLower(status)) != "all" {
		args = append(args, strings.TrimSpace(strings.ToLower(status)))
		wheres = append(wheres, fmt.Sprintf("lower(rw.status) = $%d", len(args)))
	}
	if strings.TrimSpace(search) != "%%" {
		args = append(args, search)
		idx := len(args)
		wheres = append(wheres, fmt.Sprintf("(lower(rw.ref_id) LIKE $%d OR lower(COALESCE(m.nama,'')) LIKE $%d OR lower(COALESCE(m.email,'')) LIKE $%d OR lower(COALESCE(rw.bank_name,'')) LIKE $%d)", idx, idx, idx, idx))
	}
	return r.listWithdrawRequests(ctx, strings.Join(wheres, " AND "), append(args, limit, offset), limit, offset)
}

func (r *RetailRepository) listWithdrawRequests(ctx context.Context, whereSQL string, args []any, limit, _ int) ([]RetailWithdrawRequestRow, error) {
	query := fmt.Sprintf(`
SELECT
  rw.id, rw.member_id, m.nama, m.email, rw.amount, rw.bank_name, rw.account_name, rw.account_number,
  rw.status, COALESCE(rw.note, ''), COALESCE(rw.reject_reason, ''), rw.ref_id,
  rw.processed_by, p.nama, rw.processed_at, rw.created_at, rw.updated_at
FROM public.retail_withdraw_request rw
JOIN public.member m ON m.id = rw.member_id
LEFT JOIN public.member p ON p.id = rw.processed_by
WHERE %s
ORDER BY rw.created_at DESC, rw.id DESC
LIMIT $%d OFFSET $%d
`, whereSQL, len(args)-1, len(args))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]RetailWithdrawRequestRow, 0, limit)
	for rows.Next() {
		var (
			item          RetailWithdrawRequestRow
			memberNama    sql.NullString
			memberEmail   sql.NullString
			processedBy   sql.NullInt64
			processedName sql.NullString
			processedAt   sql.NullTime
			createdAt     sql.NullTime
			updatedAt     sql.NullTime
		)
		if err := rows.Scan(
			&item.ID, &item.MemberID, &memberNama, &memberEmail, &item.Amount, &item.BankName, &item.AccountName,
			&item.AccountNumber, &item.Status, &item.Note, &item.RejectReason, &item.RefID,
			&processedBy, &processedName, &processedAt, &createdAt, &updatedAt,
		); err != nil {
			return nil, err
		}
		if memberNama.Valid {
			v := memberNama.String
			item.MemberNama = &v
		}
		if memberEmail.Valid {
			v := memberEmail.String
			item.MemberEmail = &v
		}
		if processedBy.Valid {
			v := processedBy.Int64
			item.ProcessedBy = &v
		}
		if processedName.Valid {
			v := processedName.String
			item.ProcessedName = &v
		}
		if processedAt.Valid {
			v := processedAt.Time
			item.ProcessedAt = &v
		}
		if createdAt.Valid {
			v := createdAt.Time
			item.CreatedAt = &v
		}
		if updatedAt.Valid {
			v := updatedAt.Time
			item.UpdatedAt = &v
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *RetailRepository) ApproveWithdrawRequest(ctx context.Context, reqID, actorID, bankID, fee int64, note string) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var (
		memberID    int64
		amount      int64
		refID       string
		status      string
		currentNote sql.NullString
		bankName    string
		bankBefore  int64
	)
	if err := tx.QueryRowContext(ctx, `
SELECT member_id, amount, ref_id, status, note
FROM public.retail_withdraw_request
WHERE id = $1
FOR UPDATE
`, reqID).Scan(&memberID, &amount, &refID, &status, &currentNote); err != nil {
		return err
	}
	if strings.TrimSpace(strings.ToLower(status)) != "pending" {
		return sql.ErrNoRows
	}

	if err := tx.QueryRowContext(ctx, `
SELECT nama, saldo
FROM public.bank
WHERE id = $1 AND aktif = true
FOR UPDATE
`, bankID).Scan(&bankName, &bankBefore); err != nil {
		return err
	}

	totalDebit := amount + fee
	if totalDebit <= 0 {
		return errors.New("nominal debit bank tidak valid")
	}
	if bankBefore < totalDebit {
		return errors.New("saldo bank tidak cukup")
	}
	bankAfter := bankBefore - totalDebit

	if _, err := tx.ExecContext(ctx, `
UPDATE public.bank
SET saldo = $2, diubah_pada = now()
WHERE id = $1
`, bankID, bankAfter); err != nil {
		return err
	}

	baseNote := strings.TrimSpace(note)
	if currentNote.Valid && strings.TrimSpace(currentNote.String) != "" {
		if baseNote != "" {
			baseNote = strings.TrimSpace(currentNote.String) + " | " + baseNote
		} else {
			baseNote = strings.TrimSpace(currentNote.String)
		}
	}
	finalNote := strings.TrimSpace(fmt.Sprintf("%s | bank sumber: %s | fee: %d", baseNote, strings.TrimSpace(bankName), fee))
	metaJSON, _ := json.Marshal(map[string]any{
		"type":         "retail_withdraw_approve",
		"withdraw_id":  reqID,
		"withdraw_ref": refID,
		"withdraw_amt": amount,
		"fee":          fee,
		"bank_id":      bankID,
		"bank_name":    strings.TrimSpace(bankName),
	})
	if _, err := tx.ExecContext(ctx, `
INSERT INTO public.mutasi_bank
  (bank_id, ref_id, arah, jumlah, alasan, catatan, saldo_sebelum, saldo_sesudah, member_id, diubah_oleh, dibuat_pada, meta)
VALUES
  ($1,$2,'DEBIT',$3,'RETAIL_WITHDRAW_APPROVE',NULLIF($4,''),$5,$6,$7,$8,now(),$9::jsonb)
`, bankID, refID, totalDebit, finalNote, bankBefore, bankAfter, memberID, actorID, string(metaJSON)); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE public.retail_withdraw_request
SET status = 'approved',
    note = NULLIF($3, ''),
    processed_by = $2,
    processed_at = now(),
    updated_at = now()
WHERE id = $1
`, reqID, actorID, finalNote); err != nil {
		return err
	}

	return tx.Commit()
}

func (r *RetailRepository) RejectWithdrawRequest(ctx context.Context, reqID, actorID int64, reason string) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var (
		memberID int64
		amount   int64
		refID    string
		status   string
	)
	if err := tx.QueryRowContext(ctx, `
SELECT member_id, amount, ref_id, status
FROM public.retail_withdraw_request
WHERE id = $1
FOR UPDATE
`, reqID).Scan(&memberID, &amount, &refID, &status); err != nil {
		return err
	}
	if strings.TrimSpace(strings.ToLower(status)) != "pending" {
		return errors.New("status withdraw tidak valid")
	}

	var before int64
	if err := tx.QueryRowContext(ctx, `
SELECT saldo
FROM public.dompet_member
WHERE member_id = $1
FOR UPDATE
`, memberID).Scan(&before); err != nil {
		return err
	}
	after := before + amount
	if _, err := tx.ExecContext(ctx, `
UPDATE public.dompet_member
SET saldo = $2, diperbarui_pada = now()
WHERE member_id = $1
`, memberID, after); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
INSERT INTO public.mutasi_dompet
  (member_id, ref_id, arah, jumlah, alasan, catatan, saldo_sebelum, saldo_sesudah, dibuat_pada)
VALUES
  ($1,$2,'CREDIT',$3,'RETAIL_WITHDRAW_REJECT_REFUND',NULLIF($4,''),$5,$6,now())
`, memberID, refID, amount, reason, before, after); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE public.retail_withdraw_request
SET status = 'rejected',
    reject_reason = $3,
    processed_by = $2,
    processed_at = now(),
    updated_at = now()
WHERE id = $1
`, reqID, actorID, strings.TrimSpace(reason)); err != nil {
		return err
	}

	return tx.Commit()
}
