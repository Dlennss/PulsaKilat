package service

import "strings"

func parseProviderProductCode(raw string) (special string, code string, ok bool, err error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", "", false, nil
	}
	if head, tail, found := strings.Cut(raw, ":"); found {
		return strings.ToUpper(strings.TrimSpace(head)), strings.ToUpper(strings.TrimSpace(tail)), true, nil
	}
	return "", strings.ToUpper(strings.TrimSpace(raw)), false, nil
}
