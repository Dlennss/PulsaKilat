package service

import (
	"context"
	"fmt"
	"strings"

	"pulsa2/gemilang"
	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
	"pulsa2/yuscom"
)

func (s *AppOrderFulfillmentService) handleFailedOrder(ctx context.Context, order *repository.AppOrderRow, providerTrxID int64, msg, reasonPrefix string) error {
	if order == nil {
		return fmt.Errorf("order not found")
	}

	reason := strings.TrimSpace(reasonPrefix)
	if reason == "" {
		reason = "transaksi provider aplikasi gagal"
	}
	if strings.TrimSpace(msg) != "" {
		reason = fmt.Sprintf("%s: %s", reason, strings.TrimSpace(msg))
	}

	if order.BuyerType == "user" && order.MemberID != nil && *order.MemberID > 0 && order.HargaFinal > 0 {
		if err := s.callbackRepo.RefundAppOrderFunding(ctx, *order.MemberID, order.InvoiceID, "refund saldo otomatis: "+reason); err != nil {
			_ = s.orderRepo.UpdateStatusByID(ctx, order.ID, "failed")
			return fmt.Errorf("refund app order gagal member_id=%d invoice=%s err=%w", *order.MemberID, order.InvoiceID, err)
		}
		if err := s.orderRepo.UpdateStatusByID(ctx, order.ID, "refunded"); err != nil {
			return err
		}
		helper.AppendProviderServiceLog("provider_wallet.log", "app order dispatch fail refunded member_id=%d invoice=%s provider_trx_id=%d", *order.MemberID, order.InvoiceID, providerTrxID)
		return nil
	}

	if strings.TrimSpace(strings.ToLower(order.BuyerType)) == "guest" && order.HargaFinal > 0 {
		if err := s.orderRepo.UpsertGuestRefundTicket(ctx, order, "refund guest pending claim: "+reason); err != nil {
			helper.AppendProviderServiceLog("provider_callback_service.log", "guest refund ticket create failed invoice=%s provider_trx_id=%d err=%v", order.InvoiceID, providerTrxID, err)
		}
	}

	return s.orderRepo.UpdateStatusByID(ctx, order.ID, "failed")
}

func appOrderProviderLooksLikeSystemIssue(provider, body string) bool {
	switch strings.TrimSpace(strings.ToLower(provider)) {
	case "gemilang":
		return gemilang.LooksLikeSystemIssue(body)
	case "pulsa24jam":
		upper := strings.ToUpper(strings.TrimSpace(body))
		return strings.Contains(upper, "TIMEOUT") || strings.Contains(upper, "SYSTEM ERROR") || strings.Contains(upper, "MAINTENANCE")
	default:
		return yuscom.LooksLikeSystemIssue(body)
	}
}

func appOrderProviderImmediateReject(provider, body string) bool {
	switch strings.TrimSpace(strings.ToLower(provider)) {
	case "gemilang":
		return helper.LooksLikeGemilangImmediateReject(body)
	case "pulsa24jam":
		upper := strings.ToUpper(strings.TrimSpace(body))
		return strings.Contains(upper, "GAGAL") ||
			strings.Contains(upper, "FAILED") ||
			strings.Contains(upper, "SALDO TIDAK CUKUP") ||
			strings.Contains(upper, `"STATUS":3`) ||
			strings.Contains(upper, `"STATUS":"3"`) ||
			strings.Contains(upper, `"STATUS":"FAILED"`) ||
			strings.Contains(upper, `"SUCCESS":FALSE`)
	default:
		return helper.LooksLikeYuscomImmediateReject(body)
	}
}

func appOrderProviderLooksLikeAccepted(provider, body string) bool {
	switch strings.TrimSpace(strings.ToLower(provider)) {
	case "gemilang":
		return helper.LooksLikeGemilangAccepted(body) || helper.LooksLikeGemilangSuccess(body)
	case "pulsa24jam":
		upper := strings.ToUpper(strings.TrimSpace(body))
		return strings.Contains(upper, "SUKSES") ||
			strings.Contains(upper, "SUCCESS") ||
			strings.Contains(upper, "PENDING") ||
			strings.Contains(upper, `"OK":TRUE`) ||
			strings.Contains(upper, `"SUCCESS":TRUE`) ||
			strings.Contains(upper, `"RC":"00"`)
	default:
		return helper.LooksLikeYuscomAccepted(body) || strings.Contains(strings.ToUpper(strings.TrimSpace(body)), "SUKSES")
	}
}
