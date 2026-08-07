package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const Pulsa24JamProviderName = "pulsa24jam"

type Pulsa24JamAdapter struct {
	BaseURL       string
	MemberID      string
	APIKey        string
	PIN           string
	Password      string
	Secret        string
	CallbackToken string
	Client        *http.Client
}

type Pulsa24JamConfig struct {
	BaseURL       string
	MemberID      string
	APIKey        string
	PIN           string
	Password      string
	Secret        string
	CallbackToken string
	Timeout       time.Duration
}

func NewPulsa24JamAdapter(cfg Pulsa24JamConfig) *Pulsa24JamAdapter {
	timeout := cfg.Timeout
	if timeout <= 0 {
		timeout = 30 * time.Second
	}
	return &Pulsa24JamAdapter{
		BaseURL:       strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/"),
		MemberID:      strings.TrimSpace(cfg.MemberID),
		APIKey:        strings.TrimSpace(cfg.APIKey),
		PIN:           strings.TrimSpace(cfg.PIN),
		Password:      strings.TrimSpace(cfg.Password),
		Secret:        strings.TrimSpace(cfg.Secret),
		CallbackToken: strings.TrimSpace(cfg.CallbackToken),
		Client:        &http.Client{Timeout: timeout},
	}
}

func (a *Pulsa24JamAdapter) Configured() bool {
	return a != nil && a.BaseURL != "" && a.APIKey != "" && a.PIN != "" && a.Password != ""
}

func (a *Pulsa24JamAdapter) Name() string { return Pulsa24JamProviderName }

type pulsa24JamPayRequest struct {
	Commands string `json:"commands"`
	Product  string `json:"product,omitempty"`
	Dest     string `json:"dest,omitempty"`
	Qty      int64  `json:"qty,omitempty"`
	RefID    string `json:"refid,omitempty"`
	PIN      string `json:"pin"`
}

type pulsa24JamPayResponse struct {
	OK            bool                `json:"ok"`
	Success       bool                `json:"success"`
	RC            string              `json:"rc"`
	Code          string              `json:"code"`
	Message       string              `json:"message"`
	Msg           string              `json:"msg"`
	Status        string              `json:"status"`
	Command       string              `json:"command"`
	RefID         string              `json:"refid"`
	LegacyRefID   string              `json:"ref_id"`
	ProviderRef   string              `json:"provider_ref"`
	SN            string              `json:"sn"`
	Keterangan    string              `json:"keterangan"`
	Price         int64               `json:"price"`
	Harga         int64               `json:"harga"`
	Balance       int64               `json:"balance"`
	Amount        int64               `json:"amount"`
	ProviderRefID string              `json:"provider_refid"`
	QRURL         string              `json:"qr_url"`
	PaymentType   string              `json:"payment_type"`
	TransactionID string              `json:"transaction_id"`
	FeeAdmin      int64               `json:"fee_admin"`
	GrossAmount   int64               `json:"gross_amount"`
	ExpiredAt     *time.Time          `json:"expired_at"`
	Actions       []map[string]string `json:"actions"`
}

type Pulsa24JamDepositQRISResponse struct {
	RefID         string
	ProviderRefID string
	Amount        int64
	FeeAdmin      int64
	GrossAmount   int64
	Status        string
	PaymentType   string
	TransactionID string
	QRURL         string
	ExpiredAt     *time.Time
	Actions       []map[string]string
	Balance       int64
}

func (a *Pulsa24JamAdapter) Pay(ctx context.Context, req PayRequest) (*PayResponse, error) {
	if !a.Configured() {
		return nil, fmt.Errorf("pulsa24jam credential belum lengkap")
	}
	command := strings.ToUpper(strings.TrimSpace(req.Command))
	if command == "" {
		command = "PAY"
	}
	payload := pulsa24JamPayRequest{
		Commands: command,
		Product:  strings.TrimSpace(req.Product),
		Dest:     strings.TrimSpace(req.Dest),
		Qty:      req.Qty,
		RefID:    strings.TrimSpace(req.RefID),
		PIN:      a.PIN,
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.trxURL(), bytes.NewReader(rawPayload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Api-Key", a.APIKey)

	res, err := a.Client.Do(httpReq)
	if err != nil {
		return &PayResponse{
			RequestRaw: map[string]any{"payload": redactPulsa24JamPayload(payload), "url": a.trxURL()},
			Raw:        map[string]any{"error": err.Error()},
		}, err
	}
	defer res.Body.Close()

	bodyBytes, _ := io.ReadAll(res.Body)
	body := string(bodyBytes)
	var out pulsa24JamPayResponse
	_ = json.Unmarshal(bodyBytes, &out)

	rc := firstNonEmpty(out.RC, out.Code)
	refID := firstNonEmpty(out.RefID, out.LegacyRefID, payload.RefID)
	providerRef := firstNonEmpty(out.ProviderRef, out.SN, refID)
	message := firstNonEmpty(out.Message, out.Msg, out.Keterangan, out.Status, body)
	price := out.Price
	if price <= 0 {
		price = out.Harga
	}

	return &PayResponse{
		HTTPStatus:  res.StatusCode,
		Body:        body,
		RC:          rc,
		Message:     message,
		ProviderRef: providerRef,
		Price:       price,
		Balance:     out.Balance,
		RequestRaw: map[string]any{
			"payload": redactPulsa24JamPayload(payload),
			"url":     a.trxURL(),
		},
		Raw: map[string]any{
			"ok":           out.OK,
			"success":      out.Success,
			"command":      out.Command,
			"status":       out.Status,
			"refid":        refID,
			"provider_ref": providerRef,
			"sn":           out.SN,
			"body":         body,
		},
	}, nil
}

func (a *Pulsa24JamAdapter) CreateDepositQRIS(ctx context.Context, refID string, amount int64) (*Pulsa24JamDepositQRISResponse, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("nominal deposit QRIS harus > 0")
	}
	return a.depositQRIS(ctx, "DEPOSIT-QRIS", refID, amount)
}

func (a *Pulsa24JamAdapter) DepositQRISStatus(ctx context.Context, refID string) (*Pulsa24JamDepositQRISResponse, error) {
	return a.depositQRIS(ctx, "STATUS-DEPOSIT-QRIS", refID, 0)
}

func (a *Pulsa24JamAdapter) depositQRIS(ctx context.Context, command, refID string, amount int64) (*Pulsa24JamDepositQRISResponse, error) {
	if !a.Configured() {
		return nil, fmt.Errorf("pulsa24jam credential belum lengkap")
	}
	refID = strings.TrimSpace(refID)
	if refID == "" {
		return nil, fmt.Errorf("refid deposit QRIS wajib diisi")
	}
	payload := pulsa24JamPayRequest{
		Commands: strings.ToUpper(strings.TrimSpace(command)),
		Qty:      amount,
		RefID:    refID,
		PIN:      a.PIN,
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.trxURL(), bytes.NewReader(rawPayload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Api-Key", a.APIKey)
	res, err := a.Client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	bodyBytes, readErr := io.ReadAll(res.Body)
	if readErr != nil {
		return nil, readErr
	}
	var out pulsa24JamPayResponse
	if err := json.Unmarshal(bodyBytes, &out); err != nil {
		return nil, fmt.Errorf("response deposit QRIS Pulsa24Jam tidak valid: %w", err)
	}
	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices || !out.OK {
		msg := firstNonEmpty(out.Message, out.Msg, out.Keterangan, string(bodyBytes))
		return nil, fmt.Errorf("deposit QRIS Pulsa24Jam gagal: %s", msg)
	}
	return &Pulsa24JamDepositQRISResponse{
		RefID:         firstNonEmpty(out.RefID, out.LegacyRefID, refID),
		ProviderRefID: strings.TrimSpace(out.ProviderRefID),
		Amount:        out.Amount,
		FeeAdmin:      out.FeeAdmin,
		GrossAmount:   out.GrossAmount,
		Status:        strings.ToLower(strings.TrimSpace(out.Status)),
		PaymentType:   strings.TrimSpace(out.PaymentType),
		TransactionID: strings.TrimSpace(out.TransactionID),
		QRURL:         strings.TrimSpace(out.QRURL),
		ExpiredAt:     out.ExpiredAt,
		Actions:       out.Actions,
		Balance:       out.Balance,
	}, nil
}

func (a *Pulsa24JamAdapter) trxURL() string {
	base := strings.TrimRight(strings.TrimSpace(a.BaseURL), "/")
	if strings.HasSuffix(base, "/trx") {
		return base
	}
	if strings.HasSuffix(base, "/v1") {
		return base + "/trx"
	}
	return base + "/v1/trx"
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func redactPulsa24JamPayload(payload pulsa24JamPayRequest) map[string]any {
	out := map[string]any{
		"commands": payload.Commands,
		"product":  payload.Product,
		"dest":     payload.Dest,
		"qty":      payload.Qty,
		"refid":    payload.RefID,
	}
	if payload.PIN != "" {
		out["pin"] = "***"
	}
	return out
}
