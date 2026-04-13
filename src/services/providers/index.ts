/**
 * AgentiCode Provider Abstraction Layer
 * Multi-provider LLM support with unified interface.
 *
 * Supports 110+ providers via models.dev registry, plus direct support for:
 * Anthropic, OpenAI, Groq, DeepSeek, Mistral, xAI, OpenRouter,
 * Together, Fireworks, Cerebras, Perplexity, Ollama, LM Studio,
 * and any OpenAI-compatible endpoint.
 */

export type {
  BaseProvider,
  ProviderConfig,
  ProviderResponse,
  ProviderEvent,
  ProviderEventType,
  Message,
  MessageRole,
  ContentBlock,
  ToolDefinition,
  ToolCall,
  TokenUsage,
} from './types.js'

export { normalizeToolInput } from './types.js'
export { OpenAIProvider } from './openai.js'
export { AnthropicProvider } from './anthropic.js'
export { createProvider, createProviderFromEnv, createProviderFromRegistry, listAvailableProviders } from './router.js'
export { webSearch, detectSearchBackend, type SearchResult, type SearchConfig } from './web-search.js'
export {
  fromAnthropicContent,
  fromAnthropicToolResult,
  toOpenAIMessages,
  toAnthropicMessages,
  toGeminiMessages,
} from './converter.js'
export { detectCapabilities, buildThinkingParams, buildCacheControl, type ProviderCapabilities } from './capabilities.js'

// models.dev registry — 110+ providers, 2000+ models
export {
  fetchRegistry,
  listProviders,
  getProvider as getRegistryProvider,
  listModels,
  searchModels,
  findCheapestModel,
  categorizeProviders,
  registryStats,
  type RegistryModel,
  type RegistryProvider,
  type ModelRegistry,
} from './models-registry.js'
