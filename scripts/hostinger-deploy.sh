#!/usr/bin/env bash
set -euo pipefail

: "${HOSTINGER_FTP_SERVER:?HOSTINGER_FTP_SERVER is required}"
: "${HOSTINGER_FTP_USERNAME:?HOSTINGER_FTP_USERNAME is required}"
: "${HOSTINGER_FTP_PASSWORD:?HOSTINGER_FTP_PASSWORD is required}"
: "${HOSTINGER_FTP_REMOTE_DIR:?HOSTINGER_FTP_REMOTE_DIR is required}"

LOCAL_DIR="${1:-dist}"
SCRIPT_FILE="$(mktemp)"
trap 'rm -f "$SCRIPT_FILE"' EXIT

write_script() {
  local mode="$1"
  local target="$2"
  cat >"$SCRIPT_FILE" <<EOF
set cmd:fail-exit yes
set net:timeout 90
set net:max-retries 3
EOF

  if [[ "$mode" == "ftps" ]]; then
    cat >>"$SCRIPT_FILE" <<EOF
set ssl:verify-certificate no
set ftp:ssl-force true
set ftp:ssl-protect-data true
open -u ${HOSTINGER_FTP_USERNAME},${HOSTINGER_FTP_PASSWORD} ftps://${HOSTINGER_FTP_SERVER}:21
EOF
  else
    cat >>"$SCRIPT_FILE" <<EOF
set sftp:auto-confirm yes
open -u ${HOSTINGER_FTP_USERNAME},${HOSTINGER_FTP_PASSWORD} sftp://${HOSTINGER_FTP_SERVER}:65002
EOF
  fi

  cat >>"$SCRIPT_FILE" <<EOF
pwd
ls -la
mirror -R --parallel=6 --verbose \
  --exclude server.cjs \
  --exclude server.cjs.map \
  --exclude .ftp-deploy-sync-state.json \
  ${LOCAL_DIR}/ ${target}
bye
EOF
}

try_deploy() {
  local mode="$1"
  local target="$2"
  echo "=== Trying ${mode} deploy to '${target}' ==="
  write_script "$mode" "$target"
  if lftp -f "$SCRIPT_FILE"; then
    echo "Deploy succeeded via ${mode} -> ${target}"
    return 0
  fi
  echo "Deploy failed via ${mode} -> ${target}"
  return 1
}

REMOTE="${HOSTINGER_FTP_REMOTE_DIR%/}"
SHORT_REMOTE=""
if [[ "$REMOTE" == *"/domains/"* ]]; then
  SHORT_REMOTE="/${REMOTE#*/domains/}"
fi

TARGETS=(
  "."
  "./"
  "${SHORT_REMOTE}"
  "${SHORT_REMOTE}/"
  "${REMOTE}"
  "${REMOTE}/"
  "/domains/schoolixiq.com/public_html"
  "/domains/schoolixiq.com/public_html/"
  "/public_html"
  "/public_html/"
)

seen="|"
for target in "${TARGETS[@]}"; do
  [[ -z "$target" ]] && continue
  case "$seen" in *"|${target}|"*) continue ;; esac
  seen="${seen}${target}|"
  if try_deploy ftps "$target"; then
    exit 0
  fi
  sleep 5
done

for target in "${REMOTE}/" "."; do
  if try_deploy sftp "$target"; then
    exit 0
  fi
  sleep 5
done

echo "::error title=Hostinger deploy failed::FTPS (21) and SFTP (65002) could not upload dist/. Download the schoolixiq-dist artifact and upload manually to public_html."
exit 1
