#!/usr/bin/env bash
set -euo pipefail

: "${HOSTINGER_FTP_SERVER:?HOSTINGER_FTP_SERVER is required}"
: "${HOSTINGER_FTP_USERNAME:?HOSTINGER_FTP_USERNAME is required}"
: "${HOSTINGER_FTP_PASSWORD:?HOSTINGER_FTP_PASSWORD is required}"
: "${HOSTINGER_FTP_REMOTE_DIR:?HOSTINGER_FTP_REMOTE_DIR is required}"

# Strip accidental CR/LF from runtime values (do not alter secrets at source).
strip_cr_lf() {
  printf '%s' "$1" | tr -d '\r\n'
}

FTP_SERVER="$(strip_cr_lf "${HOSTINGER_FTP_SERVER}")"
FTP_USER="$(strip_cr_lf "${HOSTINGER_FTP_USERNAME}")"
FTP_PASSWORD="$(strip_cr_lf "${HOSTINGER_FTP_PASSWORD}")"
REMOTE="$(strip_cr_lf "${HOSTINGER_FTP_REMOTE_DIR}")"
REMOTE="${REMOTE%/}"

LOCAL_DIR="${1:-dist}"
SCRIPT_FILE="$(mktemp)"
trap 'rm -f "$SCRIPT_FILE"' EXIT

write_lftp_script() {
  local target="$1"
  {
    printf '%s\n' 'set sftp:auto-confirm yes'
    printf 'open sftp://%s:65002\n' "$FTP_SERVER"
    printf 'user %s %s\n' "$FTP_USER" "$FTP_PASSWORD"
    printf '%s\n' 'set cmd:fail-exit yes'
    printf '%s\n' 'set net:timeout 90'
    printf '%s\n' 'set net:max-retries 3'
    printf 'mirror -R --delete --parallel=6 --verbose %s/ %s\n' "$LOCAL_DIR" "$target"
    printf '%s\n' 'bye'
  } >"$SCRIPT_FILE"
  chmod 600 "$SCRIPT_FILE"
}

run_sftp_deploy() {
  local target="$1"
  echo "=== SFTP (65002) -> '${target}' ==="
  write_lftp_script "$target"
  if lftp -f "$SCRIPT_FILE"; then
    echo "SFTP deploy OK: ${target}"
    return 0
  fi
  echo "SFTP deploy failed: ${target}"
  return 1
}

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
  if run_sftp_deploy "$target"; then exit 0; fi
  sleep 5
done

echo "::error title=Hostinger deploy failed::Download artifact schoolixiq-dist from Actions and upload to public_html via hPanel File Manager."
exit 1
