package provider

import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/hex"
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
	return a != nil && a.BaseURL != "" && a.MemberID != "" && a.APIKey != "" && a.PIN != ""
}

func (a *Pulsa24JamAdapter) Name() string { return Pulsa24JamProviderName }

type pulsa24JamPayRequest struct {
	MemberID string `json:"member_id,omitempty"`
	APIKey   string `json:"api_key,omitempty"`
	PIN      string `json:"pin,omitempty"`
	Password string `json:"password,omitempty"`
	Product  string `json:"product,omitempty"`
	Dest     string `json:"dest,omitempty"`
	Qty      int64  `json:"qty,omitempty"`
	RefID    string `json:"ref_id,omitempty"`
	Command  string `json:"command,omitempty"`
	Sign     string `json:"sign,omitempty"`
}

type pulsa24JamPayResponse struct {
	OK          bool   `json:"ok"`
	Success     bool   `json:"success"`
	RC          string `json:"rc"`
	Code        string `json:"code"`
	Message     string `json:"message"`
	Status      string `json:"status"`
	RefID       string `json:"ref_id"`
	ProviderRef string `json:"provider_ref"`
	SN          string `json:"sn"`
	Price       int64  `json:"price"`
	Balance     int64  `json:"balance"`
}

func (a *Pulsa24JamAdapter) Pay(ctx context.Context, req PayRequest) (*PayResponse, error) {
	if !a.Configured() {
		return nil, fmt.Errorf("pulsa24jam credential belum lengkap")
	}
	payload := pulsa24JamPayRequest{
		MemberID: a.MemberID,
		APIKey:   a.APIKey,
		PIN:      a.PIN,
		Password: a.Password,
		Product:  strings.TrimSpace(req.Product),
		Dest:     strings.TrimSpace(req.Dest),
		Qty:      req.Qty,
		RefID:    strings.TrimSpace(req.RefID),
		Command:  strings.TrimSpace(req.Command),
		Sign:     a.sign(req.RefID, req.Product, req.Dest),
	}
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.BaseURL+"/trx", bytes.NewReader(rawPayload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-API-Key", a.APIKey)

	res, err := a.Client.Do(httpReq)
	if err != nil {
		return &PayResponse{
			RequestRaw: map[string]any{"payload": payload, "url": a.BaseURL + "/trx"},
			Raw:        map[string]any{"error": err.Error()},
		}, err
	}
	defer res.Body.Close()

	bodyBytes, _ := io.ReadAll(res.Body)
	body := string(bodyBytes)
	var out pulsa24JamPayResponse
	_ = json.Unmarshal(bodyBytes, &out)

	rc := firstNonEmpty(out.RC, out.Code)
	providerRef := firstNonEmpty(out.ProviderRef, out.SN, out.RefID)
	message := firstNonEmpty(out.Message, out.Status, body)

	return &PayResponse{
		HTTPStatus:  res.StatusCode,
		Body:        body,
		RC:          rc,
		Message:     message,
		ProviderRef: providerRef,
		Price:       out.Price,
		Balance:     out.Balance,
		RequestRaw: map[string]any{
			"payload": redactPulsa24JamPayload(payload),
			"url":     a.BaseURL + "/trx",
		},
		Raw: map[string]any{
			"ok":           out.OK,
			"success":      out.Success,
			"status":       out.Status,
			"ref_id":       out.RefID,
			"provider_ref": providerRef,
			"sn":           out.SN,
			"body":         body,
		},
	}, nil
}

func (a *Pulsa24JamAdapter) sign(refID, product, dest string) string {
	// Formula ini placeholder aman. Sesuaikan dengan dokumentasi resmi Pulsa24Jam
	// jika mereka memberikan aturan signature yang berbeda.
	raw := a.MemberID + a.APIKey + a.PIN + strings.TrimSpace(refID) + strings.TrimSpace(product) + strings.TrimSpace(dest) + a.Secret
	sum := md5.Sum([]byte(raw))
	return hex.EncodeToString(sum[:])
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
		"member_id": payload.MemberID,
		"product":   payload.Product,
		"dest":      payload.Dest,
		"qty":       payload.Qty,
		"ref_id":    payload.RefID,
		"command":   payload.Command,
	}
	if payload.APIKey != "" {
		out["api_key"] = "***"
	}
	if payload.PIN != "" {
		out["pin"] = "***"
	}
	if payload.Password != "" {
		out["password"] = "***"
	}
	if payload.Sign != "" {
		out["sign"] = "***"
	}
	return out
}
