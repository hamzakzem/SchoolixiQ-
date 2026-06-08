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
CD_SCRIPT_FILE="$(mktemp)"
MIRROR_SCRIPT_FILE="$(mktemp)"
trap 'rm -f "$CD_SCRIPT_FILE" "$MIRROR_SCRIPT_FILE"' EXIT

CD_TIMEOUT_SEC="${HOSTINGER_CD_TIMEOUT_SEC:-90}"
MIRROR_TIMEOUT_SEC="${HOSTINGER_MIRROR_TIMEOUT_SEC:-8m}"

remote_path_hint() {
  if [[ "$REMOTE" =~ ^/home/[^/]+/(.+)$ ]]; then
    printf '%s\n' "Hint: Hostinger SFTP often lands in the account home already. If cd hangs or fails, try HOSTINGER_FTP_REMOTE_DIR='/%s' instead of '%s'." "${BASH_REMATCH[1]}" "$REMOTE"
  fi
}

write_lftp_cd_test_script() {
  {
    printf '%s\n' 'set sftp:auto-confirm yes'
    printf '%s\n' 'set cmd:fail-exit yes'
    printf '%s\n' 'set net:timeout 30'
    printf '%s\n' 'set net:max-retries 2'
    printf '%s\n' 'set net:reconnect-interval-base 3'
    printf '%s\n' '!echo "[deploy] step: open sftp"'
    printf 'open sftp://%s:65002\n' "$FTP_SERVER"
    printf '%s\n' '!echo "[deploy] step: open done"'
    printf '%s\n' '!echo "[deploy] step: user auth"'
    printf 'user %s %s\n' "$FTP_USER" "$FTP_PASSWORD"
    printf '%s\n' '!echo "[deploy] step: user done"'
    printf '%s\n' '!echo "[deploy] remote pwd before cd:"'
    printf '%s\n' 'pwd'
    printf '%s\n' "!echo \"[deploy] attempting cd to: ${REMOTE}\""
    printf 'cd "%s"\n' "$REMOTE"
    printf '%s\n' '!echo "[deploy] remote pwd after cd:"'
    printf '%s\n' 'pwd'
    printf '%s\n' '!echo "[deploy] step: cd done"'
    printf '%s\n' 'bye'
  } >"$CD_SCRIPT_FILE"
  chmod 600 "$CD_SCRIPT_FILE"
}

write_lftp_mirror_script() {
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
    printf '%s\n' '!echo "[deploy] remote pwd before cd:"'
    printf '%s\n' 'pwd'
    printf '%s\n' "!echo \"[deploy] attempting cd to: ${REMOTE}\""
    printf 'cd "%s"\n' "$REMOTE"
    printf '%s\n' '!echo "[deploy] remote pwd after cd:"'
    printf '%s\n' 'pwd'
    printf '%s\n' '!echo "[deploy] step: cd done"'
    printf '%s\n' '!echo "[deploy] step: mirror start"'
    printf 'mirror -R --delete --parallel=3 --verbose "%s/" .\n' "$LOCAL_DIR"
    printf '%s\n' '!echo "[deploy] step: mirror done"'
    printf '%s\n' 'bye'
  } >"$MIRROR_SCRIPT_FILE"
  chmod 600 "$MIRROR_SCRIPT_FILE"
}

report_cd_failure() {
  local exit_code="$1"
  if [[ "$exit_code" -eq 124 ]]; then
    echo "::error title=Hostinger cd timed out::cd to HOSTINGER_FTP_REMOTE_DIR='${REMOTE}' timed out after ${CD_TIMEOUT_SEC}s. The path may be wrong for the SFTP session root."
  else
    echo "::error title=Hostinger cd failed::cd to HOSTINGER_FTP_REMOTE_DIR='${REMOTE}' failed (exit ${exit_code}). Use the exact path relative to the SFTP login directory."
  fi
  remote_path_hint
}

echo "=== SFTP (65002) -> '${REMOTE}' ==="
echo "[deploy] local source: ${LOCAL_DIR}/"
echo "[deploy] phase 1: verify remote cd (${CD_TIMEOUT_SEC}s timeout)"

write_lftp_cd_test_script
set +e
timeout "${CD_TIMEOUT_SEC}s" lftp -f "$CD_SCRIPT_FILE"
cd_exit=$?
set -e

if [[ "$cd_exit" -ne 0 ]]; then
  report_cd_failure "$cd_exit"
  exit 1
fi

echo "[deploy] phase 2: mirror upload (${MIRROR_TIMEOUT_SEC} timeout)"
write_lftp_mirror_script

set +e
timeout "$MIRROR_TIMEOUT_SEC" lftp -f "$MIRROR_SCRIPT_FILE"
mirror_exit=$?
set -e

if [[ "$mirror_exit" -eq 0 ]]; then
  echo "SFTP deploy OK: ${REMOTE}"
  exit 0
fi

if [[ "$mirror_exit" -eq 124 ]]; then
  echo "::error title=Hostinger deploy timed out::lftp mirror exceeded ${MIRROR_TIMEOUT_SEC} limit for HOSTINGER_FTP_REMOTE_DIR='${REMOTE}'."
  exit 1
fi

echo "::error title=Hostinger deploy failed::SFTP mirror failed for HOSTINGER_FTP_REMOTE_DIR='${REMOTE}'."
remote_path_hint
exit 1
