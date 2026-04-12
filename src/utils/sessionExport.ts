/**
 * Session Replay & Export — save conversations for sharing/review.
 * Inspired by OpenCode's session persistence and Cline's checkpoint system.
 *
 * Exports: Markdown, JSON, HTML formats.
 */

import { writeFile } from 'fs/promises'

/** A message in the export format */
export interface ExportMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp?: number
  toolName?: string
  toolCallId?: string
  tokens?: { input: number; output: number }
  cost?: number
}

/** Export metadata */
export interface ExportMetadata {
  sessionId: string
  title?: string
  model: string
  provider: string
  startTime: number
  endTime: number
  totalMessages: number
  totalTokens: { input: number; output: number }
  totalCost: number
}

/** Full session export */
export interface SessionExport {
  metadata: ExportMetadata
  messages: ExportMessage[]
}

/**
 * Export session as Markdown.
 */
export function toMarkdown(session: SessionExport): string {
  const lines: string[] = [
    `# ${session.metadata.title || 'AgentiCode Session'}`,
    '',
    `**Model:** ${session.metadata.provider}/${session.metadata.model}`,
    `**Date:** ${new Date(session.metadata.startTime).toISOString()}`,
    `**Messages:** ${session.metadata.totalMessages}`,
    `**Tokens:** ${session.metadata.totalTokens.input + session.metadata.totalTokens.output}`,
    `**Cost:** $${session.metadata.totalCost.toFixed(4)}`,
    '',
    '---',
    '',
  ]

  for (const msg of session.messages) {
    const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1)
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''

    if (msg.role === 'user') {
      lines.push(`## User ${time ? `(${time})` : ''}`, '', msg.content, '', '---', '')
    } else if (msg.role === 'assistant') {
      lines.push(`## Assistant ${time ? `(${time})` : ''}`, '', msg.content, '', '---', '')
    } else if (msg.role === 'tool') {
      lines.push(
        `<details><summary>Tool: ${msg.toolName || 'unknown'}</summary>`,
        '',
        '```',
        msg.content.slice(0, 500),
        msg.content.length > 500 ? '... (truncated)' : '',
        '```',
        '</details>',
        '',
      )
    }
  }

  return lines.join('\n')
}

/**
 * Export session as JSON.
 */
export function toJSON(session: SessionExport): string {
  return JSON.stringify(session, null, 2)
}

/**
 * Export session as minimal HTML.
 */
export function toHTML(session: SessionExport): string {
  const title = session.metadata.title || 'AgentiCode Session'
  const messages = session.messages
    .map((msg) => {
      const cls = msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'tool'
      const content = msg.content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
      return `<div class="${cls}"><strong>${msg.role}:</strong><br>${content}</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body { font-family: system-ui; max-width: 800px; margin: 0 auto; padding: 20px; background: #0f1923; color: #e0e8f0; }
.user { background: #1c2e42; padding: 12px; border-radius: 8px; margin: 8px 0; border-left: 3px solid #4da6ff; }
.assistant { background: #152233; padding: 12px; border-radius: 8px; margin: 8px 0; border-left: 3px solid #66d9a0; }
.tool { background: #1a1a2e; padding: 8px; border-radius: 4px; margin: 4px 0; font-size: 0.85em; opacity: 0.7; }
</style></head>
<body><h1>${title}</h1>
<p>Model: ${session.metadata.provider}/${session.metadata.model} | Messages: ${session.metadata.totalMessages} | Cost: $${session.metadata.totalCost.toFixed(4)}</p>
<hr>
${messages}
</body></html>`
}

/**
 * Save session export to file.
 */
export async function saveExport(
  session: SessionExport,
  filePath: string,
  format: 'markdown' | 'json' | 'html' = 'markdown',
): Promise<void> {
  let content: string
  switch (format) {
    case 'markdown':
      content = toMarkdown(session)
      break
    case 'json':
      content = toJSON(session)
      break
    case 'html':
      content = toHTML(session)
      break
  }
  await writeFile(filePath, content, 'utf-8')
}
