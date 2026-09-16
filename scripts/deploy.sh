#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export CARGO_TARGET_DIR="$ROOT/target"

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:-eqrail-admin}"
RPC="${RPC:-https://soroban-testnet.stellar.org}"

if ! command -v stellar >/dev/null; then
  echo "stellar CLI is required (https://developers.stellar.org/docs/tools/cli)" >&2
  exit 1
fi

if ! stellar keys address "$SOURCE" >/dev/null 2>&1; then
  echo "Generating funded testnet identity: $SOURCE"
  stellar keys generate "$SOURCE" --network "$NETWORK" --fund
fi

ADMIN="$(stellar keys address "$SOURCE")"
echo "Admin: $ADMIN"

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
    --alias "$alias"
}

echo "Deploying…"
CASH="$(deploy cash.wasm eqrail-cash)"
ORACLE="$(deploy oracle.wasm eqrail-oracle)"
ALPHA="$(deploy equity.wasm eqrail-alpha)"
INDEX="$(deploy equity.wasm eqrail-index)"
DESK="$(deploy desk.wasm eqrail-desk)"

invoke() {
  local id="$1"
  shift
  stellar contract invoke --id "$id" --source "$SOURCE" --network "$NETWORK" -- "$@"
}

echo "Initializing…"
invoke "$CASH" initialize --admin "$ADMIN"
invoke "$ORACLE" initialize --admin "$ADMIN"
invoke "$ALPHA" initialize --admin "$ADMIN" --name "EQ Alpha" --symbol "ALPHA"
invoke "$INDEX" initialize --admin "$ADMIN" --name "EQ Index" --symbol "INDEX"
invoke "$DESK" initialize --admin "$ADMIN" --cash "$CASH" --oracle "$ORACLE"
invoke "$ALPHA" set_minter --minter "$DESK"
invoke "$INDEX" set_minter --minter "$DESK"
invoke "$DESK" list_market --symbol ALPHA --equity "$ALPHA"
invoke "$DESK" list_market --symbol INDEX --equity "$INDEX"
invoke "$ORACLE" set_price --symbol ALPHA --price 1500000000
invoke "$ORACLE" set_price --symbol INDEX --price 800000000

mkdir -p "$ROOT/deployments"
cat > "$ROOT/deployments/testnet.env" <<EOF
ADMIN=$ADMIN
CASH=$CASH
ORACLE=$ORACLE
ALPHA=$ALPHA
INDEX=$INDEX
DESK=$DESK
EOF

cat > "$ROOT/frontend/.env.local" <<EOF
VITE_RPC_URL=$RPC
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_ADMIN=$ADMIN
VITE_CASH_ID=$CASH
VITE_ORACLE_ID=$ORACLE
VITE_DESK_ID=$DESK
VITE_ALPHA_ID=$ALPHA
VITE_INDEX_ID=$INDEX
EOF

echo
echo "Deployed to $NETWORK"
cat "$ROOT/deployments/testnet.env"
echo "Wrote frontend/.env.local"
