/**
 * Provider Router — creates the correct provider based on configuration.
 * Ported from ClawCode's provider factory pattern.
 *
 * All OpenAI-compatible providers (Groq, DeepSeek, Mistral, xAI, OpenRouter,
 * Ollama, LM Studio, etc.) route through OpenAIProvider with a different baseUrl.
 */

import type { BaseProvider, ProviderConfig } from './types.js'
import { OpenAIProvider } from './openai.js'
import { AnthropicProvider } from './anthropic.js'
import { getProvider as getRegistryProvider } from './models-registry.js'

/** Known provider base URLs */
const PROVIDER_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  mistral: 'https://api.mistral.ai/v1',
  xai: 'https://api.x.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  together: 'https://api.together.xyz/v1',
  fireworks: 'https://api.fireworks.ai/inference/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  perplexity: 'https://api.perplexity.ai',
  sambanova: 'https://api.sambanova.ai/v1',
  novita: 'https://api.novita.ai/v1',
}

/** Known provider API key env vars */
const PROVIDER_ENV_KEYS: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  xai: 'XAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  together: 'TOGETHER_API_KEY',
  fireworks: 'FIREWORKS_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
  anthropic: 'AGENTICODE_API_KEY',
  google: 'GOOGLE_API_KEY',
  azure: 'AZURE_OPENAI_API_KEY',
}

/**
 * Create a provider from configuration.
 * Routes to the correct implementation based on providerId.
 * Falls back to models.dev registry for unknown providers.
 */
export function createProvider(config: ProviderConfig): BaseProvider {
  const providerId = config.providerId.toLowerCase()

  // Resolve API key from env if not provided
  const apiKey = config.apiKey || resolveApiKey(providerId)
  // Resolve base URL from config, hardcoded list, or models.dev registry
  const baseUrl = config.baseUrl || PROVIDER_URLS[providerId]

  // Anthropic uses its own API format
  if (providerId === 'anthropic') {
    return new AnthropicProvider({ ...config, providerId, apiKey, baseUrl })
  }

  // Everything else goes through OpenAI-compatible provider
  return new OpenAIProvider({
    ...config,
    providerId,
    apiKey,
    baseUrl,
  })
}

/**
 * Create a provider from models.dev registry.
 * Auto-discovers base URL and model info from the live registry.
 * Use for any of the 110+ providers in models.dev.
 */
export async function createProviderFromRegistry(
  providerId: string,
  modelId: string,
  apiKey?: string,
): Promise<BaseProvider> {
  const registryProvider = await getRegistryProvider(providerId)
  if (!registryProvider) {
    throw new Error(`Provider '${providerId}' not found in models.dev registry`)
  }

  const model = registryProvider.models[modelId]
  const baseUrl = model?.api?.url || registryProvider.api || undefined

  // Resolve API key from registry env hints
  const key = apiKey || resolveApiKey(providerId) || resolveRegistryEnvKey(registryProvider.env)

  return createProvider({
    providerId,
    model: modelId,
    apiKey: key || undefined,
    baseUrl: baseUrl || undefined,
  })
}

/** Try to resolve API key from registry-suggested env vars */
function resolveRegistryEnvKey(envVars: string[]): string | undefined {
  for (const v of envVars) {
    if (process.env[v]) return process.env[v]
  }
  return undefined
}

/**
 * Create a provider from environment variables.
 * Auto-detects which provider to use based on available API keys.
 */
export function createProviderFromEnv(model?: string): BaseProvider {
  // Check env vars in priority order
  const checks: Array<{ env: string; provider: string; defaultModel: string }> = [
    { env: 'OPENAI_API_KEY', provider: 'openai', defaultModel: 'gpt-4o' },
    { env: 'AGENTICODE_API_KEY', provider: 'anthropic', defaultModel: 'anthropic-sonnet-4' },
    { env: 'GOOGLE_API_KEY', provider: 'google', defaultModel: 'gemini-2.0-flash' },
    { env: 'GROQ_API_KEY', provider: 'groq', defaultModel: 'llama-3.3-70b-versatile' },
    { env: 'DEEPSEEK_API_KEY', provider: 'deepseek', defaultModel: 'deepseek-chat' },
    { env: 'MISTRAL_API_KEY', provider: 'mistral', defaultModel: 'mistral-large-latest' },
    { env: 'XAI_API_KEY', provider: 'xai', defaultModel: 'grok-2' },
    { env: 'OPENROUTER_API_KEY', provider: 'openrouter', defaultModel: 'openai/gpt-4o' },
  ]

  for (const check of checks) {
    if (process.env[check.env]) {
      return createProvider({
        providerId: check.provider,
        model: model || check.defaultModel,
        apiKey: process.env[check.env],
      })
    }
  }

  throw new Error(
    'No AI provider configured. Set one of: ' +
      checks.map((c) => c.env).join(', '),
  )
}

/**
 * List available providers based on environment variables.
 */
export function listAvailableProviders(): Array<{ providerId: string; envVar: string }> {
  return Object.entries(PROVIDER_ENV_KEYS)
    .filter(([, envVar]) => !!process.env[envVar])
    .map(([providerId, envVar]) => ({ providerId, envVar }))
}

function resolveApiKey(providerId: string): string | undefined {
  const envVar = PROVIDER_ENV_KEYS[providerId]
  return envVar ? process.env[envVar] : undefined
}
