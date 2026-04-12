/**
 * Provider Capabilities Detection — ported from ClawCode pattern.
 * Each provider declares what features it supports via capability flags.
 * Replaces hardcoded Anthropic-specific feature checks.
 */

/** Provider capability flags */
export interface ProviderCapabilities {
  /** Supports extended thinking / reasoning (Anthropic thinking, OpenAI o1/o3) */
  thinking: boolean
  /** Thinking config format */
  thinkingFormat: 'anthropic' | 'openai-reasoning' | 'none'
  /** Supports prompt caching */
  caching: boolean
  /** Caching format */
  cachingFormat: 'anthropic-ephemeral' | 'openai-auto' | 'none'
  /** Supports streaming */
  streaming: boolean
  /** Supports tool/function calling */
  toolCalling: boolean
  /** Supports parallel tool calls */
  parallelTools: boolean
  /** Supports multimodal input (images) */
  multimodal: boolean
  /** Supports computer use / browser control */
  computerUse: boolean
  /** Supports structured JSON output */
  structuredOutput: boolean
  /** Supports web search */
  webSearch: boolean
  /** Max context window tokens */
  maxContext: number
}

/** Default capabilities (conservative) */
const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  thinking: false,
  thinkingFormat: 'none',
  caching: false,
  cachingFormat: 'none',
  streaming: true,
  toolCalling: true,
  parallelTools: true,
  multimodal: false,
  computerUse: false,
  structuredOutput: false,
  webSearch: false,
  maxContext: 128000,
}

/** Thinking models by provider */
const THINKING_MODELS: Record<string, Set<string>> = {
  anthropic: new Set(['anthropic-sonnet-4', 'anthropic-opus-4']),
  openai: new Set(['o1', 'o1-preview', 'o1-mini', 'o3', 'o3-mini', 'o3-pro']),
  deepseek: new Set(['deepseek-reasoner']),
}

/** Models with caching support */
const CACHING_MODELS: Record<string, boolean> = {
  anthropic: true,
  openai: true, // automatic
  google: false,
  groq: false,
}

/**
 * Detect capabilities for a provider + model combination.
 * Follows ClawCode's `supports_thinking`, `supports_caching` pattern.
 */
export function detectCapabilities(providerId: string, model: string): ProviderCapabilities {
  const caps = { ...DEFAULT_CAPABILITIES }
  const pId = providerId.toLowerCase()
  const mId = model.toLowerCase()

  // Thinking support
  const thinkingSet = THINKING_MODELS[pId]
  if (thinkingSet) {
    for (const tm of thinkingSet) {
      if (mId.includes(tm)) {
        caps.thinking = true
        caps.thinkingFormat = pId === 'openai' ? 'openai-reasoning' : 'anthropic'
        break
      }
    }
  }
  // DeepSeek thinking via adapter
  if (mId.includes('deepseek') && mId.includes('reasoner')) {
    caps.thinking = true
    caps.thinkingFormat = 'anthropic' // DeepSeek uses similar format
  }

  // Caching
  if (pId === 'anthropic') {
    caps.caching = true
    caps.cachingFormat = 'anthropic-ephemeral'
  } else if (pId === 'openai') {
    caps.caching = true
    caps.cachingFormat = 'openai-auto'
  }

  // Multimodal
  if (['anthropic', 'openai', 'google'].includes(pId)) {
    caps.multimodal = true
  }
  if (mId.includes('vision') || mId.includes('4o') || mId.includes('gemini')) {
    caps.multimodal = true
  }

  // Structured output
  if (['openai', 'anthropic'].includes(pId)) {
    caps.structuredOutput = true
  }

  // Computer use — only through MCP, not provider-native
  caps.computerUse = false

  // Context window
  if (mId.includes('200k') || pId === 'anthropic') caps.maxContext = 200000
  if (mId.includes('1m') || mId.includes('gemini-1.5-pro')) caps.maxContext = 1000000
  if (mId.includes('128k') || mId.includes('gpt-4o')) caps.maxContext = 128000

  return caps
}

/**
 * Build thinking parameters for a specific provider.
 * Follows ClawCode's AnthropicProvider._get_thinking_params() pattern.
 */
export function buildThinkingParams(
  caps: ProviderCapabilities,
  budgetTokens?: number,
): Record<string, unknown> {
  if (!caps.thinking) return {}

  switch (caps.thinkingFormat) {
    case 'anthropic':
      return {
        thinking: {
          type: 'enabled',
          ...(budgetTokens ? { budget_tokens: budgetTokens } : {}),
        },
      }
    case 'openai-reasoning':
      return {
        ...(budgetTokens ? { reasoning_effort: budgetTokens > 10000 ? 'high' : budgetTokens > 3000 ? 'medium' : 'low' } : {}),
      }
    default:
      return {}
  }
}

/**
 * Build cache control for messages based on provider capabilities.
 * Follows ClawCode's Anthropic CACHE_MESSAGE_COUNT pattern.
 */
export function buildCacheControl(
  caps: ProviderCapabilities,
): { type: string } | undefined {
  if (!caps.caching) return undefined

  switch (caps.cachingFormat) {
    case 'anthropic-ephemeral':
      return { type: 'ephemeral' }
    case 'openai-auto':
      return undefined // OpenAI handles caching automatically
    default:
      return undefined
  }
}
