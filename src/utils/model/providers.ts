import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.AGENTICODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.AGENTICODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.AGENTICODE_USE_FOUNDRY)
        ? 'foundry'
        : 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if AGENTICODE_BASE_URL is a first-party Provider API URL.
 * Returns true if not set (default API) or points to api.agenticode.dev
 * (or api-staging.agenticode.dev for ant users).
 */
export function isFirstPartyBaseUrl(): boolean {
  const baseUrl = process.env.AGENTICODE_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.agenticode.dev']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.agenticode.dev')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
