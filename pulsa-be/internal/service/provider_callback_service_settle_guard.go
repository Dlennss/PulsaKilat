package service

import (
	"context"
	"database/sql"

	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
)

// settleResult holds the outcome of a guarded settle attempt.
type settleResult struct {
	Changed bool // true if status was actually updated (not already final)
}

// guardedSettle acquires an advisory lock on the transaction, re-reads the status,
// and only proceeds with the settle if the status transition is valid.
// This prevents race conditions where two callbacks for the same transaction
// both execute financial side-effects.
func (s *ProviderCallbackService) guardedSettle(
	ctx context.Context,
	trx *repository.CallbackTrxMemberFull,
	finalStatus, ketDB string,
	biayaAktual, hargaJavapay, hargaMember int64,
	provider, refid string,
) settleResult {
	if trx == nil || s == nil || s.repo == nil {
		return settleResult{Changed: false}
	}

	// Advisory lock: serialize all callback processing for this transaksi_member
	locked, lockErr := s.repo.AcquireCallbackLock(ctx, trx.ID)
	if lockErr != nil {
		helper.AppendProviderServiceLog("provider_callback_error.log",
			"advisory lock failed provider=%s refid=%s trx_id=%d err=%v", provider, refid, trx.ID, lockErr)
	}
	if locked {
		defer s.repo.ReleaseCallbackLock(ctx, trx.ID)
	}

	// Re-read status after acquiring lock to avoid TOCTOU
	latestTrx, err := s.repo.GetTransaksiMemberByID(ctx, trx.ID)
	if err != nil || latestTrx == nil {
		return settleResult{Changed: false}
	}
	if shouldKeepExistingMemberFinalStatus(latestTrx.Status, finalStatus) {
		return settleResult{Changed: false}
	}

	// Try to settle — if another callback already settled, this returns false
	changed, err := s.repo.SettleAndCheck(ctx, trx.ID, finalStatus, ketDB, biayaAktual, hargaJavapay, hargaMember)
	if err != nil && err != sql.ErrNoRows {
		helper.AppendProviderServiceLog("provider_callback_error.log",
			"settle failed provider=%s refid=%s trx_id=%d status=%s err=%v", provider, refid, trx.ID, finalStatus, err)
	}

	return settleResult{Changed: changed}
}
