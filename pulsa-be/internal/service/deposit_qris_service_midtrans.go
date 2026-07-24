package service

import (
	"strings"

	midtranssdk "github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/coreapi"
)

func IsDepositQrisOrderID(orderID string) bool {
	return strings.HasPrefix(strings.TrimSpace(strings.ToUpper(orderID)), depositQrisPrefix)
}

func calcDepositQrisFee(amount int64) int64 {
	return 0
}

func buildDepositMidtransChargeRequest(refID string, amount, feeAdmin, grossAmount int64) *coreapi.ChargeReq {
	items := []midtranssdk.ItemDetails{
		{
			ID:    "TOPUP-SALDO",
			Price: amount,
			Qty:   1,
			Name:  trimMidtransItemName("Topup Saldo Retail"),
		},
	}
	if feeAdmin > 0 {
		items = append(items, midtranssdk.ItemDetails{
			ID:    "ADMIN-QRIS",
			Price: feeAdmin,
			Qty:   1,
			Name:  trimMidtransItemName("Admin Fee QRIS 0.7%"),
		})
	}
	return &coreapi.ChargeReq{
		PaymentType: coreapi.PaymentTypeQris,
		TransactionDetails: midtranssdk.TransactionDetails{
			OrderID:  refID,
			GrossAmt: grossAmount,
		},
		Items: &items,
		Qris: &coreapi.QrisDetails{
			Acquirer: midtransAcquirer(),
		},
	}
}

func mapMidtransActions(actions []coreapi.Action) []map[string]string {
	if len(actions) == 0 {
		return nil
	}
	out := make([]map[string]string, 0, len(actions))
	for _, action := range actions {
		item := map[string]string{}
		if v := strings.TrimSpace(action.Name); v != "" {
			item["name"] = v
		}
		if v := strings.TrimSpace(action.Method); v != "" {
			item["method"] = v
		}
		if v := strings.TrimSpace(action.URL); v != "" {
			item["url"] = v
		}
		if len(item) > 0 {
			out = append(out, item)
		}
	}
	return out
}

func buildDepositQrisNote(transactionStatus, paymentType, transactionID, acquirer string) string {
	parts := make([]string, 0, 4)
	if v := strings.TrimSpace(transactionStatus); v != "" {
		parts = append(parts, "QRIS "+v)
	}
	if v := strings.TrimSpace(paymentType); v != "" {
		parts = append(parts, "type="+v)
	}
	if v := strings.TrimSpace(acquirer); v != "" {
		parts = append(parts, "acquirer="+v)
	}
	if v := strings.TrimSpace(transactionID); v != "" {
		parts = append(parts, "tx="+v)
	}
	return strings.Join(parts, ", ")
}
