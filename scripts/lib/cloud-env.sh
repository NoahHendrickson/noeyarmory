#!/usr/bin/env bash
# Shared cloud-agent helpers — source from ensure-cloud-env.sh and ~/.bashrc hook.

CANONICAL_OWNER="NoahHendrickson"
CANONICAL_REPO="noeyarmory"

activate_node_from_nvmrc() {
  local root="$1"
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "error: nvm not found at $NVM_DIR/nvm.sh" >&2
    return 1
  fi

  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"

  local prev="$PWD"
  cd "$root"
  nvm install
  nvm use
  export PATH="$NVM_DIR/versions/node/$(nvm version)/bin:$PATH"
  cd "$prev"
}

assert_node_major_ge() {
  local min="$1"
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [ "$major" -lt "$min" ]; then
    echo "error: Node >= $min required, got $(node -v)" >&2
    return 1
  fi
}

normalize_origin_owner_casing() {
  local root="$1"
  local current owner repo auth_prefix git_suffix fixed

  if ! git -C "$root" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    return 0
  fi

  current="$(git -C "$root" remote get-url origin 2>/dev/null || true)"
  [ -n "$current" ] || return 0

  if [[ "$current" =~ ^https://([^@]*@)?github\.com/([^/]+)/([^/.]+)(\.git)?$ ]]; then
    auth_prefix="${BASH_REMATCH[1]:-}"
    owner="${BASH_REMATCH[2]}"
    repo="${BASH_REMATCH[3]}"
    git_suffix="${BASH_REMATCH[4]:-}"

    if [[ "${owner,,}" == "${CANONICAL_OWNER,,}" && "${repo,,}" == "${CANONICAL_REPO,,}" && "$owner" != "$CANONICAL_OWNER" ]]; then
      fixed="https://${auth_prefix}github.com/${CANONICAL_OWNER}/${repo}${git_suffix}"
      git -C "$root" remote set-url origin "$fixed"
      echo "Normalized origin owner casing to $CANONICAL_OWNER"
    fi
  elif [[ "$current" =~ ^git@github\.com:([^/]+)/([^/.]+)(\.git)?$ ]]; then
    owner="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
    git_suffix="${BASH_REMATCH[3]:-}"

    if [[ "${owner,,}" == "${CANONICAL_OWNER,,}" && "${repo,,}" == "${CANONICAL_REPO,,}" && "$owner" != "$CANONICAL_OWNER" ]]; then
      git -C "$root" remote set-url origin "git@github.com:${CANONICAL_OWNER}/${repo}${git_suffix}"
      echo "Normalized origin owner casing to $CANONICAL_OWNER"
    fi
  fi
}
