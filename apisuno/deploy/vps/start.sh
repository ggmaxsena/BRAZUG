#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

mkdir -p src/app/static musicas_geradas spotify_local

if [ -f .venv/bin/activate ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
elif [ -f .venv/Scripts/activate ]; then
  # shellcheck disable=SC1091
  source .venv/Scripts/activate
fi

export PYTHONPATH="$ROOT_DIR"

if [ -x .venv/bin/python ]; then
  exec .venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8000}"
elif [ -x .venv/Scripts/python.exe ]; then
  exec .venv/Scripts/python.exe -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8000}"
else
  exec python3 -m uvicorn src.main:app --host 0.0.0.0 --port "${PORT:-8000}"
fi
