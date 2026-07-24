package service

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
	"pulsa2/yuscom"
)

type AppBillingCheckService struct {
	checkRepo   *repository.AppBillingCheckRepository
	produkRepo  *repository.ProdukRepository
	pricingRepo *repository.ProdukAppPricingRepository
	ysClient    *yuscom.Client
}

func NewAppBillingCheckService(checkRepo *repository.AppBillingCheckRepository, produkRepo *repository.ProdukRepository, pricingRepo *repository.ProdukAppPricingRepository, ysClient *yuscom.Client) *AppBillingCheckService {
	return &AppBillingCheckService{checkRepo: checkRepo, produkRepo: produkRepo, pricingRepo: pricingRepo, ysClient: ysClient}
}

func (s *AppBillingCheckService) Create(ctx context.Context, in repository.AppBillingCheckCreateInput) (*repository.AppBillingCheckRow, error) {
	if s == nil || s.checkRepo == nil || s.produkRepo == nil || s.pricingRepo == nil || s.ysClient == nil {
		return nil, fmt.Errorf("service billing check belum siap")
	}
	buyerType, memberID, err := normalizeBuyer(in.BuyerType, in.MemberID)
	if err != nil {
		return nil, err
	}
	produk, err := s.produkRepo.Get(ctx, in.ProdukID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("produk tidak ditemukan")
		}
		return nil, err
	}
	if !isAppCheckProduct(produk) {
		return nil, fmt.Errorf("produk ini bukan produk cek tagihan")
	}
	pricingRow, err := s.pricingRepo.GetByProdukIDProviderActive(ctx, in.ProdukID, "yuscom")
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("produk cek belum tersedia untuk app commerce")
		}
		return nil, err
	}
	if !pricingRow.Aktif {
		return nil, fmt.Errorf("produk cek tidak aktif")
	}

	dest := strings.TrimSpace(in.Dest)
	if dest == "" {
		return nil, fmt.Errorf("tujuan wajib diisi")
	}
	in.MemberID = memberID
	in.BuyerType = buyerType
	in.BuyerRole = strings.TrimSpace(in.BuyerRole)
	if in.BuyerRole == "" {
		in.BuyerRole = buyerType
	}
	if buyerType == "guest" {
		in.GuestNama = strings.TrimSpace(in.GuestNama)
		in.GuestEmail = normalizeGuestEmail(in.GuestEmail)
		in.GuestPhone = normalizeGuestPhone(in.GuestPhone)
		if in.GuestNama == "" || in.GuestEmail == "" || in.GuestPhone == "" {
			return nil, fmt.Errorf("guest_nama/guest_email/guest_phone wajib diisi")
		}
	}

	refID := buildAppBillingCheckRefID()
	rawReq := fmt.Sprintf(`{"provider":"yuscom","product":"%s","dest":"%s","qty":1,"refid":"%s"}`, produk.SKU, dest, refID)
	createIn := repository.AppBillingCheckCreateInput{
		RefID:              refID,
		MemberID:           memberID,
		BuyerRole:          in.BuyerRole,
		GuestNama:          in.GuestNama,
		GuestEmail:         in.GuestEmail,
		GuestPhone:         in.GuestPhone,
		ProdukID:           produk.ID,
		ProdukSKUSnapshot:  produk.SKU,
		ProdukNamaSnapshot: produk.Nama,
		Dest:               dest,
		BuyerType:          buyerType,
		Provider:           "yuscom",
		HargaProvider:      0,
		Status:             "processing_provider",
		RawRequest:         rawReq,
	}
	if err := s.checkRepo.Create(ctx, createIn); err != nil {
		return nil, err
	}
	createdRow, err := s.checkRepo.GetByRefID(ctx, refID)
	if err != nil {
		return nil, err
	}

	acc, _, body, callErr := s.ysClient.TrxNoSign(ctx, produk.SKU, 1, dest, refID)
	if callErr != nil {
		msg := callErr.Error()
		_ = s.checkRepo.UpdateResult(ctx, repository.AppBillingCheckUpdateInput{
			ID:          createdRow.ID,
			Status:      "failed",
			Pesan:       &msg,
			RawCallback: body,
		})
		return nil, fmt.Errorf("gagal mengirim cek ke provider")
	}
	var pricePtr *int64
	if acc.Price != 0 {
		pricePtr = helper.PtrI64(acc.Price)
	}
	msg := strings.TrimSpace(acc.Body)
	rc := ""
	status := "processing_provider"
	_ = s.checkRepo.UpdateResult(ctx, repository.AppBillingCheckUpdateInput{
		ID:            createdRow.ID,
		HargaProvider: pricePtr,
		Status:        status,
		KodeRespon:    &rc,
		Pesan:         &msg,
		RawCallback:   body,
	})
	return s.GetByRefID(ctx, refID)
}

func (s *AppBillingCheckService) GetByRefID(ctx context.Context, refID string) (*repository.AppBillingCheckRow, error) {
	row, err := s.checkRepo.GetByRefID(ctx, refID)
	if err != nil {
		return nil, err
	}
	row.BillingInquiry = parseBillingInquiryFromCheck(row)
	return row, nil
}

func parseBillingInquiryFromCheck(row *repository.AppBillingCheckRow) *repository.AppBillingInquiryInfo {
	if row == nil {
		return nil
	}
	parsed := helper.ParseAppBillingInquiry(row.Provider, row.Status, valueOrEmptyString(row.Pesan))
	if parsed == nil {
		return nil
	}
	return mapBillingInquiry(parsed)
}

func buildAppBillingCheckRefID() string {
	return fmt.Sprintf("BILCHK-%s-%s", time.Now().Format("20060102150405"), strings.ToUpper(helper.RandHex(4)))
}
