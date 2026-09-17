# Stock on Stellar

**Stellar Testnet desk for mock tokenized stocks.**

This is not a security, not investment advice, and not a claim on Apple, Nvidia, or any other issuer. Tickers like `AAPL` and `NVDA` are **testnet mocks we issued** so you can buy and sell against mUSD. They are not 1:1 anything in the real world.

Stock on Stellar is a Level 3 (Orange Belt) style dApp: advanced contracts, tests, CI, deployment workflow, and a mobile-first UI — not a licensed brokerage.

## Why this exists

Robinhood-style stock tokens are a **custody + issuer + trading** stack. Stock on Stellar copies the *rail* on Testnet:

1. We act as the mock issuer: ten well-known names, clearly labeled as fakes
2. Buy / sell against mock USD at an oracle print (primary desk, DEX-style UI)
3. Per-symbol oracle with pause + staleness
4. Raw balances that do not rebase; a `multiplier` represents reinvested dividends

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
    └── mint / desk_burn ► Equity (AAPL, NVDA, …)
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
# Uses your stellar-cli identity. Prefer an existing `deployer` key; override with SOURCE=mywallet.
./scripts/deploy.sh
```

The script signs with a **local stellar-cli identity** (default: `deployer` if it exists). That account is the issuer/admin. It deploys cash, oracle, desk, and ten equity contracts, lists each market, prints a mock price, and writes public IDs to `deployments/testnet.env` and `frontend/.env.local`.

If mint/redeem fails with **stale oracle**, re-print prices (desk allows ~1h by default; use `SET_DESK_MAX_AGE=86400` for 24h):

```bash
chmod +x scripts/refresh-prices.sh
./scripts/refresh-prices.sh
```

**Do not put an `S…` secret in `.env` / `VITE_*`.** Vite bakes those into the browser bundle. `.env` is only for public RPC URLs and contract IDs. The signing key stays in `~/.config/stellar/identity/`. Users of the dApp always sign in Freighter with *their* wallet.

### Frontend

```bash
cd frontend
npm install
npm test
npm run dev
```

Connect Freighter (or another kit wallet) on **Testnet**, tap **Fund XLM fees**, then **Get testnet mUSD**, then mint.

Vercel: set Root Directory to `frontend`, then add the `VITE_*` keys from `frontend/.env.example` as **Production** env vars (Vite bakes them in at build time). `vercel.json` already rewrites the SPA.

## Testnet

Live IDs from `deployments/testnet.env` (Stellar Testnet):

| Role | Contract / account |
| --- | --- |
| Admin (`deployer`) | [`GB5X3MNSH7I5LV7BZO6I3FM4ZHMDTPCGREM74PG6BNHKDNCSXNYAV2K6`](https://stellar.expert/explorer/testnet/account/GB5X3MNSH7I5LV7BZO6I3FM4ZHMDTPCGREM74PG6BNHKDNCSXNYAV2K6) |
| Cash (mUSD) | [`CC36NOCR33FDXIXBLPFUQQWUY4ERIUQF55MDEXHLCYRMX4Q6WB2GNNK6`](https://stellar.expert/explorer/testnet/contract/CC36NOCR33FDXIXBLPFUQQWUY4ERIUQF55MDEXHLCYRMX4Q6WB2GNNK6) |
| Oracle | [`CBFXXTF5VDAGNEPMRNQX3NTQVBIIZDRGB54PWY3MQMNORCRPOBOM3E5O`](https://stellar.expert/explorer/testnet/contract/CBFXXTF5VDAGNEPMRNQX3NTQVBIIZDRGB54PWY3MQMNORCRPOBOM3E5O) |
| Desk | [`CBTWWTXK2DRZFDDWYSVTDX7SAUPEPD35QLCBPXFZLG74RZNYYPY63LB2`](https://stellar.expert/explorer/testnet/contract/CBTWWTXK2DRZFDDWYSVTDX7SAUPEPD35QLCBPXFZLG74RZNYYPY63LB2) |
| AAPL | [`CC6CCBAJVMXUXUCQ6UNWPIQMNYB2N6SND7SU7FFLICZ3M4DBQXHK3OY5`](https://stellar.expert/explorer/testnet/contract/CC6CCBAJVMXUXUCQ6UNWPIQMNYB2N6SND7SU7FFLICZ3M4DBQXHK3OY5) |
| NVDA | [`CCIK5YNQ4OBGQYHKSM3Y3PNLHOVOHXLXABJA3D3P7RWWCVUYFBRBYK4E`](https://stellar.expert/explorer/testnet/contract/CCIK5YNQ4OBGQYHKSM3Y3PNLHOVOHXLXABJA3D3P7RWWCVUYFBRBYK4E) |
| GOOGL | [`CCDINJSZE4DAOMLIIYJQ5JSCKEJZYVYKMJMLS4ZUWBFCJTUOT3IHS3KC`](https://stellar.expert/explorer/testnet/contract/CCDINJSZE4DAOMLIIYJQ5JSCKEJZYVYKMJMLS4ZUWBFCJTUOT3IHS3KC) |
| MSFT | [`CBPZUJGOV7FRQK7QGJ5KFSLLXWOW4N7KTHYW7Y6SPTGQPVFR56AOMMKO`](https://stellar.expert/explorer/testnet/contract/CBPZUJGOV7FRQK7QGJ5KFSLLXWOW4N7KTHYW7Y6SPTGQPVFR56AOMMKO) |
| AMZN | [`CB5EMXF6GGQCHYNTEJJRJOX3MUVM55SB5B5VKYW5WQRQEEXCJ6DOLXPZ`](https://stellar.expert/explorer/testnet/contract/CB5EMXF6GGQCHYNTEJJRJOX3MUVM55SB5B5VKYW5WQRQEEXCJ6DOLXPZ) |
| META | [`CBTSMQDYGX2HIOGJ43BU2W2IGFRDF4RTBIYPGM3YXK5EIYETQG6RHYJ3`](https://stellar.expert/explorer/testnet/contract/CBTSMQDYGX2HIOGJ43BU2W2IGFRDF4RTBIYPGM3YXK5EIYETQG6RHYJ3) |
| TSLA | [`CAYQLNVGZ6JSA4WSP4CKUZKWIEQY5RRDADXFAEW7466AZI3UFJ4ECQND`](https://stellar.expert/explorer/testnet/contract/CAYQLNVGZ6JSA4WSP4CKUZKWIEQY5RRDADXFAEW7466AZI3UFJ4ECQND) |
| AVGO | [`CBDNMY3IOD63AGGNBH2AK3YORMEMCT3JOHNLWSPKDRIGOFDZVFHB3W4J`](https://stellar.expert/explorer/testnet/contract/CBDNMY3IOD63AGGNBH2AK3YORMEMCT3JOHNLWSPKDRIGOFDZVFHB3W4J) |
| JPM | [`CCVIXE34WW4MEKEVX5Q7QBYOW2WRLTJ3NQU2NMKSWSNRMGIM5SW3NF7D`](https://stellar.expert/explorer/testnet/contract/CCVIXE34WW4MEKEVX5Q7QBYOW2WRLTJ3NQU2NMKSWSNRMGIM5SW3NF7D) |
| LLY | [`CDKGMBTNWCH7K5BFB3WJQY46BQJS7FWFOMHS2IWTDEA3EAEMTUGHE42I`](https://stellar.expert/explorer/testnet/contract/CDKGMBTNWCH7K5BFB3WJQY46BQJS7FWFOMHS2IWTDEA3EAEMTUGHE42I) |

Contract interactions (Stellar Expert, signed by `deployer`):

- [Mint 1 AAPL](https://stellar.expert/explorer/testnet/tx/99a1477d77c61a401583403d5dec1c4b90c96d8c396f5a426f2ffc0e045867ff) — desk pulls 227 mUSD, credits raw `10000000`
- [Redeem 0.2 AAPL](https://stellar.expert/explorer/testnet/tx/921c5ac44900d85cdc36264a8d52865ae1c48d3507432059c3a7b1c8a8d5c651) — burns equity, pays out 45.4 mUSD
- [Faucet](https://stellar.expert/explorer/testnet/tx/3c794f89045accda708d7b649f3f2e278696c9435c90b5b8ed5f16287f6de07d) / [approve desk](https://stellar.expert/explorer/testnet/tx/18a86d457e3623b2c17e0f233ef8dfe87a3e47eb20b977f3d0a68ea563842b54)
- [Price AAPL $227](https://stellar.expert/explorer/testnet/tx/4f85141960fd251057cf4a0e2f1197168024bc8c9705e365cf71e411abba54f7)

## User flow

1. Land on Stock on Stellar, then Explore the listed names
2. Connect wallet
3. Friendbot for fee XLM
4. Faucet 10,000 mUSD
5. Buy (mint) a listed ticker such as `AAPL` — desk pulls mUSD at the oracle price
6. Redeem back to mUSD

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
- [ ] Live demo (Vercel of `frontend/` — paste Production URL here after you deploy)
- [x] Contract addresses after `./scripts/deploy.sh` → `deployments/testnet.env`
- [x] Transaction hashes from a mint/redeem (Stellar Expert Testnet)
- [x] Mobile-first UI
- [x] CI workflow `.github/workflows/ci.yml` ([green on `main`](https://github.com/deusdotdev/StellarLevel3Task/actions/runs/35116748605))
- [x] 3+ passing tests (12 Rust + 5 Vitest)
- [ ] 1–2 min demo video

## Disclaimer

Stock on Stellar tokens are **testnet mocks**. Do not market them as stock. Do not deploy ticker-named clones to Mainnet as if they were real equities.
