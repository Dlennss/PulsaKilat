package service

import (
	"context"
	"net/http"
	"strings"
	"time"

	trxmemberdto "pulsa2/internal/dto/trx_member"
	"pulsa2/internal/helper"
	"pulsa2/internal/provider"
	"pulsa2/model"
)

func isProviderSystemError(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(strings.TrimSpace(err.Error()))
	if s == "" {
		return false
	}

	if strings.Contains(s, "mapping not found") ||
		strings.Contains(s, "respons talenta tidak dikenali") ||
		strings.Contains(s, "respons yuscom tidak dikenali") ||
		strings.Contains(s, "respons smb tidak dikenali") {
		return false
	}

	if strings.Contains(s, "reject bisnis") {
		return !helper.ShouldBlockProviderFallback(s)
	}

	return strings.Contains(s, "error http=") ||
		strings.Contains(s, "retryable rc=") ||
		strings.Contains(s, "client nil") ||
		strings.Contains(s, "repo nil") ||
		strings.Contains(s, "context canceled") ||
		strings.Contains(s, "timeout") ||
		strings.Contains(s, "deadline exceeded") ||
		strings.Contains(s, "awaiting headers") ||
		strings.Contains(s, "dial tcp") ||
		strings.Contains(s, "connection") ||
		strings.Contains(s, "reset by peer") ||
		strings.Contains(s, "eof") ||
		strings.Contains(s, "server")
}

func buildProviderRequestLogPayload(provider string, in trxmemberdto.TrxRequest, productSent string, routeReason string, fallbackFrom string) map[string]any {
	return map[string]any{
		"provider":      strings.TrimSpace(strings.ToLower(provider)),
		"commands":      in.Commands,
		"product_in":    in.Product,
		"product_sent":  productSent,
		"dest":          in.Dest,
		"qty":           in.Qty,
		"refid":         in.RefID,
		"route_reason":  routeReason,
		"fallback_from": fallbackFrom,
	}
}

func shouldKeepPendingOnProviderFailure(err error) bool {
	return false
}

func providerTransportDefinitelyNotDispatched(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(strings.TrimSpace(err.Error()))
	if s == "" {
		return false
	}

	return strings.Contains(s, "no route to host") ||
		strings.Contains(s, "network is unreachable") ||
		strings.Contains(s, "host is unreachable") ||
		strings.Contains(s, "host unreachable") ||
		strings.Contains(s, "host is down") ||
		strings.Contains(s, "connection refused") ||
		strings.Contains(s, "no such host")
}

func providerMaySendLateCallback(providerName string) bool {
	switch strings.ToLower(strings.TrimSpace(providerName)) {
	case "yuscom",
		"talentapay",
		"multikom",
		"sagaramobile",
		"minions",
		"trionik",
		"ajs",
		"gemilang",
		"smb",
		"loketbayar",
		"chytron",
		"rajabiller":
		return true
	default:
		return false
	}
}

func providerRetriesUntilCallback(providerName string) bool {
	switch strings.ToLower(strings.TrimSpace(providerName)) {
	case "smb", "loketbayar":
		return true
	default:
		return false
	}
}

func providerLateCallbackPendingMessage() string {
	return "menunggu callback provider setelah request belum ada respons"
}

func providerPayResponseHasProviderReply(resp *provider.PayResponse) bool {
	if resp == nil {
		return false
	}
	return resp.HTTPStatus > 0 ||
		strings.TrimSpace(resp.RC) != "" ||
		strings.TrimSpace(resp.Message) != "" ||
		strings.TrimSpace(resp.Body) != "" ||
		strings.TrimSpace(resp.ProviderRef) != ""
}

func isJavapayStatusNotFoundMessage(msg string) bool {
	return helper.IsJavapayStatusNotFoundMessage(msg)
}

func classifyJavapayResponseStatus(rc, msg string) string {
	return string(helper.ClassifyJavapayResponseStatus(rc, msg))
}

func shouldRetryStaleJavapayPending(row *model.JavapayTrxRow, rc, msg string, now time.Time) bool {
	if row == nil {
		return false
	}
	if !strings.EqualFold(strings.TrimSpace(row.Provider), "javapay") {
		return false
	}
	if row.DibuatPada.IsZero() || now.Sub(row.DibuatPada) < javapayPendingRetryDelay {
		return false
	}

	upMsg := strings.ToUpper(strings.TrimSpace(msg))
	return strings.TrimSpace(rc) == "64" ||
		strings.Contains(upMsg, "DIABAIKAN")
}

func shouldRetrySameProviderHTTP(hs int, err error) bool {
	if err != nil {
		return true
	}
	return hs != 200
}

func providerCallWindowForName(providerName string) time.Duration {
	providerName = strings.ToLower(strings.TrimSpace(providerName))
	if providerName == "loketbayar" {
		return loketBayarRetryMaxWindow
	}
	if providerName == "rajabiller" {
		return rajabillerCallTimeout
	}
	return providerCallTimeout
}

func providerRetryLimitForName(providerName string) int {
	providerName = strings.ToLower(strings.TrimSpace(providerName))
	if providerName == "loketbayar" {
		limit := int(loketBayarRetryMaxWindow / loketBayarRetryInterval)
		if limit < 1 {
			return 1
		}
		return limit
	}
	if providerName == "rajabiller" {
		return 1
	}
	return sameProviderHTTPRetryLimit
}

func runLoketBayarPayWithRetryWindow(
	ctx context.Context,
	call func(context.Context) (*provider.PayResponse, error),
	onRetry func(nextAttempt int, limit int, hs int, err error),
) (*provider.PayResponse, error) {
	limit := providerRetryLimitForName("loketbayar")
	var resp *provider.PayResponse
	var callErr error

	for attempt := 1; attempt <= limit; attempt++ {
		started := time.Now()
		attemptCtx, cancel := context.WithTimeout(ctx, loketBayarRetryInterval)
		resp, callErr = call(attemptCtx)
		cancel()

		hs := 0
		if resp != nil {
			hs = resp.HTTPStatus
		}
		if hs == http.StatusBadRequest || hs == http.StatusUnauthorized || hs == http.StatusForbidden {
			return resp, callErr
		}
		if !shouldRetrySameProviderHTTP(hs, callErr) {
			return resp, callErr
		}
		if attempt < limit {
			if onRetry != nil {
				onRetry(attempt+1, limit, hs, callErr)
			}
			wait := loketBayarRetryInterval - time.Since(started)
			if wait > 0 {
				select {
				case <-time.After(wait):
				case <-ctx.Done():
					return resp, ctx.Err()
				}
			}
		}
	}

	return resp, callErr
}

func runProviderPayWithImmediateRetries(
	providerName string,
	ctx context.Context,
	call func(context.Context) (*provider.PayResponse, error),
	onRetry func(nextAttempt int, limit int, hs int, err error),
) (*provider.PayResponse, error) {
	if strings.EqualFold(strings.TrimSpace(providerName), "loketbayar") {
		return runLoketBayarPayWithRetryWindow(ctx, call, onRetry)
	}
	if strings.EqualFold(strings.TrimSpace(providerName), "rajabiller") {
		attemptCtx, cancel := context.WithTimeout(ctx, rajabillerCallTimeout)
		defer cancel()
		return call(attemptCtx)
	}
	var resp *provider.PayResponse
	var callErr error

	for attempt := 1; attempt <= sameProviderHTTPRetryLimit; attempt++ {
		attemptCtx, cancel := context.WithTimeout(ctx, sameProviderHTTPRetryTimeout)
		resp, callErr = call(attemptCtx)
		cancel()

		hs := 0
		if resp != nil {
			hs = resp.HTTPStatus
		}

		if !shouldRetrySameProviderHTTP(hs, callErr) {
			return resp, callErr
		}

		if attempt < sameProviderHTTPRetryLimit {
			if onRetry != nil {
				onRetry(attempt+1, sameProviderHTTPRetryLimit, hs, callErr)
			}
			select {
			case <-time.After(sameProviderHTTPRetryTimeout):
			case <-ctx.Done():
				return resp, ctx.Err()
			}
		}
	}

	return resp, callErr
}

func (h *MemberTrxService) runProviderCallWithImmediateRetries(
	ctx context.Context,
	providerName string,
	refID string,
	call func(context.Context) (int, string, error),
	persist func(attempt int, hs int, body string, err error),
) (int, string, error) {
	var lastHS int
	var lastBody string
	retryLimit := providerRetryLimitForName(providerName)

	resp, err := runProviderPayWithImmediateRetries(providerName, ctx, func(callCtx context.Context) (*provider.PayResponse, error) {
		hs, body, callErr := call(callCtx)
		lastHS = hs
		lastBody = body
		return &provider.PayResponse{HTTPStatus: hs, Body: body}, callErr
	}, func(nextAttempt int, limit int, hs int, retryErr error) {
		if persist != nil {
			persist(nextAttempt-1, hs, lastBody, retryErr)
		}
		h.logf("REQUEST retry_same_provider provider=%s refid=%s attempt=%d/%d http=%d err=%v",
			providerName, refID, nextAttempt, limit, hs, retryErr)
	})

	if resp != nil {
		lastHS = resp.HTTPStatus
		if resp.Body != "" {
			lastBody = resp.Body
		}
	}
	if persist != nil {
		persist(retryLimit, lastHS, lastBody, err)
	}
	return lastHS, lastBody, err
}
