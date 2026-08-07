package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"pulsa2/internal/helper"
	"pulsa2/internal/helper/providersn"
	providerpkg "pulsa2/internal/provider"
	"pulsa2/internal/repository"
)

func (s *AppOrderFulfillmentService) DispatchPaidOrderByInvoiceID(ctx context.Context, invoiceID string) error {
	order, err := s.orderRepo.GetByInvoiceID(ctx, invoiceID)
	if err != nil {
		return err
	}
	return s.DispatchPaidOrder(ctx, order)
}

func (s *AppOrderFulfillmentService) DispatchPaidOrder(ctx context.Context, order *repository.AppOrderRow) error {
	if order == nil {
		return fmt.Errorf("order not found")
	}
	if s.callbackRepo == nil || s.pricingRepo == nil {
		return fmt.Errorf("app order fulfillment belum siap")
	}
	if order.Status != "paid" {
		return nil
	}

	existing, err := s.providerTrxRepo.GetLatestByAppOrderID(ctx, order.ID)
	if err == nil && existing != nil {
		switch existing.Status {
		case "pending", "success":
			return nil
		case "failed":
			// Sudah failed — boleh re-dispatch, tapi cek dulu via refid
			// apakah ada attempt lain yang masih pending/success
			if byRef, refErr := s.providerTrxRepo.GetByRefID(ctx, order.InvoiceID, existing.Provider); refErr == nil && byRef != nil {
				if byRef.Status == "success" || byRef.Status == "pending" {
					return nil
				}
			}
		}
	}
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	pricingRow, err := s.pricingRepo.GetEffectiveByProdukIDActive(ctx, order.ProdukID)
	if err != nil {
		msg := fmt.Sprintf("harga provider retail tidak tersedia untuk %s", order.InvoiceID)
		_ = s.handleFailedOrder(ctx, order, 0, msg, "gagal memilih provider")
		return fmt.Errorf("%s", msg)
	}

	provider := strings.TrimSpace(strings.ToLower(pricingRow.Provider))
	if provider == "" {
		provider = "yuscom"
	}

	var nominalForMap int64
	if order.Nominal > 0 {
		nominalForMap = order.Nominal
	}
	providerProductCode, err := s.callbackRepo.ResolveProviderProductCodeByNominal(ctx, provider, order.ProdukSKUSnapshot, nominalForMap)
	if err != nil {
		msg := fmt.Sprintf("gagal resolve kode provider %s untuk %s", provider, order.InvoiceID)
		_ = s.handleFailedOrder(ctx, order, 0, msg, "gagal dispatch provider")
		return err
	}
	if strings.TrimSpace(providerProductCode) == "" {
		msg := fmt.Sprintf("kode produk provider %s tidak valid untuk %s", provider, order.InvoiceID)
		_ = s.handleFailedOrder(ctx, order, 0, msg, "gagal dispatch provider")
		return fmt.Errorf("%s", msg)
	}
	providerQty := order.Qty
	if provider == providerpkg.Pulsa24JamProviderName {
		providerProductCode, providerQty = resolvePulsa24JamAppRequest(providerProductCode, order)
	}

	reqPayload := map[string]any{
		"provider": provider,
		"product":  providerProductCode,
		"qty":      providerQty,
		"dest":     order.Dest,
		"refid":    order.InvoiceID,
	}
	reqJSON, _ := json.Marshal(reqPayload)

	createIn := repository.AppOrderProviderTrxCreateInput{
		AppOrderID: order.ID,
		Provider:   provider,
		RefID:      order.InvoiceID,
		Status:     "pending",
		RawRequest: string(reqJSON),
	}
	if err := s.providerTrxRepo.Create(ctx, createIn); err != nil {
		return err
	}

	row, err := s.providerTrxRepo.GetByRefID(ctx, order.InvoiceID, provider)
	if err != nil {
		return err
	}

	hs, body, callErr, price, sn := s.callAppOrderProvider(ctx, provider, providerProductCode, providerQty, order)

	rawRespJSON, _ := json.Marshal(map[string]any{
		"http_status": hs,
		"body":        body,
		"error": func() any {
			if callErr != nil {
				return callErr.Error()
			}
			return nil
		}(),
		"provider": provider,
	})

	if callErr != nil || hs != 200 || appOrderProviderLooksLikeSystemIssue(provider, body) {
		msg := strings.TrimSpace(body)
		if msg == "" && callErr != nil {
			msg = callErr.Error()
		}
		_ = s.providerTrxRepo.UpdateResult(ctx, repository.AppOrderProviderTrxUpdateInput{
			ID:          row.ID,
			Status:      "failed",
			KodeRespon:  fmt.Sprintf("%d", hs),
			Pesan:       msg,
			RawCallback: string(rawRespJSON),
		})
		if err := s.handleFailedOrder(ctx, order, row.ID, msg, "gagal dispatch provider"); err != nil {
			return err
		}
		return fmt.Errorf("%s dispatch gagal: http=%d err=%v body=%s", provider, hs, callErr, strings.TrimSpace(body))
	}

	if appOrderProviderImmediateReject(provider, body) {
		msg := strings.TrimSpace(body)
		if appOrderProviderProductUnavailable(provider, body) {
			if markErr := s.pricingRepo.MarkProviderProductTemporarilyUnavailable(ctx, order.ProdukID, provider); markErr != nil {
				helper.AppendProviderServiceLog("provider_callback_service.log", "mark product unavailable failed provider=%s product_id=%d sku=%s err=%v", provider, order.ProdukID, order.ProdukSKUSnapshot, markErr)
			} else {
				helper.AppendProviderServiceLog("provider_callback_service.log", "product temporarily unavailable provider=%s product_id=%d sku=%s cooldown=1h", provider, order.ProdukID, order.ProdukSKUSnapshot)
			}
		}
		harga := price
		if err := s.providerTrxRepo.UpdateResult(ctx, repository.AppOrderProviderTrxUpdateInput{
			ID:            row.ID,
			HargaProvider: &harga,
			Status:        "failed",
			KodeRespon:    "52",
			Pesan:         msg,
			RawCallback:   string(rawRespJSON),
		}); err != nil {
			return err
		}

		if order.BuyerType == "user" && order.MemberID != nil && *order.MemberID > 0 && order.HargaFinal > 0 {
			catatan := "refund saldo otomatis karena reject bisnis provider"
			if msg != "" {
				catatan = "refund saldo otomatis: " + msg
			}
			if err := s.callbackRepo.RefundAppOrderFunding(ctx, *order.MemberID, order.InvoiceID, catatan); err != nil {
				_ = s.orderRepo.UpdateStatusByID(ctx, order.ID, "failed")
				return fmt.Errorf("refund app order gagal member_id=%d invoice=%s err=%w", *order.MemberID, order.InvoiceID, err)
			}
			if err := s.orderRepo.UpdateStatusByID(ctx, order.ID, "refunded"); err != nil {
				return err
			}
			helper.AppendProviderServiceLog("provider_wallet.log", "app order immediate reject refunded member_id=%d invoice=%s provider_trx_id=%d", *order.MemberID, order.InvoiceID, row.ID)
			return nil
		}

		if strings.TrimSpace(strings.ToLower(order.BuyerType)) == "guest" && order.HargaFinal > 0 {
			reason := "refund guest pending claim karena reject bisnis provider"
			if msg != "" {
				reason = "refund guest pending claim: " + msg
			}
			if err := s.orderRepo.UpsertGuestRefundTicket(ctx, order, reason); err != nil {
				helper.AppendProviderServiceLog("provider_callback_service.log", "guest refund ticket create failed invoice=%s provider_trx_id=%d err=%v", order.InvoiceID, row.ID, err)
			}
		}

		if err := s.orderRepo.UpdateStatusByID(ctx, order.ID, "failed"); err != nil {
			return err
		}
		return nil
	}

	if !appOrderProviderLooksLikeAccepted(provider, body) {
		msg := strings.TrimSpace(body)
		if err := s.providerTrxRepo.UpdateResult(ctx, repository.AppOrderProviderTrxUpdateInput{
			ID:          row.ID,
			Status:      "failed",
			KodeRespon:  fmt.Sprintf("%d", hs),
			Pesan:       msg,
			RawCallback: string(rawRespJSON),
		}); err != nil {
			return err
		}
		if err := s.handleFailedOrder(ctx, order, row.ID, msg, "respons provider tidak dikenali"); err != nil {
			return err
		}
		return fmt.Errorf("respons %s tidak dikenali: %s", provider, msg)
	}

	harga := price
	if err := s.providerTrxRepo.UpdateResult(ctx, repository.AppOrderProviderTrxUpdateInput{
		ID:            row.ID,
		HargaProvider: &harga,
		Status:        "pending",
		Pesan:         strings.TrimSpace(body),
		SN:            strings.TrimSpace(sn),
		RawCallback:   string(rawRespJSON),
	}); err != nil {
		return err
	}
	if err := s.orderRepo.UpdateStatusByID(ctx, order.ID, "processing_provider"); err != nil {
		return err
	}
	helper.AppendProviderServiceLog("provider_callback_service.log", "app_order_fulfillment dispatched invoice=%s provider=%s app_order_id=%d provider_trx_id=%d", order.InvoiceID, provider, order.ID, row.ID)
	return nil
}

func (s *AppOrderFulfillmentService) callAppOrderProvider(ctx context.Context, provider, providerProductCode string, providerQty int64, order *repository.AppOrderRow) (hs int, body string, callErr error, price int64, sn string) {
	switch provider {
	case "gemilang":
		if s.gmClient == nil {
			return 0, "", fmt.Errorf("gemilang client belum tersedia"), 0, ""
		}
		acc, nextHS, nextBody, nextErr := s.gmClient.TrxNoSign(ctx, providerProductCode, order.Qty, order.Dest, order.InvoiceID)
		hs, body, callErr = nextHS, nextBody, nextErr
		price = acc.Price
		_, sn = providersn.ParseGemilangSNRefFromMsg(body)
		if strings.TrimSpace(sn) == "" {
			sn = strings.TrimSpace(acc.Ticket)
		}
	case "pulsa24jam":
		client := s.providerClients["pulsa24jam"]
		if client == nil {
			return 0, "", fmt.Errorf("pulsa24jam client belum tersedia"), 0, ""
		}
		resp, nextErr := client.Pay(ctx, providerpkg.PayRequest{
			Command: "PAY",
			Product: providerProductCode,
			Dest:    order.Dest,
			Qty:     providerQty,
			RefID:   order.InvoiceID,
		})
		callErr = nextErr
		if resp != nil {
			hs = resp.HTTPStatus
			body = resp.Body
			price = resp.Price
			sn = strings.TrimSpace(resp.ProviderRef)
			if sn == "" {
				sn = strings.TrimSpace(resp.Message)
			}
		}
	default:
		if s.ysClient == nil {
			return 0, "", fmt.Errorf("yuscom client belum tersedia"), 0, ""
		}
		acc, nextHS, nextBody, nextErr := s.ysClient.TrxNoSign(ctx, providerProductCode, order.Qty, order.Dest, order.InvoiceID)
		hs, body, callErr = nextHS, nextBody, nextErr
		price = acc.Price
		_, sn = providersn.ParseYuscomSNRefFromMsg(body)
		if strings.TrimSpace(sn) == "" {
			sn = strings.TrimSpace(acc.Ticket)
		}
	}
	return
}
