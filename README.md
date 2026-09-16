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

Vercel: set Root Directory to `frontend`, then add the `VITE_*` keys from `frontend/.env.example` as **Production** env vars (Vite bakes them in at build time). `vercel.json` already rewrites the SPA.

## Testnet

Live IDs from `deployments/testnet.env` (Stellar Testnet):

| Role | Contract / account |
| --- | --- |
| Admin | [`GD2JGQMG5FHPKRDAWZ6IIBOY4YMJIB6P45SKWYAXJD2Q4F276ZTWJHZ3`](https://stellar.expert/explorer/testnet/account/GD2JGQMG5FHPKRDAWZ6IIBOY4YMJIB6P45SKWYAXJD2Q4F276ZTWJHZ3) |
| Cash (mUSD) | [`CCCAYANBTYRKHOH77NVFTM4SVOWPG7N2OVTGXB37FFXMGVI4N3HSM3QP`](https://stellar.expert/explorer/testnet/contract/CCCAYANBTYRKHOH77NVFTM4SVOWPG7N2OVTGXB37FFXMGVI4N3HSM3QP) |
| Oracle | [`CDOUCPSNA2FHUGDDWOVDCVKIKZYE577R5J5BVUBCF7JU6KS5IS36M5AM`](https://stellar.expert/explorer/testnet/contract/CDOUCPSNA2FHUGDDWOVDCVKIKZYE577R5J5BVUBCF7JU6KS5IS36M5AM) |
| EQ-ALPHA | [`CCYOTLGRDYZPFVDYJZ774AZVO46BUART5FHHIVH5NRQO5LWNAGUIRPRL`](https://stellar.expert/explorer/testnet/contract/CCYOTLGRDYZPFVDYJZ774AZVO46BUART5FHHIVH5NRQO5LWNAGUIRPRL) |
| EQ-INDEX | [`CBYNGXZKN3OUR4EIMXKQFSBNHLWB7A53G2O6O5P77QSK2ITMB4RHF5TG`](https://stellar.expert/explorer/testnet/contract/CBYNGXZKN3OUR4EIMXKQFSBNHLWB7A53G2O6O5P77QSK2ITMB4RHF5TG) |
| Desk | [`CDED4QZZYSDYMFCVARIUI6E36OX5DIJ7CNTFFTCB4I4IOCMEW57VRAO2`](https://stellar.expert/explorer/testnet/contract/CDED4QZZYSDYMFCVARIUI6E36OX5DIJ7CNTFFTCB4I4IOCMEW57VRAO2) |

Contract interactions (Stellar Expert):

- [Mint 1 ALPHA](https://stellar.expert/explorer/testnet/tx/4becf2bffa118158e31a379064931d0a5e98b7ddad99f2fc2e1c4b4c40f93185) — desk pulls 150 mUSD, credits raw `10000000`
- [Redeem 0.2 ALPHA](https://stellar.expert/explorer/testnet/tx/5be9c139f30bd372ac7ceac407c0eb72f5422bbaed701ad11e01ac30bce67528) — burns equity, pays out 30 mUSD
- [Faucet](https://stellar.expert/explorer/testnet/tx/7d9f295116570ed1c88873ed679ba6ba91c511ebef5e3ea0810a804b34b70cf7) / [approve desk](https://stellar.expert/explorer/testnet/tx/7e96d1deae95fe9dcef6eeddbf7f14c95f8b7e5ee881e55260cd74fac88ff4e6)
- Init: [list ALPHA](https://stellar.expert/explorer/testnet/tx/ced1b04a59a041b62d9f6d07b0d0d958d845886a72e38e023bde1a820ab79a94), [list INDEX](https://stellar.expert/explorer/testnet/tx/b0f0d078c7609fcf89cabf9be2c32daa017d0b002b05f6ad0e7238fa41bdecce), [price ALPHA](https://stellar.expert/explorer/testnet/tx/e9aed505b83dcf47df9627b76cb168f850ccd738466072277d2673eeb7e1dce3), [price INDEX](https://stellar.expert/explorer/testnet/tx/03b4b3a201512fed3ae3dad272a39081aaa681d41b0eaa33a2c5a57adf31e841)

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
- [ ] Live demo (Vercel of `frontend/` — paste Production URL here after you deploy)
- [x] Contract addresses after `./scripts/deploy.sh` → `deployments/testnet.env`
- [x] Transaction hashes from a mint/redeem (Stellar Expert Testnet)
- [x] Mobile-first UI
- [x] CI workflow `.github/workflows/ci.yml` ([green on `main`](https://github.com/deusdotdev/StellarLevel3Task/actions/runs/35116748605))
- [x] 3+ passing tests (12 Rust + 5 Vitest)
- [ ] 1–2 min demo video

## Disclaimer

EQRail tokens are **testnet mocks**. Do not market them as stock. Do not deploy ticker-named clones to Mainnet as if they were real equities.
