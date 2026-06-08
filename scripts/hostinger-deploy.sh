#!/usr/bin/env bash
set -euo pipefail

: "${HOSTINGER_FTP_SERVER:?HOSTINGER_FTP_SERVER is required}"
: "${HOSTINGER_FTP_USERNAME:?HOSTINGER_FTP_USERNAME is required}"
: "${HOSTINGER_FTP_PASSWORD:?HOSTINGER_FTP_PASSWORD is required}"
: "${HOSTINGER_FTP_REMOTE_DIR:?HOSTINGER_FTP_REMOTE_DIR is required}"

LOCAL_DIR="${1:-dist}"
SCRIPT_FILE="$(mktemp)"
trap 'rm -f "$SCRIPT_FILE" "${SCRIPT_FILE}.run"; unset LFTP_PASSWORD' EXIT

# Password via LFTP_PASSWORD + --env-password (never use -u user,pass — commas break lftp).
# URL must be inside the script as `open ...` — passing URL on the lftp CLI with -f makes lftp
# treat it as a script command ("Unknown command `sftp://host:65002'").
run_lftp() {
  local scheme="$1"
  local port="$2"
  local target="$3"
  shift 3
  local -a extra_settings=("$@")
  local open_url="${scheme}://${HOSTINGER_FTP_SERVER}:${port}"

  echo "=== ${scheme^^} (${port}) -> '${target}' ==="
  write_mirror_script "$target"

  {
    for setting in "${extra_settings[@]}"; do
      printf '%s\n' "$setting"
    done
    printf 'open --env-password -u %q %q\n' \
      "${HOSTINGER_FTP_USERNAME}" \
      "${open_url}"
    cat "$SCRIPT_FILE"
  } >"${SCRIPT_FILE}.run"

  export LFTP_PASSWORD="${HOSTINGER_FTP_PASSWORD}"

  if lftp -f "${SCRIPT_FILE}.run"; then
    echo "${scheme^^} deploy OK: ${target}"
    return 0
  fi

  echo "${scheme^^} deploy failed: ${target}"
  return 1
}

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
  run_lftp ftps 21 "$target" \
    "set ssl:verify-certificate no" \
    "set ftp:ssl-force true" \
    "set ftp:ssl-protect-data true"
}

try_sftp() {
  local target="$1"
  run_lftp sftp 65002 "$target" \
    "set sftp:auto-confirm yes"
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
