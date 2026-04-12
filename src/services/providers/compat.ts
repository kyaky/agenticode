/**
 * Anthropic SDK Compatibility Shim
 *
 * Maps all previously-used @anthropic-ai/sdk types to AgentiCode's own types.
 * This file is the SINGLE import point that replaces ALL @anthropic-ai/sdk imports.
 *
 * Migration: find-replace all `from '@anthropic-ai/sdk...'` with
 * `from '../../services/providers/compat.js'`
 */

// ─── Message Types ───────────────────────────────────────────────────

/** Replaces ProviderMessage */
export interface ProviderMessage {
  id: string
  type: 'message'
  role: 'assistant'
  content: ContentBlock[]
  model: string
  stop_reason: string | null
  stop_sequence: string | null
  usage: Usage
}

/** Replaces ContentBlock */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

/** Replaces ContentBlockParam */
export type ContentBlockParam = ContentBlockParam

/** Replaces ContentBlockParam */
export type ContentBlockParam =
  | TextBlockParam
  | ImageBlockParam
  | ToolUseBlockParam
  | ToolResultBlockParam

/** Replaces TextBlockParam */
export interface TextBlockParam {
  type: 'text'
  text: string
  cache_control?: { type: string }
}

/** Replaces ImageBlockParam */
export interface ImageBlockParam {
  type: 'image'
  source: Base64ImageSource | URLImageSource
  cache_control?: { type: string }
}

export interface Base64ImageSource {
  type: 'base64'
  media_type: string
  data: string
}

export interface URLImageSource {
  type: 'url'
  url: string
}

/** Replaces ToolUseBlock / ToolUseBlock */
export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}
export type ToolUseBlock = ToolUseBlock

/** Replaces ToolUseBlockParam */
export interface ToolUseBlockParam {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

/** Replaces ToolResultBlockParam */
export interface ToolResultBlockParam {
  type: 'tool_result'
  tool_use_id: string
  content: string | ContentBlockParam[]
  is_error?: boolean
  cache_control?: { type: string }
}

/** Replaces ThinkingBlock */
export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

/** Replaces MessageParam / MessageParam */
export interface MessageParam {
  role: 'user' | 'assistant'
  content: string | ContentBlockParam[]
}
export type MessageParam = MessageParam

// ─── Tool Types ──────────────────────────────────────────────────────

/** Replaces ToolUnion */
export type ToolUnion = {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/** Replaces Tool */
export type Tool = ToolUnion

// ─── Usage & Cost ────────────────────────────────────────────────────

/** Replaces Usage */
export interface Usage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

/** Replaces MessageDeltaUsage */
export interface MessageDeltaUsage {
  output_tokens: number
}

// ─── Streaming Types ─────────────────────────────────────────────────

/** Replaces MessageStreamParams */
export interface MessageStreamParams {
  model: string
  max_tokens: number
  messages: MessageParam[]
  system?: string | Array<{ type: 'text'; text: string; cache_control?: { type: string } }>
  tools?: ToolUnion[]
  tool_choice?: { type: string; name?: string }
  temperature?: number
  top_p?: number
  top_k?: number
  thinking?: { type: string; budget_tokens?: number }
  betas?: string[]
  stream?: boolean
  metadata?: { user_id?: string }
}

/** Replaces Stream */
export type Stream<T> = AsyncIterable<T>

/** Replaces RawMessageStreamEvent (simplified) */
export type RawMessageStreamEvent =
  | { type: 'message_start'; message: ProviderMessage }
  | { type: 'content_block_start'; index: number; content_block: ContentBlock }
  | { type: 'content_block_delta'; index: number; delta: { type: string; text?: string; thinking?: string; partial_json?: string } }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_delta'; delta: { stop_reason: string }; usage: MessageDeltaUsage }
  | { type: 'message_stop' }

// ─── Client Types ────────────────────────────────────────────────────

/** Replaces ClientOptions */
export interface ClientOptions {
  apiKey?: string
  baseURL?: string
  maxRetries?: number
  timeout?: number
  defaultHeaders?: Record<string, string>
}

/** Replaces Anthropic client interface */
export interface AnthropicClient {
  beta: {
    messages: {
      create(params: MessageStreamParams, options?: { signal?: AbortSignal; timeout?: number }): Promise<ProviderMessage>
    }
  }
}

// ─── Error Types ─────────────────────────────────────────────────────

/** Replaces APIError */
export class APIError extends Error {
  status: number
  headers?: Record<string, string>
  error?: { type: string; message: string }

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'APIError'
  }

  static isInstance(err: unknown): err is APIError {
    return err instanceof APIError
  }
}

/** Replaces APIUserAbortError */
export class APIUserAbortError extends APIError {
  constructor() {
    super(0, 'Request was aborted')
    this.name = 'APIUserAbortError'
  }
}

// ─── Beta Feature Types ──────────────────────────────────────────────

/** Replaces Provider20250305 */
export interface WebSearchTool {
  type: 'web_search'
  name?: string
}

/** Replaces JSONOutputFormat */
export interface JSONOutputFormat {
  type: 'json_object'
  schema?: Record<string, unknown>
}

// ─── Re-exports for common patterns ─────────────────────────────────

export type { ProviderMessage as Message }
export type { ContentBlock as ContentBlock }
export type { Usage }

// ─── Clean name aliases (no Beta prefix) ─────────────────────────────
export type { Provider as ProviderMessage }
export type { Provider as ContentBlock }
export type { Provider as Usage }
export type { Provider as ToolUnion }
export type { Provider as MessageStreamParams }
export type { Provider as RawMessageStreamEvent }
export type { Provider as MessageDeltaUsage }
export type { Provider as JSONOutputFormat }

// Default export — replaces `import Anthropic from "@anthropic-ai/sdk"`
const Provider = { name: "agenticode-provider" }
export default Provider

export class APIConnectionError extends APIError {
  constructor(message = 'Connection failed') { super(0, message); this.name = 'APIConnectionError' }
}
export class APIConnectionTimeoutError extends APIError {
  constructor(message = 'Connection timed out') { super(0, message); this.name = 'APIConnectionTimeoutError' }
}
export class RateLimitError extends APIError {
  constructor(message = 'Rate limited') { super(429, message); this.name = 'RateLimitError' }
}
export class AuthenticationError extends APIError {
  constructor(message = 'Authentication failed') { super(401, message); this.name = 'AuthenticationError' }
}
export class BadRequestError extends APIError {
  constructor(message = 'Bad request') { super(400, message); this.name = 'BadRequestError' }
}
export class NotFoundError extends APIError {
  constructor(message = 'Not found') { super(404, message); this.name = 'NotFoundError' }
}
export class InternalServerError extends APIError {
  constructor(message = 'Internal server error') { super(500, message); this.name = 'InternalServerError' }
}
export class PermissionDeniedError extends APIError {
  constructor(message = 'Permission denied') { super(403, message); this.name = 'PermissionDeniedError' }
}
export class UnprocessableEntityError extends APIError {
  constructor(message = 'Unprocessable entity') { super(422, message); this.name = 'UnprocessableEntityError' }
}
