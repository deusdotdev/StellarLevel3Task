#!/usr/bin/env bash
set -euo pipefail

# Re-print oracle prices so desk mint/redeem stops failing with "stale".
# Needs the deployer (or other oracle admin) identity on testnet.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/deployments/testnet.env}"
NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:-deployer}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — run ./scripts/deploy.sh first." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

STOCKS=(
  "AAPL|2270000000"
  "NVDA|1780000000"
  "GOOGL|1650000000"
  "MSFT|4150000000"
  "AMZN|1860000000"
  "META|5120000000"
  "TSLA|2480000000"
  "AVGO|1720000000"
  "JPM|1980000000"
  "LLY|8120000000"
)

invoke() {
  stellar contract invoke --id "$1" --source "$SOURCE" --network "$NETWORK" -- "${@:2}"
}

echo "Refreshing oracle prints as $SOURCE…"
for row in "${STOCKS[@]}"; do
  IFS='|' read -r ticker price <<<"$row"
  invoke "$ORACLE" set_price --symbol "$ticker" --price "$price"
done

if [ "${SET_DESK_MAX_AGE:-}" != "" ]; then
  echo "Setting desk max_age to $SET_DESK_MAX_AGE…"
  invoke "$DESK" set_max_age --max_age "$SET_DESK_MAX_AGE"
fi

echo "Oracle prices refreshed."
