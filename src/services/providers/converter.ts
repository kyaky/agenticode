/**
 * Message Format Converter — bridges internal AgentiCode messages with provider formats.
 * Following ClawCode's pattern: Internal ContentPart[] → OpenAI intermediate → Provider-specific
 *
 * This converter handles the translation between AgentiCode's existing message types
 * (which were originally Anthropic-shaped) and the unified provider format.
 */

import type { Message, ContentBlock, ToolCall } from './types.js'

// ─── Internal → Universal (OpenAI-compatible intermediate) ───────────

/**
 * Convert an array of Anthropic-style content blocks to universal Message format.
 * Handles: text, tool_use, tool_result, image, thinking blocks.
 */
export function fromAnthropicContent(
  role: 'user' | 'assistant',
  content: string | Array<Record<string, any>>,
  extra?: { thinking?: string },
): Message {
  if (typeof content === 'string') {
    return { role, content, thinking: extra?.thinking }
  }

  const blocks: ContentBlock[] = []
  const toolCalls: ToolCall[] = []

  for (const block of content) {
    switch (block.type) {
      case 'text':
        blocks.push({ type: 'text', text: block.text })
        break
      case 'thinking':
        // Accumulate thinking into message-level thinking
        break
      case 'tool_use':
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input,
          finished: true,
        })
        break
      case 'tool_result':
        blocks.push({
          type: 'tool_result',
          toolCallId: block.tool_use_id,
          text: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
        })
        break
      case 'image':
        blocks.push({
          type: 'image',
          imageUrl: block.source?.data,
          mediaType: block.source?.media_type,
        })
        break
      default:
        if (block.text) blocks.push({ type: 'text', text: block.text })
    }
  }

  // If we have only text blocks, flatten to string
  const textOnly = blocks.every((b) => b.type === 'text')
  const thinking = content.filter((b: any) => b.type === 'thinking').map((b: any) => b.thinking).join('')

  if (textOnly && blocks.length > 0 && toolCalls.length === 0) {
    return {
      role,
      content: blocks.map((b) => b.text).join(''),
      thinking: thinking || extra?.thinking,
    }
  }

  return {
    role,
    content: blocks.length > 0 ? blocks : '',
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    thinking: thinking || extra?.thinking,
  }
}

/**
 * Convert an Anthropic tool_result back to a universal tool message.
 */
export function fromAnthropicToolResult(toolCallId: string, content: string, isError = false): Message {
  return {
    role: 'tool',
    content: isError ? `Error: ${content}` : content,
    toolCallId,
  }
}

// ─── Universal → OpenAI format ───────────────────────────────────────

/**
 * Convert universal messages to OpenAI API format.
 * This is the "universal intermediate" per ClawCode's pattern.
 */
export function toOpenAIMessages(messages: Message[]): Record<string, any>[] {
  return messages.map((msg) => {
    if (msg.role === 'tool' && msg.toolCallId) {
      return {
        role: 'tool',
        tool_call_id: msg.toolCallId,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }
    }

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

    if (typeof msg.content === 'string') {
      return { role: msg.role, content: msg.content }
    }

    // Multimodal content blocks
    const parts = (msg.content as ContentBlock[]).map((b) => {
      if (b.type === 'text') return { type: 'text', text: b.text }
      if (b.type === 'image') return { type: 'image_url', image_url: { url: b.imageUrl } }
      return { type: 'text', text: b.text || '' }
    })
    return { role: msg.role, content: parts }
  })
}

// ─── Universal → Anthropic format ────────────────────────────────────

/**
 * Convert universal messages to Anthropic API format.
 * Key differences from OpenAI:
 * - System message is extracted to top-level
 * - Tool results use user role with tool_result blocks
 * - Tool calls use assistant role with tool_use blocks
 */
export function toAnthropicMessages(messages: Message[]): {
  system: string
  messages: Record<string, any>[]
} {
  const systemParts: string[] = []
  const result: Record<string, any>[] = []
  let i = 0

  // Extract system messages
  while (i < messages.length) {
    if (messages[i]!.role === 'system') {
      const content = messages[i]!.content
      systemParts.push(typeof content === 'string' ? content : '')
      i++
    } else break
  }

  // Convert remaining messages
  while (i < messages.length) {
    const msg = messages[i]!

    if (msg.role === 'system') {
      systemParts.push(typeof msg.content === 'string' ? msg.content : '')
      i++
      continue
    }

    // Tool results → user role with tool_result blocks
    if (msg.role === 'tool' && msg.toolCallId) {
      const blocks: any[] = []
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

    // Assistant with tool calls
    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      const parts: any[] = []
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

    // Regular message
    result.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: typeof msg.content === 'string' ? msg.content : msg.content,
    })
    i++
  }

  return { system: systemParts.join('\n\n'), messages: result }
}

// ─── Universal → Gemini format ───────────────────────────────────────

/**
 * Convert universal messages to Google Gemini format.
 */
export function toGeminiMessages(messages: Message[]): Record<string, any>[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((msg) => {
      const role = msg.role === 'user' ? 'user' : 'model'
      if (typeof msg.content === 'string') {
        return { role, parts: [{ text: msg.content }] }
      }
      const parts = (msg.content as ContentBlock[]).map((b) => {
        if (b.type === 'text') return { text: b.text }
        if (b.type === 'image') return { inline_data: { mime_type: b.mediaType, data: b.imageUrl } }
        return { text: b.text || '' }
      })
      return { role, parts }
    })
}
