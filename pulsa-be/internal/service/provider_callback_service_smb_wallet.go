package service

import (
	"context"

	"pulsa2/internal/repository"
)

// Debit dompet provider di-handle oleh DB trigger (trg_provider_wallet_on_success).
// Fungsi ini dipertahankan supaya caller tidak break, tapi tidak melakukan apa-apa.

func (s *ProviderCallbackService) syncSMBWalletSuccess(ctx context.Context, refid string, row *repository.ProviderTrxRefRow, price int64, note string) bool {
	return true
}

func (s *ProviderCallbackService) syncJavapayWalletSuccess(ctx context.Context, refid string, row *repository.ProviderTrxRefRow, price int64, note string) bool {
	return true
}
