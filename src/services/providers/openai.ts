/**
 * OpenAI Provider — handles OpenAI and all OpenAI-compatible APIs.
 * Ported from ClawCode's OpenAIProvider pattern.
 *
 * Covers: OpenAI, Azure, Groq, DeepSeek, Mistral, xAI, OpenRouter,
 * LM Studio, Ollama, and any OpenAI-compatible endpoint.
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

export class OpenAIProvider implements BaseProvider {
  readonly providerId: string
  private config: ProviderConfig

  constructor(config: ProviderConfig) {
    this.providerId = config.providerId || 'openai'
    this.config = config
  }

  async sendMessages(messages: Message[], tools?: ToolDefinition[]): Promise<ProviderResponse> {
    const body = this.buildRequestBody(messages, tools, false)
    const response = await this.request('/chat/completions', body)
    return this.parseResponse(response)
  }

  async *streamResponse(messages: Message[], tools?: ToolDefinition[]): AsyncGenerator<ProviderEvent> {
    const body = this.buildRequestBody(messages, tools, true)
    const response = await this.request('/chat/completions', body, true)

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''
    let content = ''
    let thinking = ''
    const toolCalls = new Map<number, ToolCall>()
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
          if (data === '[DONE]') continue

          try {
            const chunk = JSON.parse(data)
            const delta = chunk.choices?.[0]?.delta

            if (!delta) {
              // Usage info in final chunk
              if (chunk.usage) {
                usage = {
                  inputTokens: chunk.usage.prompt_tokens ?? 0,
                  outputTokens: chunk.usage.completion_tokens ?? 0,
                  cacheReadTokens: chunk.usage.prompt_tokens_details?.cached_tokens ?? 0,
                  cacheWriteTokens: 0,
                  totalTokens: chunk.usage.total_tokens ?? 0,
                }
              }
              continue
            }

            // Content delta
            if (delta.content) {
              content += delta.content
              yield { type: 'content_delta', content: delta.content }
            }

            // Reasoning/thinking delta (o1/o3 models)
            if (delta.reasoning_content) {
              thinking += delta.reasoning_content
              yield { type: 'thinking_delta', thinking: delta.reasoning_content }
            }

            // Tool call deltas
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0
                const existing = toolCalls.get(idx)

                if (tc.function?.name) {
                  // New tool call start
                  const call: ToolCall = {
                    id: tc.id || `call_${idx}`,
                    name: tc.function.name,
                    input: tc.function.arguments || '',
                    finished: false,
                  }
                  toolCalls.set(idx, call)
                  yield { type: 'tool_use_start', toolCall: call }
                } else if (existing && tc.function?.arguments) {
                  // Append to existing tool call arguments
                  existing.input = (existing.input as string) + tc.function.arguments
                  yield { type: 'tool_use_delta', toolCall: existing }
                }
              }
            }

            // Finish reason
            if (chunk.choices?.[0]?.finish_reason) {
              // Mark all tool calls as finished
              for (const [, tc] of toolCalls) {
                tc.finished = true
                yield { type: 'tool_use_stop', toolCall: tc }
              }
            }
          } catch {
            // Skip unparseable chunks
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
        toolCalls: Array.from(toolCalls.values()),
        usage,
        finishReason: toolCalls.size > 0 ? 'tool_calls' : 'stop',
        model: this.config.model,
      },
    }
  }

  formatTools(tools: ToolDefinition[]): unknown[] {
    return tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: t.parameters.properties,
          required: t.parameters.required ?? [],
        },
      },
    }))
  }

  formatMessages(messages: Message[]): unknown[] {
    return messages.map((msg) => {
      // Tool result
      if (msg.role === 'tool' && msg.toolCallId) {
        return {
          role: 'tool',
          tool_call_id: msg.toolCallId,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        }
      }

      // Assistant with tool calls
      if (msg.role === 'assistant' && msg.toolCalls?.length) {
        return {
          role: 'assistant',
          content: typeof msg.content === 'string' ? msg.content : null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
            },
          })),
        }
      }

      // Regular message (string or multimodal)
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content }
      }

      // Multimodal content blocks
      const parts = msg.content.map((block) => {
        if (block.type === 'text') return { type: 'text', text: block.text }
        if (block.type === 'image') {
          return {
            type: 'image_url',
            image_url: { url: block.imageUrl },
          }
        }
        if (block.type === 'file') {
          return { type: 'text', text: `--- File: ${block.toolName} ---\n${block.text}\n---` }
        }
        return { type: 'text', text: block.text || '' }
      })
      return { role: msg.role, content: parts }
    })
  }

  // ─── Private ───────────────────────────────────────────────────────

  private buildRequestBody(messages: Message[], tools?: ToolDefinition[], stream = false): Record<string, unknown> {
    // Extract system message
    const systemMessages = messages.filter((m) => m.role === 'system')
    const nonSystemMessages = messages.filter((m) => m.role !== 'system')

    const systemContent = [
      this.config.systemMessage,
      ...systemMessages.map((m) => (typeof m.content === 'string' ? m.content : '')),
    ]
      .filter(Boolean)
      .join('\n\n')

    const formattedMessages = this.formatMessages(
      systemContent ? [{ role: 'system' as const, content: systemContent }, ...nonSystemMessages] : nonSystemMessages,
    )

    const body: Record<string, unknown> = {
      model: this.config.model,
      messages: formattedMessages,
      max_tokens: this.config.maxTokens ?? 4096,
    }

    if (this.config.temperature !== undefined) body.temperature = this.config.temperature
    if (this.config.topP !== undefined) body.top_p = this.config.topP

    if (tools?.length) {
      body.tools = this.formatTools(tools)
      body.tool_choice = 'auto'
    }

    if (stream) {
      body.stream = true
      body.stream_options = { include_usage: true }
    }

    // Apply provider-specific options
    if (this.config.options) Object.assign(body, this.config.options)

    return body
  }

  private async request(path: string, body: Record<string, unknown>, stream = false): Promise<Response> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1'
    const url = `${baseUrl}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`${this.providerId} API error ${response.status}: ${errorText}`)
    }

    return response
  }

  private parseResponse(response: Response): Promise<ProviderResponse> {
    return response.json().then((data: any) => {
      const choice = data.choices?.[0]
      const message = choice?.message
      const usage = data.usage

      const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc: any, i: number) => ({
        id: tc.id || `call_${i}`,
        name: tc.function?.name || '',
        input: tc.function?.arguments || '{}',
        finished: true,
      }))

      return {
        content: message?.content || '',
        thinking: message?.reasoning_content || '',
        toolCalls,
        usage: {
          inputTokens: usage?.prompt_tokens ?? 0,
          outputTokens: usage?.completion_tokens ?? 0,
          cacheReadTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
          cacheWriteTokens: 0,
          totalTokens: usage?.total_tokens ?? 0,
        },
        finishReason: choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
        model: data.model || this.config.model,
      }
    })
  }
}
