#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${SOURCE_DIR:-/var/lib/syslog-ng/PulsaKilat/pulsa-fe}"
RELEASE_ROOT="${RELEASE_ROOT:-/var/lib/syslog-ng/PulsaKilat/releases/pulsa-fe}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
BUILD_ID="$(date +%Y%m%d%H%M%S)"
BUILD_DIR="$RELEASE_ROOT/build-$BUILD_ID"
CURRENT_LINK="$RELEASE_ROOT/current"
TMP_LINK="$RELEASE_ROOT/.current-$BUILD_ID"
DEPLOY_USER="pulsakilat"
DEPLOY_GROUP="deployers"
SCRIPT_PATH="$(readlink -f "$0")"
SERVICE_NAME="${FRONTEND_SERVICE_NAME:-pulsakilat-fe.service}"

restart_service() {
  if command -v sudo >/dev/null 2>&1 && [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    sudo -n systemctl restart "$1"
  else
    systemctl restart "$1"
  fi
}

run_as_deploy_user() {
  if [[ "$(id -un)" == "$DEPLOY_USER" ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo -n -u "$DEPLOY_USER" -H "$@"
  else
    echo "sudo is required to run commands as $DEPLOY_USER" >&2
    exit 1
  fi
}

ensure_deploy_owner() {
  chown -R "$DEPLOY_USER:$DEPLOY_GROUP" "$1"
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

if [[ "$(id -un)" != "$DEPLOY_USER" && "${1:-}" != "--as-deploy-user" ]]; then
  exec sudo -n -u "$DEPLOY_USER" -H bash "$SCRIPT_PATH" --as-deploy-user
fi

if [[ "${1:-}" == "--as-deploy-user" ]]; then
  shift
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required for deploy-prod-release.sh" >&2
  exit 1
fi

mkdir -p "$RELEASE_ROOT"
mkdir -p "$BUILD_DIR"

rsync -a \
  --exclude .git \
  --exclude .github \
  --exclude .next \
  --exclude node_modules \
  --exclude releases \
  --exclude scripts/deploy-prod-release.sh \
  "$SOURCE_DIR/" "$BUILD_DIR/"

cp -al "$SOURCE_DIR/node_modules" "$BUILD_DIR/node_modules"
if [[ -f "$SOURCE_DIR/.env" ]]; then
  cp "$SOURCE_DIR/.env" "$BUILD_DIR/.env"
fi

ensure_deploy_owner "$BUILD_DIR"

cd "$BUILD_DIR"
run_as_deploy_user npm run build
ensure_deploy_owner "$BUILD_DIR"

ln -sfn "$BUILD_DIR" "$TMP_LINK"
mv -Tf "$TMP_LINK" "$CURRENT_LINK"
chown -h "$DEPLOY_USER:$DEPLOY_GROUP" "$CURRENT_LINK"

restart_service "$SERVICE_NAME"

if [[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]]; then
  mapfile -t old_builds < <(find "$RELEASE_ROOT" -maxdepth 1 -mindepth 1 -type d -name build-* | sort)
  if (( ${#old_builds[@]} > KEEP_RELEASES )); then
    remove_count=$(( ${#old_builds[@]} - KEEP_RELEASES ))
    for old_dir in "${old_builds[@]:0:$remove_count}"; do
      remove_dir_safe "$old_dir"
    done
  fi
fi

echo "Deployed frontend release: $BUILD_DIR"
