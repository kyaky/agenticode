/**
 * AgentiCode Provider Abstraction Layer
 * Ported from ClawCode's BaseProvider architecture (Python → TypeScript).
 * Unified types for multi-provider LLM communication.
 */

// ─── Message Types ───────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface ContentBlock {
  type: 'text' | 'image' | 'file' | 'tool_use' | 'tool_result'
  text?: string
  /** Base64 image data or URL */
  imageUrl?: string
  mediaType?: string
  /** Tool call reference */
  toolCallId?: string
  toolName?: string
  toolInput?: Record<string, unknown>
  toolOutput?: string
}

export interface Message {
  role: MessageRole
  content: string | ContentBlock[]
  /** For tool result messages */
  toolCallId?: string
  /** For assistant messages with tool calls */
  toolCalls?: ToolCall[]
  /** Extended thinking/reasoning content */
  thinking?: string
}

// ─── Tool Types ──────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ToolCall {
  id: string
  name: string
  input: string | Record<string, unknown>
  finished?: boolean
}

/** Normalize tool input — handles nested JSON wrapping from some providers */
export function normalizeToolInput(
  input: string | Record<string, unknown>,
  toolName?: string,
): Record<string, unknown> {
  if (typeof input === 'object') return unwrapRaw(input, toolName)
  try {
    const parsed = JSON.parse(input)
    if (typeof parsed === 'object' && parsed !== null) return unwrapRaw(parsed, toolName)
    return { raw: input }
  } catch {
    return { raw: input }
  }
}

function unwrapRaw(data: Record<string, unknown>, toolName?: string): Record<string, unknown> {
  const d = { ...data }
  // Unwrap nested JSON in 'raw' field (up to 4 levels, per ClawCode pattern)
  for (let i = 0; i < 4; i++) {
    const raw = d.raw
    if (typeof raw !== 'string') break
    try {
      const inner = JSON.parse(raw)
      if (typeof inner === 'object' && inner !== null) {
        delete d.raw
        Object.assign(d, inner)
      } else break
    } catch {
      break
    }
  }
  // Bash-specific: map 'code' to 'command'
  if (toolName === 'bash' && !d.command && d.code) {
    d.command = d.code
  }
  return d
}

// ─── Response Types ──────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
}

export interface ProviderResponse {
  content: string
  thinking: string
  toolCalls: ToolCall[]
  usage: TokenUsage
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error' | 'unknown'
  model: string
}

// ─── Streaming Types ─────────────────────────────────────────────────

export type ProviderEventType =
  | 'content_start'
  | 'content_delta'
  | 'thinking_delta'
  | 'tool_use_start'
  | 'tool_use_delta'
  | 'tool_use_stop'
  | 'complete'
  | 'error'
  | 'warning'

export interface ProviderEvent {
  type: ProviderEventType
  content?: string
  thinking?: string
  toolCall?: ToolCall
  response?: ProviderResponse
  error?: Error
}

// ─── Provider Configuration ──────────────────────────────────────────

export interface ProviderConfig {
  /** Provider identifier (e.g., 'openai', 'anthropic', 'google') */
  providerId: string
  /** Model name (e.g., 'gpt-4o', 'anthropic-sonnet-4') */
  model: string
  /** API key */
  apiKey?: string
  /** Base URL override (for local/proxy servers) */
  baseUrl?: string
  /** Max output tokens */
  maxTokens?: number
  /** Temperature (0-2) */
  temperature?: number
  /** Top P */
  topP?: number
  /** System message */
  systemMessage?: string
  /** Additional provider-specific options */
  options?: Record<string, unknown>
}

// ─── Provider Interface ──────────────────────────────────────────────

export interface BaseProvider {
  /** Provider identifier */
  readonly providerId: string

  /** Send messages and get complete response */
  sendMessages(
    messages: Message[],
    tools?: ToolDefinition[],
  ): Promise<ProviderResponse>

  /** Stream response from the LLM */
  streamResponse(
    messages: Message[],
    tools?: ToolDefinition[],
  ): AsyncGenerator<ProviderEvent>

  /** Convert tools to provider-specific format */
  formatTools(tools: ToolDefinition[]): unknown[]

  /** Convert messages to provider-specific format */
  formatMessages(messages: Message[]): unknown[]
}
