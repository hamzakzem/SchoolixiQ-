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
CONFIGURED_REMOTE="$(strip_cr_lf "${HOSTINGER_FTP_REMOTE_DIR}")"
CONFIGURED_REMOTE="${CONFIGURED_REMOTE%/}"

if [[ -z "$CONFIGURED_REMOTE" ]] || [[ "$CONFIGURED_REMOTE" == *".."* ]]; then
  echo "::error title=Invalid HOSTINGER_FTP_REMOTE_DIR::Remote directory is empty or invalid after sanitization"
  exit 1
fi

LOCAL_DIR="${1:-dist}"
CD_SCRIPT_FILE="$(mktemp)"
trap 'rm -f "$CD_SCRIPT_FILE"' EXIT

CD_TIMEOUT_SEC="${HOSTINGER_CD_TIMEOUT_SEC:-90}"
MIRROR_TIMEOUT_SEC="${HOSTINGER_MIRROR_TIMEOUT_SEC:-8m}"
REMOTE=""

remote_path_hint() {
  cat <<EOF
Hint: Hostinger SFTP (65002) is usually chrooted to your account home. Try one of:
  - domains/schoolixiq.com/public_html
  - /domains/schoolixiq.com/public_html
  - /home/USERNAME/domains/schoolixiq.com/public_html
Configured value was: ${CONFIGURED_REMOTE}
EOF
}

# Build ordered cd candidates: exact path first, then Hostinger fallbacks.
build_cd_candidates() {
  local raw="$1"
  local -a ordered=()
  local candidate stripped

  add_candidate() {
    candidate="${1%/}"
    [[ -z "$candidate" ]] && return
    local existing
    for existing in "${ordered[@]:-}"; do
      [[ "$existing" == "$candidate" ]] && return
    done
    ordered+=("$candidate")
  }

  add_candidate "$raw"

  if [[ "$raw" =~ ^/home/[^/]+/(.+)$ ]]; then
    add_candidate "${BASH_REMATCH[1]}"
    add_candidate "/${BASH_REMATCH[1]}"
  fi

  if [[ "$raw" != /* ]]; then
    add_candidate "/${raw}"
  elif [[ "$raw" != /home/* ]]; then
    stripped="${raw#/}"
    add_candidate "$stripped"
  fi

  printf '%s\n' "${ordered[@]}"
}

write_lftp_cd_test_script() {
  local target="$1"
  {
    printf '%s\n' 'set sftp:auto-confirm yes'
    printf '%s\n' 'set cmd:fail-exit yes'
    printf '%s\n' 'set net:timeout 30'
    printf '%s\n' 'set net:max-retries 2'
    printf '%s\n' 'set net:reconnect-interval-base 3'
    printf '%s\n' '!echo "[deploy] step: open sftp"'
    printf 'open sftp://%s:65002\n' "$FTP_SERVER"
    printf '%s\n' '!echo "[deploy] step: user auth"'
    printf 'user %s %s\n' "$FTP_USER" "$FTP_PASSWORD"
    printf '%s\n' '!echo "[deploy] remote pwd before cd:"'
    printf '%s\n' 'pwd'
    printf '%s\n' "!echo \"[deploy] attempting cd to: ${target}\""
    printf 'cd "%s"\n' "$target"
    printf '%s\n' '!echo "[deploy] remote pwd after cd:"'
    printf '%s\n' 'pwd'
    printf '%s\n' '!echo "[deploy] step: cd done"'
    printf '%s\n' 'bye'
  } >"$CD_SCRIPT_FILE"
  chmod 600 "$CD_SCRIPT_FILE"
}

try_remote_cd() {
  local target="$1"
  write_lftp_cd_test_script "$target"
  set +e
  timeout "${CD_TIMEOUT_SEC}s" lftp -f "$CD_SCRIPT_FILE"
  local exit_code=$?
  set -e
  return "$exit_code"
}

resolve_remote_dir() {
  local candidate
  while IFS= read -r candidate; do
    [[ -z "$candidate" ]] && continue
    echo "[deploy] cd attempt: ${candidate}"
    if try_remote_cd "$candidate"; then
      REMOTE="$candidate"
      echo "[deploy] cd OK using: ${REMOTE}"
      return 0
    fi
    echo "[deploy] cd failed for: ${candidate}"
  done < <(build_cd_candidates "$CONFIGURED_REMOTE")
  return 1
}

write_lftp_mirror_script() {
  local phase="$1"
  local script_file="$2"
  {
    printf '%s\n' 'set sftp:auto-confirm yes'
    printf '%s\n' 'set cmd:fail-exit yes'
    printf '%s\n' 'set net:timeout 120'
    printf '%s\n' 'set net:max-retries 5'
    printf '%s\n' 'set net:reconnect-interval-base 5'
    printf '%s\n' '!echo "[deploy] step: open sftp"'
    printf 'open sftp://%s:65002\n' "$FTP_SERVER"
    printf 'user %s %s\n' "$FTP_USER" "$FTP_PASSWORD"
    printf 'cd "%s"\n' "$REMOTE"

    case "$phase" in
      assets-upload)
        printf '%s\n' '!echo "[deploy] phase: upload assets (no delete)"'
        printf 'mirror -R --parallel=4 --verbose "%s/assets/" ./assets/\n' "$LOCAL_DIR"
        ;;
      body-sync)
        printf '%s\n' '!echo "[deploy] phase: sync body (exclude shell + assets)"'
        printf 'mirror -R --delete --parallel=3 --verbose -X assets/ -X index.html -X sw.js "%s/" .\n' "$LOCAL_DIR"
        ;;
      shell-upload)
        printf '%s\n' '!echo "[deploy] phase: upload index.html + sw.js last"'
        printf 'put -O . "%s/index.html"\n' "$LOCAL_DIR"
        printf 'put -O . "%s/sw.js"\n' "$LOCAL_DIR"
        ;;
      assets-prune)
        printf '%s\n' '!echo "[deploy] phase: prune stale assets"'
        printf 'mirror -R --delete --parallel=2 --verbose "%s/assets/" ./assets/\n' "$LOCAL_DIR"
        ;;
      *)
        printf '%s\n' '!echo "[deploy] phase: full mirror (fallback)"'
        printf 'mirror -R --delete --parallel=3 --verbose "%s/" .\n' "$LOCAL_DIR"
        ;;
    esac

    printf '%s\n' 'bye'
  } >"$script_file"
  chmod 600 "$script_file"
}

run_mirror_phase() {
  local phase="$1"
  local label="$2"
  local script_file
  script_file="$(mktemp)"
  write_lftp_mirror_script "$phase" "$script_file"
  echo "[deploy] ${label}"
  set +e
  timeout "$MIRROR_TIMEOUT_SEC" lftp -f "$script_file"
  local exit_code=$?
  set -e
  rm -f "$script_file"
  return "$exit_code"
}

report_cd_failure() {
  echo "::error title=Hostinger cd failed::Could not cd to HOSTINGER_FTP_REMOTE_DIR='${CONFIGURED_REMOTE}' (tried fallbacks for Hostinger chroot paths)."
  remote_path_hint
}

echo "=== SFTP (65002) configured='${CONFIGURED_REMOTE}' ==="
echo "[deploy] local source: ${LOCAL_DIR}/"
echo "[deploy] phase 1: resolve remote cd (${CD_TIMEOUT_SEC}s timeout per attempt)"

if ! resolve_remote_dir; then
  report_cd_failure
  exit 1
fi

echo "[deploy] phase 2: atomic mirror upload (${MIRROR_TIMEOUT_SEC} timeout per step) -> '${REMOTE}'"
for step in \
  "assets-upload:upload new hashed assets (keep old until shell updated)" \
  "body-sync:sync static files (exclude assets shell)" \
  "shell-upload:upload index.html + sw.js" \
  "assets-prune:remove stale hashed assets"; do
  phase="${step%%:*}"
  label="${step#*:}"
  if ! run_mirror_phase "$phase" "$label"; then
    echo "::error title=Hostinger deploy failed::mirror phase '${phase}' failed for resolved remote='${REMOTE}'."
    remote_path_hint
    exit 1
  fi
done

echo "SFTP deploy OK: ${REMOTE}"
exit 0
