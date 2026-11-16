#!/usr/bin/env bash
# Instalador de gentleman-greeting (Linux y macOS).
#
#   ./install.sh            copia la extensión y sus assets al agent home
#   ./install.sh --dry-run  muestra qué haría, sin escribir
#
# Si preferís la vía de paquetes del harness, no hace falta este script:
#
#   gentle-shell install git:github.com/efolchmontiel/gentleman-greeting
#
set -euo pipefail

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    -h|--help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "argumento desconocido: $arg" >&2; exit 2 ;;
  esac
done

aca="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Misma precedencia que usa el harness para resolver el agent home.
if [ -n "${GENTLE_PI_AGENT_HOME:-}" ]; then
  home="$GENTLE_PI_AGENT_HOME"
elif [ -n "${PI_CODING_AGENT_DIR:-}" ]; then
  home="$PI_CODING_AGENT_DIR"
elif [ -d "$HOME/.gentle-shell/agent" ]; then
  home="$HOME/.gentle-shell/agent"
elif [ -d "$HOME/.pi/agent" ]; then
  home="$HOME/.pi/agent"
else
  home="$HOME/.gentle-shell/agent"
fi

destino_ext="$home/extensions/gentleman-greeting.ts"
destino_assets="$home/assets/gentleman-greeting"
marca="$(date +%Y%m%d-%H%M%S)"

echo "agent home:  $home"
echo "extensión:   $destino_ext"
echo "assets:      $destino_assets/"
[ "$DRY_RUN" = 1 ] && echo "(dry run: no se escribe nada)"

hacer() {
  if [ "$DRY_RUN" = 1 ]; then
    echo "  + $*"
  else
    "$@"
  fi
}

hacer mkdir -p "$home/extensions" "$destino_assets"

if [ -f "$destino_ext" ]; then
  echo "backup:      $destino_ext.bak-$marca"
  hacer cp "$destino_ext" "$destino_ext.bak-$marca"
fi

hacer cp "$aca/extensions/gentleman-greeting.ts" "$destino_ext"
hacer cp "$aca/assets/gentleman-greeting/frases.json" "$destino_assets/"
hacer cp "$aca"/assets/gentleman-greeting/inicio_*.png "$destino_assets/"
hacer cp "$aca"/assets/gentleman-greeting/cierre_*.png "$destino_assets/"

echo
echo "Listo. Cerrá y volvé a abrir Gentle Shell para que cargue la extensión."
echo "Despedida manual sin cerrar la sesión:  /goodbye"
