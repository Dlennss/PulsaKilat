package service

import (
	"context"
	"fmt"
	"strings"

	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
)

func callbackBankSyntheticCandidate(row *repository.ProviderTrxRefRow, providerName string, specialCode string) (callbackFallbackCandidate, error) {
	if row == nil {
		return callbackFallbackCandidate{}, fmt.Errorf("row smb kosong")
	}
	bankCode, err := deriveBankCodeFromSMBRoute(ptrString(row.RequestMode), row.KodeProduk)
	if err != nil {
		return callbackFallbackCandidate{}, err
	}
	mode := ""
	mapID := row.ProdukProviderMapID
	if strings.EqualFold(strings.TrimSpace(providerName), "smb") {
		mode = "DIRECT"
	} else {
		mapID = nil
	}
	return callbackFallbackCandidate{
		Provider:            providerName,
		ProdukSKUSnapshot:   strings.ToUpper(strings.TrimSpace(row.ProdukSKUSnapshot)),
		ProdukProviderMapID: mapID,
		KodeProduk:          bankCode,
		SpecialCode:         helper.PtrString(strings.ToUpper(strings.TrimSpace(specialCode))),
		Mode:                helper.PtrString(mode),
		Source:              "bank_internal_chain",
		Need:                0,
		Fee:                 0,
	}, nil
}

func nextBankFallbackAfterSMB(row *repository.ProviderTrxRefRow) (string, string) {
	if row == nil {
		return "", ""
	}
	return "loketbayar", loketBayarBankTransferProduct
}

func (s *ProviderCallbackService) tryFallbackFromSMBBankChain(ctx context.Context, row *repository.ProviderTrxRefRow, trx *repository.CallbackTrxMemberFull, smbMsg string) (bool, string, int64, error) {
	if trx == nil || row == nil {
		return false, "", 0, nil
	}
	return s.tryFallbackFromProvider(ctx, trx, "smb", "smb_callback_fallback", smbMsg)
}
