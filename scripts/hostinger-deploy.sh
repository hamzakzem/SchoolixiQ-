#!/usr/bin/env bash
set -euo pipefail

: "${HOSTINGER_FTP_SERVER:?HOSTINGER_FTP_SERVER is required}"
: "${HOSTINGER_FTP_USERNAME:?HOSTINGER_FTP_USERNAME is required}"
: "${HOSTINGER_FTP_PASSWORD:?HOSTINGER_FTP_PASSWORD is required}"
: "${HOSTINGER_FTP_REMOTE_DIR:?HOSTINGER_FTP_REMOTE_DIR is required}"

LOCAL_DIR="${1:-dist}"
SCRIPT_FILE="$(mktemp)"
trap 'rm -f "$SCRIPT_FILE" "${SCRIPT_FILE}.run"' EXIT

write_mirror_script() {
  local target="$1"
  cat >"$SCRIPT_FILE" <<EOF
set cmd:fail-exit yes
set net:timeout 90
set net:max-retries 3
pwd
ls -la
mirror -R --parallel=6 --verbose \
  --exclude server.mjs \
  --exclude server.cjs \
  --exclude server.cjs.map \
  --exclude .ftp-deploy-sync-state.json \
  ${LOCAL_DIR}/ ${target}
bye
EOF
}

try_ftps() {
  local target="$1"
  echo "=== FTPS (21) -> '${target}' ==="
  write_mirror_script "$target"
  {
    echo "set ssl:verify-certificate no"
    echo "set ftp:ssl-force true"
    echo "set ftp:ssl-protect-data true"
    cat "$SCRIPT_FILE"
  } > "${SCRIPT_FILE}.run"
  if lftp -u "${HOSTINGER_FTP_USERNAME},${HOSTINGER_FTP_PASSWORD}" \
    "ftps://${HOSTINGER_FTP_SERVER}:21" -f "${SCRIPT_FILE}.run"; then
    echo "FTPS deploy OK: ${target}"
    return 0
  fi
  echo "FTPS deploy failed: ${target}"
  return 1
}

try_sftp() {
  local target="$1"
  echo "=== SFTP (65002) -> '${target}' ==="
  write_mirror_script "$target"
  {
    echo "set sftp:auto-confirm yes"
    cat "$SCRIPT_FILE"
  } > "${SCRIPT_FILE}.run"
  if lftp -u "${HOSTINGER_FTP_USERNAME},${HOSTINGER_FTP_PASSWORD}" \
    "sftp://${HOSTINGER_FTP_SERVER}:65002" -f "${SCRIPT_FILE}.run"; then
    echo "SFTP deploy OK: ${target}"
    return 0
  fi
  echo "SFTP deploy failed: ${target}"
  return 1
}

REMOTE="${HOSTINGER_FTP_REMOTE_DIR%/}"
SHORT_REMOTE=""
if [[ "$REMOTE" == *"/domains/"* ]]; then
  SHORT_REMOTE="/${REMOTE#*/domains/}"
fi

TARGETS=("." "${SHORT_REMOTE}" "${REMOTE}" "/domains/schoolixiq.com/public_html" "/public_html")

seen="|"
for target in "${TARGETS[@]}"; do
  [[ -z "$target" ]] && continue
  case "$seen" in *"|${target}|"*) continue ;; esac
  seen="${seen}${target}|"
  if try_ftps "$target"; then exit 0; fi
  sleep 8
done

for target in "." "${REMOTE}"; do
  if try_sftp "$target"; then exit 0; fi
  sleep 8
done

echo "::error title=Hostinger deploy failed::Download artifact schoolixiq-dist from Actions and upload to public_html via hPanel File Manager."
exit 1
