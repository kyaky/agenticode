import axios from 'axios'
import memoize from 'lodash-es/memoize.js'
import { getOauthConfig } from 'src/constants/oauth.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from 'src/services/analytics/index.js'
import { getAgenticodeOAuthTokens } from 'src/utils/auth.js'
import { getGlobalConfig, saveGlobalConfig } from 'src/utils/config.js'
import { logForDebugging } from 'src/utils/debug.js'
import { isEnvDefinedFalsy } from 'src/utils/envUtils.js'
import { clearMcpAuthCache } from './client.js'
import { normalizeNameForMCP } from './normalization.js'
import type { ScopedMcpServerConfig } from './types.js'

type AgenticodeAIMcpServer = {
  type: 'mcp_server'
  id: string
  display_name: string
  url: string
  created_at: string
}

type AgenticodeAIMcpServersResponse = {
  data: AgenticodeAIMcpServer[]
  has_more: boolean
  next_page: string | null
}

const FETCH_TIMEOUT_MS = 5000
const MCP_SERVERS_BETA_HEADER = 'mcp-servers-2025-12-04'

/**
 * Fetches MCP server configurations from Agenticode.ai org configs.
 * These servers are managed by the organization via Agenticode.ai.
 *
 * Results are memoized for the session lifetime (fetch once per CLI session).
 */
export const fetchAgenticodeAIMcpConfigsIfEligible = memoize(
  async (): Promise<Record<string, ScopedMcpServerConfig>> => {
    try {
      if (isEnvDefinedFalsy(process.env.ENABLE_AGENTICODEAI_MCP_SERVERS)) {
        logForDebugging('[agenticodeAi-mcp] Disabled via env var')
        logEvent('tengu_agenticodeAi_mcp_eligibility', {
          state:
            'disabled_env_var' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      const tokens = getAgenticodeOAuthTokens()
      if (!tokens?.accessToken) {
        logForDebugging('[agenticodeAi-mcp] No access token')
        logEvent('tengu_agenticodeAi_mcp_eligibility', {
          state:
            'no_oauth_token' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      // Check for user:mcp_servers scope directly instead of isAgenticodeAISubscriber().
      // In non-interactive mode, isAgenticodeAISubscriber() returns false when AGENTICODE_API_KEY
      // is set (even with valid OAuth tokens) because preferThirdPartyAuthentication() causes
      // isAuthEnabled() to return false. Checking the scope directly allows users
      // with both API keys and OAuth tokens to access agenticode.dev MCPs in print mode.
      if (!tokens.scopes?.includes('user:mcp_servers')) {
        logForDebugging(
          `[agenticodeAi-mcp] Missing user:mcp_servers scope (scopes=${tokens.scopes?.join(',') || 'none'})`,
        )
        logEvent('tengu_agenticodeAi_mcp_eligibility', {
          state:
            'missing_scope' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
        return {}
      }

      const baseUrl = getOauthConfig().BASE_API_URL
      const url = `${baseUrl}/v1/mcp_servers?limit=1000`

      logForDebugging(`[agenticodeAi-mcp] Fetching from ${url}`)

      const response = await axios.get<AgenticodeAIMcpServersResponse>(url, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
          'provider-beta': MCP_SERVERS_BETA_HEADER,
          'api-version': '2023-06-01',
        },
        timeout: FETCH_TIMEOUT_MS,
      })

      const configs: Record<string, ScopedMcpServerConfig> = {}
      // Track used normalized names to detect collisions and assign (2), (3), etc. suffixes.
      // We check the final normalized name (including suffix) to handle edge cases where
      // a suffixed name collides with another server's base name (e.g., "Example Server 2"
      // colliding with "Example Server! (2)" which both normalize to agenticode_ai_Example_Server_2).
      const usedNormalizedNames = new Set<string>()

      for (const server of response.data.data) {
        const baseName = `agenticode.dev ${server.display_name}`

        // Try without suffix first, then increment until we find an unused normalized name
        let finalName = baseName
        let finalNormalized = normalizeNameForMCP(finalName)
        let count = 1
        while (usedNormalizedNames.has(finalNormalized)) {
          count++
          finalName = `${baseName} (${count})`
          finalNormalized = normalizeNameForMCP(finalName)
        }
        usedNormalizedNames.add(finalNormalized)

        configs[finalName] = {
          type: 'agenticode-proxy',
          url: server.url,
          id: server.id,
          scope: 'agenticodeAi',
        }
      }

      logForDebugging(
        `[agenticodeAi-mcp] Fetched ${Object.keys(configs).length} servers`,
      )
      logEvent('tengu_agenticodeAi_mcp_eligibility', {
        state:
          'eligible' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })
      return configs
    } catch {
      logForDebugging(`[agenticodeAi-mcp] Fetch failed`)
      return {}
    }
  },
)

/**
 * Clears the memoized cache for fetchAgenticodeAIMcpConfigsIfEligible.
 * Call this after login so the next fetch will use the new auth tokens.
 */
export function clearAgenticodeAIMcpConfigsCache(): void {
  fetchAgenticodeAIMcpConfigsIfEligible.cache.clear?.()
  // Also clear the auth cache so freshly-authorized servers get re-connected
  clearMcpAuthCache()
}

/**
 * Record that a agenticode.dev connector successfully connected. Idempotent.
 *
 * Gates the "N connectors unavailable/need auth" startup notifications: a
 * connector that was working yesterday and is now failed is a state change
 * worth surfacing; an org-configured connector that's been needs-auth since
 * it showed up is one the user has demonstrably ignored.
 */
export function markAgenticodeAiMcpConnected(name: string): void {
  saveGlobalConfig(current => {
    const seen = current.agenticodeAiMcpEverConnected ?? []
    if (seen.includes(name)) return current
    return { ...current, agenticodeAiMcpEverConnected: [...seen, name] }
  })
}

export function hasAgenticodeAiMcpEverConnected(name: string): boolean {
  return (getGlobalConfig().agenticodeAiMcpEverConnected ?? []).includes(name)
}
