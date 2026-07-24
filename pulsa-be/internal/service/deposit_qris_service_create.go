package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
)

func (s *DepositService) CreateQrisRequest(ctx context.Context, memberID int64, role string, amount int64) (*DepositQrisCreateResult, error) {
	if memberID <= 0 {
		return nil, errors.New("unauthorized")
	}
	if !helper.IsRetailRole(role) {
		return nil, errors.New("topup qris hanya untuk retail")
	}
	if amount <= 0 {
		return nil, errors.New("amount harus > 0")
	}

	serverKey, err := midtransServerKeyFromEnv()
	if err != nil {
		return nil, err
	}

	refID := depositQrisPrefix + time.Now().Format("20060102150405") + "-" + strings.ToUpper(helper.RandHex(4))
	feeAdmin := calcDepositQrisFee(amount)
	grossAmount := amount + feeAdmin
	if err := s.repo.CreateQrisRequest(ctx, memberID, amount, depositQrisMethod, refID, "QRIS pending"); err != nil {
		return nil, err
	}

	payload := buildDepositMidtransChargeRequest(refID, amount, feeAdmin, grossAmount)
	resp, err := chargeMidtransQRIS(serverKey, payload)
	if err != nil {
		_ = s.repo.RejectQrisByRefID(ctx, refID, "midtrans charge gagal: "+err.Error())
		return nil, err
	}

	qrURL := firstQRURL(resp.Actions)
	expiredAt := parseMidtransTime(resp.ExpiryTime)
	note := fmt.Sprintf("QRIS pending, gross=%d, fee=%d", grossAmount, feeAdmin)
	if err := s.repo.UpdateQrisPending(ctx, refID, qrURL, note); err != nil {
		return nil, err
	}

	rawResp := map[string]any{}
	if b, err := json.Marshal(resp); err == nil {
		_ = json.Unmarshal(b, &rawResp)
	}

	return &DepositQrisCreateResult{
		RefID:         refID,
		Amount:        amount,
		FeeAdmin:      feeAdmin,
		GrossAmount:   grossAmount,
		Status:        strings.TrimSpace(resp.TransactionStatus),
		PaymentType:   strings.TrimSpace(resp.PaymentType),
		TransactionID: strings.TrimSpace(resp.TransactionID),
		QRURL:         qrURL,
		ExpiredAt:     expiredAt,
		Actions:       mapMidtransActions(resp.Actions),
		RawResponse:   rawResp,
	}, nil
}

func (s *DepositService) GetQrisStatusByRefID(ctx context.Context, memberID int64, role, refID string, refresh bool) (*DepositQrisCreateResult, *repository.DepositRequestRow, error) {
	if memberID <= 0 {
		return nil, nil, errors.New("unauthorized")
	}
	if !helper.IsRetailRole(role) {
		return nil, nil, errors.New("topup qris hanya untuk retail")
	}
	refID = strings.TrimSpace(refID)
	if refID == "" {
		return nil, nil, errors.New("ref_id wajib diisi")
	}
	row, err := s.repo.GetByRefID(ctx, refID)
	if err != nil {
		return nil, nil, err
	}
	if row.MemberID != memberID {
		return nil, nil, sql.ErrNoRows
	}
	if refresh {
		if err := s.RefreshQrisStatusByRefID(ctx, refID); err != nil {
			return nil, nil, err
		}
		row, err = s.repo.GetByRefID(ctx, refID)
		if err != nil {
			return nil, nil, err
		}
	}
	return buildDepositQrisResultFromRow(row), row, nil
}
