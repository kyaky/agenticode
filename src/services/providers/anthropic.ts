/**
 * Anthropic Provider — handles Anthropic API calls.
 * Converts from OpenAI-compatible intermediate format to Anthropic's native format.
 * Ported from ClawCode's AnthropicProvider pattern.
 */

import type {
  BaseProvider,
  Message,
  ProviderConfig,
  ProviderEvent,
  ProviderResponse,
  ToolCall,
  ToolDefinition,
  TokenUsage,
} from './types.js'

export class AnthropicProvider implements BaseProvider {
  readonly providerId = 'anthropic'
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.config = config
  }

  async sendMessages(messages: Message[], tools?: ToolDefinition[]): Promise<ProviderResponse> {
    const { systemMessage, anthropicMessages } = this.splitSystem(messages)
    const body = this.buildRequestBody(systemMessage, anthropicMessages, tools, false)
    const response = await this.request(body)
    return this.parseResponse(await response.json())
  }

  async *streamResponse(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<ProviderEvent> {
    const { systemMessage, anthropicMessages } = this.splitSystem(messages)
    const body = this.buildRequestBody(systemMessage, anthropicMessages, tools, true)
    const response = await this.request(body)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let thinking = ''
    const toolsByIndex = new Map<number, ToolCall>()
    let usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 0 }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (!data || data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            const et = event.type

            // Text streaming
            if (et === 'content_block_delta') {
              const delta = event.delta
              if (delta?.type === 'text_delta' && delta.text) {
                content += delta.text
                yield { type: 'content_delta', content: delta.text }
              } else if (delta?.type === 'thinking_delta' && delta.thinking) {
                thinking += delta.thinking
                yield { type: 'thinking_delta', thinking: delta.thinking }
              } else if (delta?.type === 'input_json_delta' && delta.partial_json) {
                // Tool input buffering by block index (ClawCode pattern)
                const idx = event.index ?? 0
                const existing = toolsByIndex.get(idx)
                if (existing) {
                  const prev = typeof existing.input === 'string' ? existing.input : ''
                  toolsByIndex.set(idx, { ...existing, input: prev + delta.partial_json })
                }
              }
            }

            // Tool call start
            else if (et === 'content_block_start' && event.content_block?.type === 'tool_use') {
              const idx = event.index ?? 0
              const tc: ToolCall = {
                id: event.content_block.id,
                name: event.content_block.name,
                input: '',
                finished: false,
              }
              toolsByIndex.set(idx, tc)
              yield { type: 'tool_use_start', toolCall: tc }
            }

            // Tool call complete
            else if (et === 'content_block_stop') {
              const idx = event.index ?? 0
              const tc = toolsByIndex.get(idx)
              if (tc && !tc.finished) {
                let parsedInput: Record<string, unknown> = {}
                try {
                  parsedInput = typeof tc.input === 'string' ? JSON.parse(tc.input || '{}') : tc.input as Record<string, unknown>
                } catch { parsedInput = {} }
                const finalized = { ...tc, input: parsedInput, finished: true }
                toolsByIndex.set(idx, finalized)
                yield { type: 'tool_use_stop', toolCall: finalized }
              }
            }

            // Message complete
            else if (et === 'message_delta') {
              if (event.usage) {
                usage = {
                  inputTokens: event.usage.input_tokens ?? usage.inputTokens,
                  outputTokens: event.usage.output_tokens ?? usage.outputTokens,
                  cacheReadTokens: event.usage.cache_read_input_tokens ?? 0,
                  cacheWriteTokens: event.usage.cache_creation_input_tokens ?? 0,
                  totalTokens: (event.usage.input_tokens ?? 0) + (event.usage.output_tokens ?? 0),
                }
              }
            }

            // Message start (has initial usage)
            else if (et === 'message_start' && event.message?.usage) {
              const u = event.message.usage
              usage = {
                inputTokens: u.input_tokens ?? 0,
                outputTokens: u.output_tokens ?? 0,
                cacheReadTokens: u.cache_read_input_tokens ?? 0,
                cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
                totalTokens: (u.input_tokens ?? 0) + (u.output_tokens ?? 0),
              }
            }
          } catch {
            // Skip unparseable
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield {
      type: 'complete',
      response: {
        content,
        thinking,
        toolCalls: Array.from(toolsByIndex.values()).sort((a, b) => {
          const aIdx = [...toolsByIndex.entries()].find(([, v]) => v === a)?.[0] ?? 0
          const bIdx = [...toolsByIndex.entries()].find(([, v]) => v === b)?.[0] ?? 0
          return aIdx - bIdx
        }),
        usage,
        finishReason: toolsByIndex.size > 0 ? 'tool_calls' : 'stop',
        model: this.config.model,
      },
    }
  }

  formatTools(tools: ToolDefinition[]): unknown[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object',
        properties: t.parameters.properties,
        required: t.parameters.required ?? [],
      },
    }))
  }

  formatMessages(messages: Message[]): unknown[] {
    // Convert from OpenAI-intermediate to Anthropic format
    const result: unknown[] = []
    let i = 0

    while (i < messages.length) {
      const msg = messages[i]!

      // Tool results → user role with tool_result blocks
      if (msg.role === 'tool' && msg.toolCallId) {
        const blocks: unknown[] = []
        while (i < messages.length && messages[i]!.role === 'tool') {
          const tm = messages[i]!
          blocks.push({
            type: 'tool_result',
            tool_use_id: tm.toolCallId,
            content: typeof tm.content === 'string' ? tm.content : JSON.stringify(tm.content),
          })
          i++
        }
        result.push({ role: 'user', content: blocks })
        continue
      }

      // Assistant with tool calls → content blocks
      if (msg.role === 'assistant' && msg.toolCalls?.length) {
        const parts: unknown[] = []
        if (typeof msg.content === 'string' && msg.content) {
          parts.push({ type: 'text', text: msg.content })
        }
        for (const tc of msg.toolCalls) {
          parts.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: typeof tc.input === 'string' ? JSON.parse(tc.input || '{}') : tc.input,
          })
        }
        result.push({ role: 'assistant', content: parts })
        i++
        continue
      }

      // Regular text or multimodal
      if (typeof msg.content === 'string') {
        result.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content })
      } else {
        const blocks = msg.content.map((b) => {
          if (b.type === 'text') return { type: 'text', text: b.text }
          if (b.type === 'image') {
            return {
              type: 'image',
              source: { type: 'base64', media_type: b.mediaType, data: b.imageUrl },
            }
          }
          return { type: 'text', text: b.text || '' }
        })
        result.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: blocks })
      }
      i++
    }

    return result
  }

  // ─── Private ───────────────────────────────────────────────────────

  private splitSystem(messages: Message[]): { systemMessage: string; anthropicMessages: Message[] } {
    const systemParts: string[] = []
    const rest: Message[] = []

    if (this.config.systemMessage) systemParts.push(this.config.systemMessage)

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(typeof msg.content === 'string' ? msg.content : '')
      } else {
        rest.push(msg)
      }
    }

    return { systemMessage: systemParts.join('\n\n'), anthropicMessages: rest }
  }

  private buildRequestBody(
    system: string,
    messages: Message[],
    tools?: ToolDefinition[],
    stream = false,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens ?? 8192,
      messages: this.formatMessages(messages),
    }

    if (system) body.system = system
    if (this.config.temperature !== undefined) body.temperature = this.config.temperature
    if (this.config.topP !== undefined) body.top_p = this.config.topP

    if (tools?.length) {
      body.tools = this.formatTools(tools)
    }

    if (stream) body.stream = true

    // Provider-specific options (thinking, caching, etc.)
    if (this.config.options) {
      if (this.config.options.thinking) body.thinking = this.config.options.thinking
      if (this.config.options.betas) body.betas = this.config.options.betas
    }

    return body
  }

  private async request(body: Record<string, unknown>): Promise<Response> {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com'
    const url = `${baseUrl}/v1/messages`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }
    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Anthropic API error ${response.status}: ${errorText}`)
    }

    return response
  }

  private parseResponse(data: any): ProviderResponse {
    const toolCalls: ToolCall[] = []
    let content = ''
    let thinking = ''

    for (const block of data.content ?? []) {
      if (block.type === 'text') content += block.text
      else if (block.type === 'thinking') thinking += block.thinking
      else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input,
          finished: true,
        })
      }
    }

    return {
      content,
      thinking,
      toolCalls,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        cacheReadTokens: data.usage?.cache_read_input_tokens ?? 0,
        cacheWriteTokens: data.usage?.cache_creation_input_tokens ?? 0,
        totalTokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      finishReason: data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      model: data.model || this.config.model,
    }
  }
}
