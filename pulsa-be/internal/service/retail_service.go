package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"pulsa2/internal/helper"
	"pulsa2/internal/repository"
)

type RetailService struct {
	repo     *repository.RetailRepository
	bankRepo *repository.BankRepository
}

type RetailRegisterDownlineInput struct {
	Email    string
	Nama     string
	Password string
	Role     string
}

type RetailWithdrawCreateInput struct {
	Amount        int64
	BankName      string
	AccountName   string
	AccountNumber string
	Note          string
}

func NewRetailService(repo *repository.RetailRepository, bankRepo *repository.BankRepository) *RetailService {
	return &RetailService{repo: repo, bankRepo: bankRepo}
}

func (s *RetailService) ListDownlines(ctx context.Context, actorID int64) ([]repository.RetailDownlineRow, error) {
	actor, err := s.repo.GetMemberContext(ctx, actorID)
	if err != nil {
		return nil, err
	}
	if !helper.IsRetailRole(actor.Role) {
		return nil, errors.New("retail only")
	}
	if actor.Role != helper.RoleRetailMaster && actor.Role != helper.RoleRetailAgent {
		return []repository.RetailDownlineRow{}, nil
	}
	return s.repo.ListDownlines(ctx, actor)
}

func (s *RetailService) RegisterDownline(ctx context.Context, actorID int64, in RetailRegisterDownlineInput) (int64, error) {
	actor, err := s.repo.GetMemberContext(ctx, actorID)
	if err != nil {
		return 0, err
	}
	if !helper.IsRetailRole(actor.Role) {
		return 0, errors.New("retail only")
	}

	in.Email = strings.TrimSpace(strings.ToLower(in.Email))
	in.Nama = strings.TrimSpace(in.Nama)
	in.Password = strings.TrimSpace(in.Password)
	in.Role = helper.NormalizeRole(in.Role)

	if in.Email == "" || in.Nama == "" || len(in.Password) < 8 {
		return 0, errors.New("email, nama, dan password valid wajib diisi")
	}
	if in.Role != helper.RoleUser && in.Role != helper.RoleRetailAgent {
		return 0, errors.New("role retail bawahan tidak valid")
	}
	switch actor.Role {
	case helper.RoleRetailMaster:
		// master boleh buat agent atau user
	case helper.RoleRetailAgent:
		if in.Role != helper.RoleUser {
			return 0, errors.New("agent hanya boleh menambahkan user")
		}
	default:
		return 0, errors.New("role tidak boleh menambahkan downline")
	}

	passHash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}

	createIn := repository.UserCreateInput{
		Email:        in.Email,
		Nama:         in.Nama,
		PasswordHash: string(passHash),
		Role:         in.Role,
		Aktif:        true,
	}
	createIn.RetailAgentCommissionRp, createIn.RetailMasterCommissionRp = helper.ApplyRetailCommissionDefaults(createIn.Role, createIn.RetailAgentCommissionRp, createIn.RetailMasterCommissionRp)
	switch actor.Role {
	case helper.RoleRetailMaster:
		createIn.RetailMasterID = &actor.MemberID
	case helper.RoleRetailAgent:
		createIn.RetailAgentID = &actor.MemberID
		if actor.RetailMasterID != nil && *actor.RetailMasterID > 0 {
			createIn.RetailMasterID = actor.RetailMasterID
		}
	}
	return s.repo.CreateRetailChild(ctx, createIn)
}

func (s *RetailService) ListCommissions(ctx context.Context, actorID int64, limit, offset int) ([]repository.RetailCommissionLedgerRow, error) {
	actor, err := s.repo.GetMemberContext(ctx, actorID)
	if err != nil {
		return nil, err
	}
	if !helper.IsRetailRole(actor.Role) {
		return nil, errors.New("retail only")
	}
	return s.repo.ListCommissionLedger(ctx, actorID, limit, offset)
}

func (s *RetailService) CommissionSummary(ctx context.Context, actorID int64) (*repository.RetailCommissionSummaryRow, error) {
	actor, err := s.repo.GetMemberContext(ctx, actorID)
	if err != nil {
		return nil, err
	}
	if !helper.IsRetailRole(actor.Role) {
		return nil, errors.New("retail only")
	}
	return s.repo.GetCommissionSummary(ctx, actorID)
}

func (s *RetailService) CreateWithdrawRequest(ctx context.Context, actorID int64, in RetailWithdrawCreateInput) (*repository.RetailWithdrawRequestRow, error) {
	actor, err := s.repo.GetMemberContext(ctx, actorID)
	if err != nil {
		return nil, err
	}
	if !helper.IsRetailRole(actor.Role) {
		return nil, errors.New("retail only")
	}

	in.BankName = strings.TrimSpace(in.BankName)
	in.AccountName = strings.TrimSpace(in.AccountName)
	in.AccountNumber = strings.TrimSpace(in.AccountNumber)
	in.Note = strings.TrimSpace(in.Note)
	if in.Amount <= 0 {
		return nil, errors.New("amount harus > 0")
	}
	if in.BankName == "" || in.AccountName == "" || in.AccountNumber == "" {
		return nil, errors.New("data rekening wajib lengkap")
	}
	refID := fmt.Sprintf("RWD-%s-%s", time.Now().Format("20060102150405"), strings.ToUpper(helper.RandHex(4)))
	return s.repo.CreateWithdrawRequest(ctx, actorID, in.Amount, in.BankName, in.AccountName, in.AccountNumber, refID, in.Note)
}

func (s *RetailService) ListOwnWithdrawRequests(ctx context.Context, actorID int64, limit, offset int) ([]repository.RetailWithdrawRequestRow, error) {
	actor, err := s.repo.GetMemberContext(ctx, actorID)
	if err != nil {
		return nil, err
	}
	if !helper.IsRetailRole(actor.Role) {
		return nil, errors.New("retail only")
	}
	return s.repo.ListWithdrawRequestsByMember(ctx, actorID, limit, offset)
}

func (s *RetailService) AdminListWithdrawRequests(ctx context.Context, status, q string, limit, offset int) ([]repository.RetailWithdrawRequestRow, error) {
	return s.repo.AdminListWithdrawRequests(ctx, status, q, limit, offset)
}

func (s *RetailService) AdminApproveWithdrawRequest(ctx context.Context, reqID, actorID int64, actorRole string, bankID, fee int64, note string) error {
	if reqID <= 0 || actorID <= 0 {
		return errors.New("request invalid")
	}
	if bankID <= 0 {
		return errors.New("rekening sumber wajib dipilih")
	}
	if fee < 0 {
		return errors.New("fee tidak valid")
	}
	if s.bankRepo != nil {
		if _, err := s.bankRepo.GetVisible(ctx, bankID, helper.IsAdminLikeRole(actorRole)); err != nil {
			return err
		}
	}
	err := s.repo.ApproveWithdrawRequest(ctx, reqID, actorID, bankID, fee, strings.TrimSpace(note))
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("withdraw request tidak ditemukan atau bukan pending")
	}
	return err
}

func (s *RetailService) AdminRejectWithdrawRequest(ctx context.Context, reqID, actorID int64, reason string) error {
	if reqID <= 0 || actorID <= 0 {
		return errors.New("request invalid")
	}
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return errors.New("alasan reject wajib diisi")
	}
	err := s.repo.RejectWithdrawRequest(ctx, reqID, actorID, reason)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("withdraw request tidak ditemukan")
	}
	return err
}
