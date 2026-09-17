/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string
  readonly VITE_NETWORK_PASSPHRASE?: string
  readonly VITE_HORIZON_URL?: string
  readonly VITE_ADMIN?: string
  readonly VITE_CASH_ID?: string
  readonly VITE_ORACLE_ID?: string
  readonly VITE_DESK_ID?: string
  readonly VITE_AAPL_ID?: string
  readonly VITE_NVDA_ID?: string
  readonly VITE_GOOGL_ID?: string
  readonly VITE_MSFT_ID?: string
  readonly VITE_AMZN_ID?: string
  readonly VITE_META_ID?: string
  readonly VITE_TSLA_ID?: string
  readonly VITE_AVGO_ID?: string
  readonly VITE_JPM_ID?: string
  readonly VITE_LLY_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
