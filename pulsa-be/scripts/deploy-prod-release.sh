#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${SOURCE_DIR:-/var/lib/syslog-ng/PulsaKilat/pulsa-be}"
RELEASE_ROOT="${RELEASE_ROOT:-/var/lib/syslog-ng/PulsaKilat/releases/pulsa-be}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
BUILD_ID="$(date +%Y%m%d%H%M%S)"
BUILD_DIR="$RELEASE_ROOT/build-$BUILD_ID"
CURRENT_LINK="$RELEASE_ROOT/current"
TMP_LINK="$RELEASE_ROOT/.current-$BUILD_ID"
SHARED_LOG_DIR="${SHARED_LOG_DIR:-/var/lib/syslog-ng/PulsaKilat/logs}"
SERVICE_NAME="${BACKEND_SERVICE_NAME:-pulsakilat-be.service}"

restart_service() {
  if command -v sudo >/dev/null 2>&1 && [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    sudo -n systemctl restart "$1"
  else
    systemctl restart "$1"
  fi
}

remove_dir_safe() {
  local target="$1"
  if rm -rf "$target" 2>/dev/null; then
    return 0
  fi

  if command -v sudo >/dev/null 2>&1 && [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    sudo -n rm -rf "$target" 2>/dev/null && return 0
  fi

  echo "warning: failed to remove old release $target" >&2
  return 0
}

require_source_file() {
  local rel="$1"
  if [ ! -f "$SOURCE_DIR/$rel" ]; then
    echo "fatal: required backend source file missing: $rel" >&2
    exit 1
  fi
}

# Fix broken symlink: git reset bisa bikin log jadi symlink self-referencing
ensure_real_dir() {
  local target="$1"
  if [ -L "$target" ]; then
    rm -f "$target"
  fi
  mkdir -p "$target"
}

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required for deploy-prod-release.sh" >&2
  exit 1
fi

mkdir -p "$RELEASE_ROOT"
mkdir -p "$BUILD_DIR"
ensure_real_dir "$SHARED_LOG_DIR"

require_source_file "chytron/client.go"
require_source_file "internal/provider/adapter_chytron.go"
require_source_file "loketbayar/client.go"
require_source_file "internal/provider/adapter_loketbayar.go"
require_source_file "rajabiller/client.go"
require_source_file "internal/provider/adapter_rajabiller.go"

rsync -a \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'releases' \
  --exclude 'pulsa-be' \
  --exclude 'pulsa2' \
  --exclude 'scripts/deploy-prod-release.sh' \
  "$SOURCE_DIR/" "$BUILD_DIR/"

if [[ -f "$SOURCE_DIR/.env" ]]; then
  cp "$SOURCE_DIR/.env" "$BUILD_DIR/.env"
fi

# Pastikan build dir log mengarah ke shared log dir
if [ -L "$BUILD_DIR/log" ] || [ -e "$BUILD_DIR/log" ]; then
  rm -rf "$BUILD_DIR/log"
fi
ln -sfn "$SHARED_LOG_DIR" "$BUILD_DIR/log"

cd "$BUILD_DIR"
go run ./scripts/apply_sql_migration sql/20260808_retail_withdraw_funding_source.sql
go run ./scripts/apply_sql_migration sql/20260821_add_marketing_agent_relation.sql
go run ./scripts/apply_sql_migration sql/20260824_agent_credit_flexible_limit.sql
go test ./internal/service ./internal/provider ./internal/helper ./chytron ./loketbayar ./smb ./rajabiller
go build -buildvcs=false -o "$BUILD_DIR/pulsa-be" .

# Build tools
for tool_dir in scripts/recover_pending_ref scripts/reconcile_provider_truth scripts/repair_smb_pending; do
  if [ -d "$BUILD_DIR/$tool_dir" ]; then
    tool_name="$(basename "$tool_dir")"
    mkdir -p "$BUILD_DIR/bin"
    go build -buildvcs=false -o "$BUILD_DIR/bin/$tool_name" "./$tool_dir/" 2>/dev/null || true
    # Copy ke shared bin dir (persistent, niet deleted by git clean)
    SHARED_BIN="${SHARED_BIN:-/var/lib/syslog-ng/PulsaKilat/shared-bin}"
    mkdir -p "$SHARED_BIN"
    if [ -f "$BUILD_DIR/bin/$tool_name" ]; then
      cp "$BUILD_DIR/bin/$tool_name" "$SHARED_BIN/$tool_name" 2>/dev/null || true
    fi
  fi
done

# Sync .env ke shared location untuk analisa-transaksi
if [[ -f "$BUILD_DIR/.env" ]]; then
  SHARED_BIN="${SHARED_BIN:-/var/lib/syslog-ng/PulsaKilat/shared-bin}"
  mkdir -p "$SHARED_BIN"
  cp "$BUILD_DIR/.env" "$SHARED_BIN/.env" 2>/dev/null || true
fi

ln -sfn "$BUILD_DIR" "$TMP_LINK"
mv -Tf "$TMP_LINK" "$CURRENT_LINK"

if [[ "${SKIP_SERVICE_RESTART:-false}" != "true" ]]; then
  restart_service "$SERVICE_NAME"
fi

if [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]]; then
  mapfile -t old_builds < <(find "$RELEASE_ROOT" -maxdepth 1 -mindepth 1 -type d -name 'build-*' | sort)
  if (( ${#old_builds[@]} > KEEP_RELEASES )); then
    remove_count=$(( ${#old_builds[@]} - KEEP_RELEASES ))
    for old_dir in "${old_builds[@]:0:$remove_count}"; do
      remove_dir_safe "$old_dir"
    done
  fi
fi

echo "Deployed backend release: $BUILD_DIR"
