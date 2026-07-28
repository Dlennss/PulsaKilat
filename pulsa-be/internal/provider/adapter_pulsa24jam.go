package provider

/*
Pulsa24Jam integration scaffold.

File ini sengaja masih berupa komentar supaya belum aktif dan tidak mengganggu
provider yang sekarang. Nanti kalau API Pulsa24Jam sudah siap, tinggal buka
komentar bagian yang diperlukan, isi ENV, lalu register adapter ini di router
atau factory provider yang dipakai aplikasi.

ENV yang perlu disiapkan di pulsa-be/.env:

	PULSA24JAM_BASE_URL=https://api.pulsa24jam.co.id
	PULSA24JAM_MEMBER_ID=isi_member_id
	PULSA24JAM_PIN=isi_pin_atau_password
	PULSA24JAM_SECRET=isi_secret_jika_ada
	PULSA24JAM_CALLBACK_TOKEN=token_rahasia_untuk_validasi_callback

Alur ideal:

	1. User checkout di PulsaKilat.
	2. Payment berhasil.
	3. Backend PulsaKilat membuat ref_id unik.
	4. Backend hit Pulsa24Jam dengan product, dest, qty, ref_id.
	5. Response disimpan di transaksi_provider/transaksi_member.
	6. Kalau status pending, tunggu callback atau cek status berkala.
	7. Kalau success/failed, finalkan transaksi dan update saldo/status user.

Catatan penting:

	- Jangan pernah panggil Pulsa24Jam langsung dari frontend.
	- Credential Pulsa24Jam harus di backend ENV.
	- ref_id wajib unik supaya transaksi tidak dobel.
	- Simpan raw request dan raw response untuk audit kalau ada komplain.
	- Samakan mapping produk internal PulsaKilat ke kode produk Pulsa24Jam di DB.
*/

/*
import (
	"bytes"
	"context"
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)
*/

/*
type Pulsa24JamAdapter struct {
	BaseURL  string
	MemberID string
	PIN      string
	Secret   string
	Client   *http.Client
}

func NewPulsa24JamAdapterFromEnv() *Pulsa24JamAdapter {
	return &Pulsa24JamAdapter{
		BaseURL:  strings.TrimRight(os.Getenv("PULSA24JAM_BASE_URL"), "/"),
		MemberID: os.Getenv("PULSA24JAM_MEMBER_ID"),
		PIN:      os.Getenv("PULSA24JAM_PIN"),
		Secret:   os.Getenv("PULSA24JAM_SECRET"),
		Client:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (a *Pulsa24JamAdapter) Name() string { return "pulsa24jam" }

type pulsa24JamPayRequest struct {
	MemberID string `json:"member_id"`
	Product  string `json:"product"`
	Dest     string `json:"dest"`
	Qty      int64  `json:"qty,omitempty"`
	RefID    string `json:"ref_id"`
	Sign     string `json:"sign,omitempty"`
}

type pulsa24JamPayResponse struct {
	Success     bool   `json:"success"`
	RC          string `json:"rc"`
	Message     string `json:"message"`
	RefID       string `json:"ref_id"`
	ProviderRef string `json:"provider_ref"`
	Status      string `json:"status"`
	Price       int64  `json:"price"`
	Balance     int64  `json:"balance"`
}

func (a *Pulsa24JamAdapter) Pay(ctx context.Context, req PayRequest) (*PayResponse, error) {
	if a.BaseURL == "" || a.MemberID == "" || a.PIN == "" {
		return nil, fmt.Errorf("pulsa24jam credential belum lengkap")
	}

	payload := pulsa24JamPayRequest{
		MemberID: a.MemberID,
		Product:  req.Product,
		Dest:     req.Dest,
		Qty:      req.Qty,
		RefID:    req.RefID,
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

	res, err := a.Client.Do(httpReq)
	if err != nil {
		return &PayResponse{
			RequestRaw: map[string]any{"payload": payload},
			Raw:        map[string]any{"error": err.Error()},
		}, err
	}
	defer res.Body.Close()

	bodyBytes, _ := io.ReadAll(res.Body)
	body := string(bodyBytes)

	var out pulsa24JamPayResponse
	_ = json.Unmarshal(bodyBytes, &out)

	return &PayResponse{
		HTTPStatus:  res.StatusCode,
		Body:        body,
		RC:          out.RC,
		Message:     out.Message,
		ProviderRef: out.ProviderRef,
		Price:       out.Price,
		Balance:     out.Balance,
		RequestRaw:  map[string]any{"payload": payload},
		Raw: map[string]any{
			"success":      out.Success,
			"status":       out.Status,
			"ref_id":       out.RefID,
			"provider_ref": out.ProviderRef,
			"body":         body,
		},
	}, nil
}

func (a *Pulsa24JamAdapter) sign(refID, product, dest string) string {
	// TODO: Sesuaikan dengan dokumentasi Pulsa24Jam.
	// Contoh umum: md5(member_id + pin + ref_id)
	sum := md5.Sum([]byte(a.MemberID + a.PIN + refID + product + dest + a.Secret))
	return hex.EncodeToString(sum[:])
}
*/

/*
Callback/status scaffold.

Kalau Pulsa24Jam menyediakan callback, buat controller misalnya:

	POST /v1/provider/pulsa24jam/callback

Payload callback biasanya berisi:

	{
	  "ref_id": "PK-...",
	  "status": "SUCCESS/PENDING/FAILED",
	  "rc": "00",
	  "message": "Transaksi sukses",
	  "sn": "Serial number",
	  "provider_ref": "..."
	}

Yang harus dilakukan endpoint callback:

	1. Validasi token/signature callback.
	2. Cari transaksi_provider berdasarkan ref_id.
	3. Update status provider.
	4. Finalkan transaksi member:
	   - success: status sukses, simpan SN.
	   - failed: status gagal, refund saldo jika sudah didebit.
	   - pending: biarkan menunggu.
	5. Simpan raw callback untuk audit.

Kalau tidak ada callback, buat job/status check:

	- Ambil transaksi pending lebih dari X menit.
	- Hit endpoint status Pulsa24Jam pakai ref_id.
	- Finalkan status sesuai response.
*/
