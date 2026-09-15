# EQRail

**Stellar Testnet primary desk for fictional equity rails.**

This is not a security, not investment advice, and not a claim on Apple, Nvidia, or any other issuer. `EQ-ALPHA` and `EQ-INDEX` are mock instruments used to demonstrate mint/redeem, oracles, corporate-action multipliers, and contract-to-contract calls on Soroban.

EQRail is a Level 3 (Orange Belt) style dApp: advanced contracts, tests, CI, deployment workflow, and a mobile-first UI — not a licensed brokerage.

## Why this exists

Robinhood-style stock tokens are a **custody + issuer + ERC-20** stack. EQRail copies only the *rail*:

1. Authorized primary mint/redeem against mock USD
2. Per-symbol oracle with pause + staleness
3. Raw balances that do not rebase; a `multiplier` represents reinvested dividends
4. A desk contract that is the sole minter of equity tokens

Real US equities on Stellar belong to regulated issuers / DTCC (planned). This repo is the application layer you can actually ship on Testnet today.

## Architecture

```
User wallet
    │
    ▼
Frontend (Vite + React)
    │
    ▼
Desk  ──requires_fresh──►  Oracle
    │                         │
    ├── transfer_from ──►  Cash (mUSD)
    └── mint / desk_burn ► Equity (ALPHA, INDEX)
```

| Contract | Role |
| --- | --- |
| `cash` | Mock USD with faucet, approve, transfer_from |
| `oracle` | Admin price prints, pause, staleness window |
| `equity` | Raw token + `multiplier` + `balance_ui` |
| `desk` | Primary window, quote, mint, redeem |

Inter-contract: `desk` is the only minter. It pulls mUSD, reads the oracle, then credits or burns equity.

## Quick start

### Contracts

Needs Rust, `wasm32v1-none`, and [stellar-cli](https://developers.stellar.org/docs/tools/cli/install-cli).

```bash
cargo test --workspace
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script funds a `eqrail-admin` Testnet identity, deploys all four crates (equity twice), initializes markets at $150 / $80, and writes `frontend/.env.local`.

### Frontend

```bash
cd frontend
npm install
npm test
npm run dev
```

Connect Freighter (or another kit wallet) on **Testnet**, tap **Fund XLM fees**, then **Get testnet mUSD**, then mint.

## User flow

1. Connect wallet
2. Friendbot for fee XLM
3. Faucet 10,000 mUSD
4. Buy (mint) `ALPHA` — desk pulls mUSD at the oracle price
5. Watch the tape (contract events)
6. Optional: Ops tab closes the primary window (mint then fails with a mapped error)
7. Redeem back to mUSD

Loading states: simulate → sign → submit → confirm. Contract errors `#6` window, `#7` paused, `#8` stale are mapped to plain language.

## Tests

```
cargo test --workspace   # 12 contract tests
cd frontend && npm test  # format + error mapping
```

CI (GitHub Actions) runs both plus a wasm build and `npm run build`.

## Submission checklist

- [x] Public GitHub repo (this tree)
- [x] README documentation
- [x] Meaningful commits (use conventional history when you push)
- [ ] Live demo (Vercel/Netlify of `frontend/`)
- [ ] Contract addresses after `./scripts/deploy.sh` → `deployments/testnet.env`
- [ ] Transaction hashes from a mint/redeem (Stellar Expert Testnet)
- [x] Mobile-first UI
- [x] CI workflow `.github/workflows/ci.yml`
- [x] 3+ passing tests (12 Rust + 5 Vitest)
- [ ] 1–2 min demo video

## Disclaimer

EQRail tokens are **testnet mocks**. Do not market them as stock. Do not deploy ticker-named clones to Mainnet as if they were real equities.
