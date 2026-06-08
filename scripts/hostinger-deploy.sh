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
trap 'rm -f "$SCRIPT_FILE" "${SCRIPT_FILE}.run"; unset LFTP_PASSWORD' EXIT

# Build lftp script: plain "open" + "user" lines (no printf %q — %q emits $'...' tokens lftp misparses).
write_lftp_script() {
  local scheme="$1"
  local port="$2"
  local target="$3"
  shift 3
  local -a extra_settings=("$@")
  local open_url="${scheme}://${FTP_SERVER}:${port}"

  write_mirror_commands "$target"

  {
    for setting in "${extra_settings[@]}"; do
      printf '%s\n' "$setting"
    done
    printf 'open %s\n' "$open_url"
    printf 'user %s\n' "$FTP_USER"
    cat "$SCRIPT_FILE"
  } >"${SCRIPT_FILE}.run"
}

run_lftp() {
  local scheme="$1"
  local port="$2"
  local target="$3"
  shift 3

  echo "=== ${scheme^^} (${port}) -> '${target}' ==="
  write_lftp_script "$scheme" "$port" "$target" "$@"

  export LFTP_PASSWORD="${FTP_PASSWORD}"

  if lftp --env-password -f "${SCRIPT_FILE}.run"; then
    echo "${scheme^^} deploy OK: ${target}"
    return 0
  fi

  echo "${scheme^^} deploy failed: ${target}"
  return 1
}

write_mirror_commands() {
  local target="$1"
  cat >"$SCRIPT_FILE" <<EOF
set cmd:fail-exit yes
set net:timeout 90
set net:max-retries 3
pwd
ls -la
mirror -R --delete --parallel=6 --verbose \
  --exclude server.mjs \
  --exclude server.cjs \
  --exclude server.cjs.map \
  --exclude .ftp-deploy-sync-state.json \
  ${LOCAL_DIR}/ ${target}
bye
EOF
}

try_sftp() {
  local target="$1"
  run_lftp sftp 65002 "$target" "set sftp:auto-confirm yes"
}

try_ftps() {
  local target="$1"
  run_lftp ftps 21 "$target" \
    "set ssl:verify-certificate no" \
    "set ftp:ssl-force true" \
    "set ftp:ssl-protect-data true"
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
  if try_sftp "$target"; then exit 0; fi
  sleep 5
done

# FTPS (21) only when explicitly enabled — Hostinger often blocks/timeouts port 21 on CI.
if [[ "${HOSTINGER_USE_FTPS:-}" == "1" || "${HOSTINGER_USE_FTPS:-}" == "true" ]]; then
  seen="|"
  for target in "${TARGETS[@]}"; do
    [[ -z "$target" ]] && continue
    case "$seen" in *"|${target}|"*) continue ;; esac
    seen="${seen}${target}|"
    if try_ftps "$target"; then exit 0; fi
    sleep 5
  done
fi

echo "::error title=Hostinger deploy failed::Download artifact schoolixiq-dist from Actions and upload to public_html via hPanel File Manager."
exit 1
