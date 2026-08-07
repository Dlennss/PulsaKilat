package service

import (
	"context"
	"database/sql"
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

	if order.BuyerType != "user" || order.MemberID == nil || *order.MemberID <= 0 {
		return nil, fmt.Errorf("transaksi produk wajib login dan menggunakan saldo PulsaKilat")
	}
	if order.HargaFinal <= 0 {
		return nil, fmt.Errorf("nominal pembayaran tidak valid")
	}
	now := time.Now()
	payment := repository.AppOrderPaymentCreateInput{
		AppOrderID:        order.ID,
		OrderID:           order.InvoiceID,
		PaymentType:       "balance",
		TransactionStatus: "settlement",
		FraudStatus:       "accept",
		PaidAt:            &now,
		SettlementTime:    &now,
	}
	if err := s.paymentRepo.CreateWithBalanceDebit(ctx, payment, *order.MemberID, order.HargaFinal); err != nil {
		return nil, err
	}
	if s.fulfillmentSvc != nil {
		if err := s.fulfillmentSvc.DispatchPaidOrderByInvoiceID(ctx, order.InvoiceID); err != nil {
			log.Printf("[app_order_payment] fulfillment Pulsa24Jam gagal invoice=%s err=%v", order.InvoiceID, err)
		}
	}
	return s.paymentRepo.GetByOrderID(ctx, order.InvoiceID)
}
