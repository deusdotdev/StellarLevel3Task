#!/usr/bin/env bash
set -euo pipefail

# Signs with a stellar-cli identity (never put an S… secret in frontend .env —
# VITE_* is public in the browser bundle). Import your Freighter key locally:
#   stellar keys add mywallet
#   SOURCE=mywallet ./scripts/deploy.sh
# If SOURCE is unset, prefer an existing `deployer` identity, else eqrail-admin.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export CARGO_TARGET_DIR="$ROOT/target"

NETWORK="${NETWORK:-testnet}"
RPC="${RPC:-https://soroban-testnet.stellar.org}"

if ! command -v stellar >/dev/null; then
  echo "stellar CLI is required (https://developers.stellar.org/docs/tools/cli)" >&2
  exit 1
fi

if [ -z "${SOURCE:-}" ]; then
  if stellar keys address deployer >/dev/null 2>&1; then
    SOURCE=deployer
  else
    SOURCE=eqrail-admin
  fi
fi

if ! stellar keys address "$SOURCE" >/dev/null 2>&1; then
  echo "Generating funded testnet identity: $SOURCE"
  stellar keys generate "$SOURCE" --network "$NETWORK" --fund
fi

stellar keys fund "$SOURCE" --network "$NETWORK" >/dev/null 2>&1 || true

ADMIN="$(stellar keys address "$SOURCE")"
echo "Admin / issuer: $ADMIN  (identity: $SOURCE)"

echo "Building contracts…"
stellar contract build

WASM_DIR="$ROOT/target/wasm32v1-none/release"
deploy() {
  local wasm="$1"
  local alias="$2"
  stellar contract deploy \
    --wasm "$WASM_DIR/$wasm" \
    --source "$SOURCE" \
    --network "$NETWORK" \
    --alias "$alias" | tee /dev/stderr | grep -E '^C[A-Z0-9]+$' | tail -n1
}

# ticker|display name|price in stroops (7 decimals)
STOCKS=(
  "AAPL|Apple Inc.|2270000000"
  "NVDA|NVIDIA Corp.|1780000000"
  "GOOGL|Alphabet Inc.|1650000000"
  "MSFT|Microsoft Corp.|4150000000"
  "AMZN|Amazon.com Inc.|1860000000"
  "META|Meta Platforms|5120000000"
  "TSLA|Tesla Inc.|2480000000"
  "AVGO|Broadcom Inc.|1720000000"
  "JPM|JPMorgan Chase|1980000000"
  "LLY|Eli Lilly|8120000000"
)

echo "Deploying core…"
CASH="$(deploy cash.wasm eqrail-cash)"
ORACLE="$(deploy oracle.wasm eqrail-oracle)"
DESK="$(deploy desk.wasm eqrail-desk)"

invoke() {
  local id="$1"
  shift
  stellar contract invoke --id "$id" --source "$SOURCE" --network "$NETWORK" -- "$@"
}

echo "Initializing cash / oracle / desk…"
invoke "$CASH" initialize --admin "$ADMIN"
invoke "$ORACLE" initialize --admin "$ADMIN"
invoke "$DESK" initialize --admin "$ADMIN" --cash "$CASH" --oracle "$ORACLE"

echo "Issuing mock stocks…"
ENV_STOCK_LINES=""
VITE_STOCK_LINES=""
for row in "${STOCKS[@]}"; do
  IFS='|' read -r ticker name price <<<"$row"
  alias="eqrail-$(echo "$ticker" | tr '[:upper:]' '[:lower:]')"
  id="$(deploy equity.wasm "$alias")"
  echo "  $ticker -> $id"
  invoke "$id" initialize --admin "$ADMIN" --name "$name" --symbol "$ticker"
  invoke "$id" set_minter --minter "$DESK"
  invoke "$DESK" list_market --symbol "$ticker" --equity "$id"
  invoke "$ORACLE" set_price --symbol "$ticker" --price "$price"
  ENV_STOCK_LINES="${ENV_STOCK_LINES}${ticker}=${id}
"
  VITE_STOCK_LINES="${VITE_STOCK_LINES:-}VITE_${ticker}_ID=${id}
"
done

mkdir -p "$ROOT/deployments"
cat > "$ROOT/deployments/testnet.env" <<EOF
ADMIN=$ADMIN
SOURCE=$SOURCE
CASH=$CASH
ORACLE=$ORACLE
DESK=$DESK
${ENV_STOCK_LINES}
EOF

cat > "$ROOT/frontend/.env.local" <<EOF
VITE_RPC_URL=$RPC
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_ADMIN=$ADMIN
VITE_CASH_ID=$CASH
VITE_ORACLE_ID=$ORACLE
VITE_DESK_ID=$DESK
${VITE_STOCK_LINES}
EOF

echo
echo "Deployed to $NETWORK as $ADMIN"
cat "$ROOT/deployments/testnet.env"
echo "Wrote frontend/.env.local"
