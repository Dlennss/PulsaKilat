package helper

import (
	"strings"

	"pulsa2/minions"
	"pulsa2/sagaramobile"
	"pulsa2/smb"
)

type ProviderResponseState string

const (
	ProviderResponseUnknown ProviderResponseState = "unknown"
	ProviderResponseSuccess ProviderResponseState = "success"
	ProviderResponsePending ProviderResponseState = "pending"
	ProviderResponseFailed  ProviderResponseState = "failed"
)

func ExtractProviderStatusCodeFor(provider string, body string) string {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "sagaramobile":
		return strings.TrimSpace(sagaramobile.ExtractStatusCode(body))
	case "minions":
		return strings.TrimSpace(minions.ExtractStatusCode(body))
	case "smb", "chytron":
		return strings.TrimSpace(smb.ExtractStatusCode(body))
	default:
		return strings.TrimSpace(ExtractProviderStatusCode(body))
	}
}

func looksLikeSMBFailureAfterPriorSuccess(upper string) bool {
	upper = strings.ToUpper(strings.TrimSpace(upper))
	if !strings.Contains(upper, "SEMPAT SUKSES") {
		return false
	}
	return strings.Contains(upper, "GAGAL") ||
		strings.Contains(upper, "FAILED") ||
		strings.Contains(upper, "ERROR") ||
		strings.Contains(upper, "BATAL") ||
		strings.Contains(upper, "REFUND") ||
		strings.Contains(upper, "SALDO DIKEMBALIKAN") ||
		strings.Contains(upper, "DIKEMBALIKAN")
}

// ProviderResponseStateOf menentukan status transaksi berdasarkan PESAN,
// bukan RC. RC hanya dipakai sebagai fallback terakhir kalau pesan kosong.
// Prinsip: pesan dari provider adalah sumber kebenaran.
func ProviderResponseStateOf(provider, rc, msg string) ProviderResponseState {
	provider = strings.ToLower(strings.TrimSpace(provider))
	rc = strings.TrimSpace(rc)
	msg = strings.TrimSpace(msg)

	if rc == "" && msg == "" {
		return ProviderResponsePending
	}

	// Pesan internal sistem kita = sudah final
	upper := strings.ToUpper(msg)
	if strings.HasPrefix(upper, "PROVIDER ") || strings.HasPrefix(upper, "BUG ") ||
		strings.HasPrefix(upper, "HTTP ERROR") || strings.HasPrefix(upper, "SMB CEK CALLBACK") ||
		strings.HasPrefix(upper, "SMB GAGAL") {
		return ProviderResponseFailed
	}

	// Kalau RC kosong tapi pesan mengandung status=XX, extract RC dari pesan
	if rc == "" && msg != "" {
		if extracted := ExtractProviderStatusCodeFor(provider, msg); extracted != "" {
			rc = extracted
		}
	}

	switch provider {
	case "javapay":
		return ClassifyJavapayResponseStatus(rc, msg)
	case "talentapay":
		switch {
		case LooksLikeTalentaSuccess(msg) && !LooksLikeTalentaImmediateReject(msg):
			return ProviderResponseSuccess
		case LooksLikeTalentaImmediateReject(msg):
			return ProviderResponseFailed
		case LooksLikeTalentaAccepted(msg):
			return ProviderResponsePending
		}
	case "multikom":
		switch {
		case LooksLikeMultikomSuccess(msg) && !LooksLikeMultikomImmediateReject(msg):
			return ProviderResponseSuccess
		case LooksLikeMultikomImmediateReject(msg):
			return ProviderResponseFailed
		case LooksLikeMultikomAccepted(msg):
			return ProviderResponsePending
		}
	case "gemilang":
		switch {
		case LooksLikeGemilangSuccess(msg) && !LooksLikeGemilangImmediateReject(msg):
			return ProviderResponseSuccess
		case LooksLikeGemilangImmediateReject(msg):
			return ProviderResponseFailed
		case LooksLikeGemilangAccepted(msg):
			return ProviderResponsePending
		}
	case "yuscom":
		switch {
		case LooksLikeYuscomSuccess(msg) && !LooksLikeYuscomImmediateReject(msg):
			return ProviderResponseSuccess
		case LooksLikeYuscomImmediateReject(msg):
			return ProviderResponseFailed
		case LooksLikeYuscomAccepted(msg):
			return ProviderResponsePending
		}
	case "sagaramobile":
		switch {
		case sagaramobile.LooksLikeSuccess(msg) && !sagaramobile.LooksLikeImmediateReject(msg):
			return ProviderResponseSuccess
		case sagaramobile.LooksLikeImmediateReject(msg):
			return ProviderResponseFailed
		case sagaramobile.LooksLikePending(msg):
			return ProviderResponsePending
		}
	case "minions":
		switch {
		case minions.LooksLikeSuccess(msg) && !minions.LooksLikeImmediateReject(msg):
			return ProviderResponseSuccess
		case minions.LooksLikeImmediateReject(msg):
			return ProviderResponseFailed
		case minions.LooksLikePending(msg):
			return ProviderResponsePending
		}
	case "trionik":
		switch {
		case LooksLikeYuscomSuccess(msg) && !LooksLikeYuscomImmediateReject(msg):
			return ProviderResponseSuccess
		case LooksLikeYuscomImmediateReject(msg):
			return ProviderResponseFailed
		case LooksLikeYuscomAccepted(msg):
			return ProviderResponsePending
		}
	case "ajs":
		switch {
		case LooksLikeAJSSuccess(msg) && !LooksLikeAJSImmediateReject(msg):
			return ProviderResponseSuccess
		case LooksLikeAJSImmediateReject(msg):
			return ProviderResponseFailed
		case LooksLikeAJSAccepted(msg):
			return ProviderResponsePending
		}
	case "smb":
		switch {
		case looksLikeSMBFailureAfterPriorSuccess(upper):
			return ProviderResponseFailed
		case strings.Contains(upper, "INQSUKSES") || strings.Contains(upper, "CEK WITHDRAWAL"):
			return ProviderResponsePending
		case smb.LooksLikeSuccess(msg) && !smb.LooksLikeImmediateReject(msg):
			return ProviderResponseSuccess
		case smb.LooksLikeImmediateReject(msg):
			return ProviderResponseFailed
		case smb.LooksLikePending(msg):
			return ProviderResponsePending
		}
	case "chytron":
		switch {
		case smb.LooksLikeSuccess(msg) && !smb.LooksLikeImmediateReject(msg):
			return ProviderResponseSuccess
		case smb.LooksLikeImmediateReject(msg):
			return ProviderResponseFailed
		case smb.LooksLikePending(msg):
			return ProviderResponsePending
		}
	case "loketbayar":
		switch {
		case LooksLikeLoketBayarSuccess(rc, msg):
			return ProviderResponseSuccess
		case LooksLikeLoketBayarImmediateReject(rc, msg):
			return ProviderResponseFailed
		case LooksLikeLoketBayarPending(rc, msg):
			return ProviderResponsePending
		}
	case "rajabiller":
		switch {
		case LooksLikeRajabillerPending(rc, msg):
			return ProviderResponsePending
		case LooksLikeRajabillerSuccess(rc, msg):
			return ProviderResponseSuccess
		case LooksLikeRajabillerImmediateReject(rc, msg):
			return ProviderResponseFailed
		}
	case "pulsa24jam":
		switch {
		case upper == "SUCCESS" || upper == "SUKSES" || strings.Contains(upper, "TRANSAKSI BERHASIL") || (strings.Contains(upper, `"STATUS"`) && strings.Contains(upper, "SUCCESS")) || (strings.Contains(upper, `"STATUS"`) && strings.Contains(upper, "SUKSES")) || strings.Contains(upper, `"OK":TRUE`) || strings.Contains(upper, `"OK": TRUE`):
			return ProviderResponseSuccess
		case upper == "FAILED" || upper == "FAIL" || upper == "GAGAL" || strings.Contains(upper, "NOMOR TUJUAN SALAH") || (strings.Contains(upper, `"STATUS"`) && strings.Contains(upper, "FAILED")) || (strings.Contains(upper, `"STATUS"`) && strings.Contains(upper, "GAGAL")) || strings.Contains(upper, `"OK":FALSE`) || strings.Contains(upper, `"OK": FALSE`):
			return ProviderResponseFailed
		case upper == "PENDING" || (strings.Contains(upper, `"STATUS"`) && strings.Contains(upper, "PENDING")) || strings.Contains(upper, "SEDANG DIPROSES"):
			return ProviderResponsePending
		}
	default:
		switch {
		case strings.Contains(upper, "ER_") || strings.Contains(upper, "SQLSTATE") || strings.Contains(upper, "SQLMESSAGE") || strings.Contains(upper, "DATA TOO LONG"):
			return ProviderResponseFailed
		case strings.Contains(upper, "SUKSES") || strings.Contains(upper, "BERHASIL"):
			return ProviderResponseSuccess
		case strings.Contains(upper, "GAGAL") || strings.Contains(upper, "FAILED") || strings.Contains(upper, "BATAL"):
			return ProviderResponseFailed
		}
	}

	if (provider == "smb" || provider == "chytron") && smb.LooksLikeAccepted(msg) {
		return ProviderResponsePending
	}

	// Fallback terakhir: classify dari pattern database (refresh otomatis)
	// Hati-hati: "INQSUKSES" bukan success (itu cek berhasil, bukan bayar)
	if MatchesSuccessPattern(upper) && !strings.Contains(upper, "INQSUKSES") && !strings.Contains(upper, "CEK WITHDRAWAL") {
		return ProviderResponseSuccess
	}
	if MatchesFailedPattern(upper) {
		return ProviderResponseFailed
	}
	// Pesan tidak dikenali → pending (tunggu callback)
	return ProviderResponsePending
}

func ProviderResponseStateFromBody(provider, body string) ProviderResponseState {
	return ProviderResponseStateOf(provider, ExtractProviderStatusCodeFor(provider, body), body)
}

func ProviderResponseStatusString(provider string, kodeRespon, pesan *string) string {
	rc := ""
	msg := ""
	if kodeRespon != nil {
		rc = strings.TrimSpace(*kodeRespon)
	}
	if pesan != nil {
		msg = strings.TrimSpace(*pesan)
	}
	return string(ProviderResponseStateOf(provider, rc, msg))
}

func ProviderResponseAccepted(provider, body string) bool {
	state := ProviderResponseStateFromBody(provider, body)
	return state == ProviderResponseSuccess || state == ProviderResponsePending
}

func ProviderResponseImmediateReject(provider, body string) bool {
	return ProviderResponseStateFromBody(provider, body) == ProviderResponseFailed
}
