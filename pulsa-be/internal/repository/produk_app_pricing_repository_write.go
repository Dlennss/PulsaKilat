package repository

import (
	"context"
	"database/sql"
)

func (r *ProdukAppPricingRepository) Create(ctx context.Context, in ProdukAppPricingUpsertInput) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
INSERT INTO public.produk_app_pricing
  (produk_id, harga, aktif, fetched_at, created_at, updated_at)
VALUES
  ($1, $2, $3, $4, now(), now())
RETURNING id
`, in.ProdukID, in.Harga, in.Aktif, in.FetchedAt).Scan(&id)
	return id, err
}

func (r *ProdukAppPricingRepository) Update(ctx context.Context, in ProdukAppPricingUpsertInput) error {
	res, err := r.db.ExecContext(ctx, `
UPDATE public.produk_app_pricing
SET produk_id = $2,
    harga = $3,
    aktif = $4,
    fetched_at = $5,
    updated_at = now()
WHERE id = $1
`, in.ID, in.ProdukID, in.Harga, in.Aktif, in.FetchedAt)
	if err != nil {
		return err
	}
	aff, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if aff == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *ProdukAppPricingRepository) Delete(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, `
DELETE FROM public.produk_app_pricing
WHERE id = $1
`, id)
	if err != nil {
		return err
	}
	aff, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if aff == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *ProdukAppPricingRepository) ExistsByProdukDefaultProvider(ctx context.Context, produkID int64) (bool, error) {
	var n int64
	err := r.db.QueryRowContext(ctx, `
SELECT COUNT(1)
FROM public.produk_app_pricing
WHERE produk_id = $1
  AND provider = 'yuscom'
`, produkID).Scan(&n)
	if err != nil {
		return false, err
	}
	return n > 0, nil
}
