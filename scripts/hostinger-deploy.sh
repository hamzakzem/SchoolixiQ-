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

if [[ -z "$REMOTE" ]]; then
  echo "::error title=Invalid HOSTINGER_FTP_REMOTE_DIR::Remote directory is empty after sanitization"
  exit 1
fi

LOCAL_DIR="${1:-dist}"
SCRIPT_FILE="$(mktemp)"
trap 'rm -f "$SCRIPT_FILE"' EXIT

write_lftp_script() {
  {
    printf '%s\n' 'set sftp:auto-confirm yes'
    printf '%s\n' 'set cmd:fail-exit yes'
    printf '%s\n' 'set net:timeout 120'
    printf '%s\n' 'set net:max-retries 5'
    printf '%s\n' 'set net:reconnect-interval-base 5'
    printf '%s\n' '!echo "[deploy] step: open sftp"'
    printf 'open sftp://%s:65002\n' "$FTP_SERVER"
    printf '%s\n' '!echo "[deploy] step: open done"'
    printf '%s\n' '!echo "[deploy] step: user auth"'
    printf 'user %s %s\n' "$FTP_USER" "$FTP_PASSWORD"
    printf '%s\n' '!echo "[deploy] step: user done"'
    printf '%s\n' '!echo "[deploy] step: pwd"'
    printf '%s\n' 'pwd'
    printf '%s\n' '!echo "[deploy] step: pwd done"'
    printf '%s\n' '!echo "[deploy] step: cd remote dir"'
    printf 'cd "%s"\n' "$REMOTE"
    printf '%s\n' '!echo "[deploy] step: cd done"'
    printf '%s\n' '!echo "[deploy] step: mirror start"'
    printf 'mirror -R --delete --parallel=3 --verbose "%s/" .\n' "$LOCAL_DIR"
    printf '%s\n' '!echo "[deploy] step: mirror done"'
    printf '%s\n' 'bye'
  } >"$SCRIPT_FILE"
  chmod 600 "$SCRIPT_FILE"
}

echo "=== SFTP (65002) -> '${REMOTE}' ==="
echo "[deploy] local source: ${LOCAL_DIR}/"
write_lftp_script

if timeout 8m lftp -f "$SCRIPT_FILE"; then
  echo "SFTP deploy OK: ${REMOTE}"
  exit 0
fi

exit_code=$?
if [[ "$exit_code" -eq 124 ]]; then
  echo "::error title=Hostinger deploy timed out::lftp exceeded 8 minute limit for HOSTINGER_FTP_REMOTE_DIR='${REMOTE}'."
  exit 1
fi

echo "::error title=Hostinger deploy failed::SFTP mirror failed for HOSTINGER_FTP_REMOTE_DIR='${REMOTE}'. Verify the secret points to public_html (e.g. /home/USER/domains/schoolixiq.com/public_html)."
exit 1
