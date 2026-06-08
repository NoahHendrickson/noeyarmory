#!/usr/bin/env bash
# Idempotent cloud-agent bootstrap: Node 24 + canonical git remote casing.
set -eo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANONICAL_ORIGIN="https://github.com/NoahHendrickson/noeyarmory"
BASHRC_MARKER="# noeyarmory-cloud-node24"

# --- Node 24 (repo requires >=24; VM default is Node 22 at /exec-daemon/node) ---
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  (cd "$ROOT" && nvm install && nvm use)
  export PATH="$NVM_DIR/versions/node/$(nvm version)/bin:$PATH"
  echo "Node $(node -v) active"
else
  echo "warn: nvm not found; Node may still be $(node -v 2>/dev/null || echo unknown)" >&2
fi

# --- Git remote: canonical owner casing for PR tooling ---
if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  current="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
  if [ -n "$current" ]; then
    stripped="$(printf '%s' "$current" | sed -E 's#^https://[^@]+@#https://#; s#^git@github.com:#https://github.com/#')"
    if [ "${stripped,,}" != "${CANONICAL_ORIGIN,,}" ] || [ "$stripped" != "$CANONICAL_ORIGIN" ]; then
      git -C "$ROOT" remote set-url origin "$CANONICAL_ORIGIN"
      echo "Normalized origin remote to $CANONICAL_ORIGIN"
    fi
  fi
fi

# --- Persist Node 24 for interactive shells under /workspace ---
if [ -f "$HOME/.bashrc" ] && ! grep -qF "$BASHRC_MARKER" "$HOME/.bashrc"; then
  cat >>"$HOME/.bashrc" <<'EOF'

# noeyarmory-cloud-node24 — auto-use Node from .nvmrc in /workspace
if [[ -f /workspace/.nvmrc && -s "$HOME/.nvm/nvm.sh" ]]; then
  case "$PWD" in
    /workspace|/workspace/*)
      export NVM_DIR="$HOME/.nvm"
      # shellcheck source=/dev/null
      . "$NVM_DIR/nvm.sh"
      nvm use /workspace >/dev/null 2>&1 || nvm install
      export PATH="$NVM_DIR/versions/node/$(nvm version)/bin:$PATH"
      ;;
  esac
fi
EOF
  echo "Appended Node 24 workspace hook to ~/.bashrc"
fi
