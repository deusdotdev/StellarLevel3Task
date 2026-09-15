/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string
  readonly VITE_NETWORK_PASSPHRASE?: string
  readonly VITE_HORIZON_URL?: string
  readonly VITE_ADMIN?: string
  readonly VITE_CASH_ID?: string
  readonly VITE_ORACLE_ID?: string
  readonly VITE_DESK_ID?: string
  readonly VITE_ALPHA_ID?: string
  readonly VITE_INDEX_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
