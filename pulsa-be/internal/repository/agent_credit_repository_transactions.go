package repository

import (
	"context"
	"strings"
	"time"
)

type AgentCreditAgentTransaction struct {
	ID             int64     `json:"id"`
	MemberID       int64     `json:"member_id"`
	MemberName     string    `json:"member_nama"`
	MemberEmail    string    `json:"member_email"`
	RefID          string    `json:"ref_id"`
	ProductCode    string    `json:"kode_produk"`
	ProductName    string    `json:"produk_nama"`
	Destination    string    `json:"tujuan"`
	Quantity       int64     `json:"qty"`
	Status         string    `json:"status"`
	EstimatedPrice int64     `json:"biaya_perkiraan"`
	ActualPrice    int64     `json:"biaya_aktual"`
	CreatedAt      time.Time `json:"dibuat_pada"`
	UpdatedAt      time.Time `json:"diperbarui_pada"`
}

func (r *AgentCreditRepository) ListAgentTransactions(ctx context.Context, status, search string, limit int) ([]AgentCreditAgentTransaction, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	rows, err := r.db.QueryContext(ctx, `
SELECT
  ao.id,
  m.id,
  COALESCE(m.nama, ''),
  COALESCE(m.email, ''),
  ao.invoice_id,
  COALESCE(ao.produk_sku_snapshot, ''),
  COALESCE(ao.produk_nama_snapshot, ''),
  COALESCE(ao.dest, ''),
  COALESCE(ao.qty, 0),
  COALESCE(ao.status, ''),
  COALESCE(ao.harga_final, 0),
  COALESCE(ao.harga_final, 0),
  COALESCE(ao.dibuat_pada, NOW()),
  COALESCE(ao.diubah_pada, ao.dibuat_pada, NOW())
FROM public.app_order ao
JOIN public.member m ON m.id = ao.member_id
WHERE LOWER(COALESCE(m.role, '')) = 'agent'
  AND LOWER(COALESCE(ao.buyer_type, '')) = 'user'
  AND (
    $1 = ''
    OR ($1 = 'pending' AND LOWER(COALESCE(ao.status, '')) IN ('pending', 'pending_payment', 'paid', 'processing_provider'))
    OR ($1 <> 'pending' AND LOWER(COALESCE(ao.status, '')) = $1)
  )
  AND (
    $2 = ''
    OR m.nama ILIKE '%' || $2 || '%'
    OR m.email ILIKE '%' || $2 || '%'
    OR ao.invoice_id ILIKE '%' || $2 || '%'
    OR ao.produk_sku_snapshot ILIKE '%' || $2 || '%'
    OR ao.produk_nama_snapshot ILIKE '%' || $2 || '%'
    OR ao.dest ILIKE '%' || $2 || '%'
  )
ORDER BY ao.dibuat_pada DESC, ao.id DESC
LIMIT $3
`, strings.ToLower(strings.TrimSpace(status)), strings.TrimSpace(search), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]AgentCreditAgentTransaction, 0)
	for rows.Next() {
		var item AgentCreditAgentTransaction
		if err := rows.Scan(
			&item.ID, &item.MemberID, &item.MemberName, &item.MemberEmail,
			&item.RefID, &item.ProductCode, &item.ProductName, &item.Destination,
			&item.Quantity, &item.Status, &item.EstimatedPrice, &item.ActualPrice,
			&item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
