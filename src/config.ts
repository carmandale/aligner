const DEFAULT_API_URL = 'http://127.0.0.1:3001'

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const apiBase = (import.meta.env.VITE_ALIGNER_API_URL as string | undefined) ?? DEFAULT_API_URL
const wsBase = (import.meta.env.VITE_ALIGNER_WS_URL as string | undefined) ?? apiBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')

export const ALIGNER_API_URL = trimTrailingSlashes(apiBase)
export const ALIGNER_WS_URL = trimTrailingSlashes(wsBase)
