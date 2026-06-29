#!/usr/bin/env bash
# Idempotent cloud-agent bootstrap: Node 24 + canonical git remote owner casing.
set -eo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$_SCRIPT_DIR/.." && pwd)"
BASHRC_MARKER="# noeyarmory-cloud-node24"

# shellcheck source=scripts/lib/cloud-env.sh
. "$ROOT/scripts/lib/cloud-env.sh"

activate_node_from_nvmrc "$ROOT"
assert_node_major_ge 24
echo "Node $(node -v) active"

enable_corepack_pnpm
echo "Corepack enabled (pnpm via packageManager)"

normalize_origin_owner_casing "$ROOT"

if [ -f "$HOME/.bashrc" ] && ! grep -qF "$BASHRC_MARKER" "$HOME/.bashrc"; then
  cat >>"$HOME/.bashrc" <<EOF

$BASHRC_MARKER — auto-use Node from .nvmrc in $ROOT
if [[ -f "$ROOT/.nvmrc" && -s "\$HOME/.nvm/nvm.sh" ]]; then
  case "\$PWD" in
    $ROOT|$ROOT/*)
      # shellcheck source=/dev/null
      . "$ROOT/scripts/lib/cloud-env.sh"
      activate_node_from_nvmrc "$ROOT" >/dev/null 2>&1 || true
      enable_corepack_pnpm >/dev/null 2>&1 || true
      ;;
  esac
fi
EOF
  echo "Appended Node 24 workspace hook to ~/.bashrc"
fi
