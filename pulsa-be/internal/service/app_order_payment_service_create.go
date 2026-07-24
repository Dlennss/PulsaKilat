package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"pulsa2/internal/repository"
)

func (s *AppOrderPaymentService) CreateByInvoiceID(ctx context.Context, invoiceID string) (*repository.AppOrderPaymentRow, error) {
	order, err := s.orderRepo.GetByInvoiceID(ctx, invoiceID)
	if err != nil {
		return nil, err
	}
	if order.Status != "pending_payment" {
		return nil, fmt.Errorf("order tidak dalam status pending_payment")
	}

	existing, err := s.paymentRepo.GetByOrderID(ctx, order.InvoiceID)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	walletDebit := int64(0)
	qrisAmount := order.HargaFinal
	if order.BuyerType == "user" && order.MemberID != nil && *order.MemberID > 0 && order.HargaFinal > 0 {
		saldo, err := s.paymentRepo.GetMemberSaldo(ctx, *order.MemberID)
		if err == nil && saldo > 0 {
			walletDebit = minInt64(order.HargaFinal, saldo)
			qrisAmount = order.HargaFinal - walletDebit
		}
	}

	if qrisAmount == 0 {
		now := time.Now()
		rawReq := repository.BuildPaymentRawRequest(nil, walletDebit, 0, 0, order.HargaFinal, order.HargaFinal)
		payment := repository.AppOrderPaymentCreateInput{
			AppOrderID:        order.ID,
			OrderID:           order.InvoiceID,
			GrossAmount:       0,
			PaymentType:       "wallet",
			TransactionStatus: "settlement",
			FraudStatus:       "accept",
			RawRequest:        rawReq,
			RawCallback:       "{}",
			PaidAt:            &now,
			SettlementTime:    &now,
		}
		if err := s.paymentRepo.CreateWithWalletDebit(ctx, payment, derefInt64(order.MemberID), walletDebit, "APP_ORDER_WALLET_DEBIT", "pembayaran penuh via saldo", true); err != nil {
			return nil, err
		}
		if s.fulfillmentSvc != nil {
			if err := s.fulfillmentSvc.DispatchPaidOrderByInvoiceID(ctx, order.InvoiceID); err != nil {
				log.Printf("[app_order_payment] fulfillment dispatch gagal invoice=%s err=%v", order.InvoiceID, err)
			}
		}
		return s.paymentRepo.GetByOrderID(ctx, order.InvoiceID)
	}

	serverKey, err := midtransServerKeyFromEnv()
	if err != nil {
		return nil, err
	}

	payload := buildMidtransChargeRequest(order, qrisAmount)
	payloadJSON := repository.BuildPaymentRawRequest(payload, walletDebit, qrisAmount, 0, order.HargaFinal, order.HargaFinal)

	resp, err := chargeMidtransQRIS(serverKey, payload)
	if err != nil {
		return nil, err
	}
	rawResp, _ := json.Marshal(resp)

	qrURL := firstQRURL(resp.Actions)
	expiredAt := parseMidtransTime(resp.ExpiryTime)
	payment := repository.AppOrderPaymentCreateInput{
		AppOrderID:        order.ID,
		OrderID:           order.InvoiceID,
		TransactionID:     resp.TransactionID,
		GrossAmount:       qrisAmount,
		PaymentType:       resp.PaymentType,
		TransactionStatus: resp.TransactionStatus,
		FraudStatus:       resp.FraudStatus,
		Acquirer:          resp.Acquirer,
		QRURL:             qrURL,
		RawRequest:        payloadJSON,
		RawCallback:       string(rawResp),
		ExpiredAt:         expiredAt,
	}
	if err := s.paymentRepo.CreateWithWalletDebit(ctx, payment, derefInt64(order.MemberID), walletDebit, "APP_ORDER_WALLET_DEBIT", "pembayaran parsial via saldo", false); err != nil {
		return nil, err
	}
	return s.paymentRepo.GetByOrderID(ctx, order.InvoiceID)
}
