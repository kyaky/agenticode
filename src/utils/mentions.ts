/**
 * @-Mentions Context System — inspired by Cursor's @file/@codebase pattern.
 *
 * Allows users to reference files, symbols, and context sources inline:
 *   @file src/auth.ts        → attach file content
 *   @symbol handleLogin      → find and attach symbol definition
 *   @git HEAD~3              → attach recent git diff
 *   @url https://docs.com    → fetch and attach web content
 *   @search "auth bug"       → search codebase and attach results
 *   @tree src/               → attach directory tree
 */

import { readFile, readdir, stat } from 'fs/promises'
import { join, relative } from 'path'

/** A resolved @-mention context item */
export interface MentionContext {
  type: 'file' | 'symbol' | 'git' | 'url' | 'search' | 'tree'
  reference: string
  content: string
  /** Token estimate (~4 chars per token) */
  tokenEstimate: number
}

/** Parse @-mentions from user input */
export function parseMentions(input: string): { cleanInput: string; mentions: ParsedMention[] } {
  const mentions: ParsedMention[] = []
  const regex = /@(file|symbol|git|url|search|tree)\s+("[^"]+"|[^\s]+)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(input)) !== null) {
    const type = match[1] as ParsedMention['type']
    const ref = match[2]!.replace(/^"|"$/g, '')
    mentions.push({ type, reference: ref, raw: match[0] })
  }

  // Remove mentions from input
  const cleanInput = input.replace(regex, '').replace(/\s+/g, ' ').trim()

  return { cleanInput, mentions }
}

interface ParsedMention {
  type: 'file' | 'symbol' | 'git' | 'url' | 'search' | 'tree'
  reference: string
  raw: string
}

/** Resolve a @file mention — read file content */
export async function resolveFileMention(filePath: string, cwd: string): Promise<MentionContext> {
  const fullPath = filePath.startsWith('/') ? filePath : join(cwd, filePath)
  try {
    const content = await readFile(fullPath, 'utf-8')
    return {
      type: 'file',
      reference: filePath,
      content: `--- File: ${filePath} ---\n${content}\n--- End ---`,
      tokenEstimate: Math.ceil(content.length / 4),
    }
  } catch {
    return {
      type: 'file',
      reference: filePath,
      content: `[File not found: ${filePath}]`,
      tokenEstimate: 10,
    }
  }
}

/** Resolve a @tree mention — directory listing */
export async function resolveTreeMention(dirPath: string, cwd: string, maxDepth = 3): Promise<MentionContext> {
  const fullPath = dirPath.startsWith('/') ? dirPath : join(cwd, dirPath)
  const lines: string[] = [`--- Tree: ${dirPath} ---`]

  async function walk(dir: string, prefix: string, depth: number): Promise<void> {
    if (depth > maxDepth) return
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      const sorted = entries
        .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
          return a.name.localeCompare(b.name)
        })

      for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i]!
        const isLast = i === sorted.length - 1
        const connector = isLast ? '└── ' : '├── '
        const childPrefix = isLast ? '    ' : '│   '
        lines.push(`${prefix}${connector}${entry.name}${entry.isDirectory() ? '/' : ''}`)
        if (entry.isDirectory()) {
          await walk(join(dir, entry.name), prefix + childPrefix, depth + 1)
        }
      }
    } catch {
      lines.push(`${prefix}[unreadable]`)
    }
  }

  await walk(fullPath, '', 0)
  lines.push('--- End ---')
  const content = lines.join('\n')

  return {
    type: 'tree',
    reference: dirPath,
    content,
    tokenEstimate: Math.ceil(content.length / 4),
  }
}

/** Resolve a @git mention — git diff/log */
export async function resolveGitMention(ref: string): Promise<MentionContext> {
  // This returns a placeholder — actual git execution happens via bash tool
  return {
    type: 'git',
    reference: ref,
    content: `[Run: git diff ${ref} or git log ${ref}]`,
    tokenEstimate: 10,
  }
}

/** Resolve all mentions in a message */
export async function resolveMentions(
  mentions: ParsedMention[],
  cwd: string,
): Promise<MentionContext[]> {
  const results: MentionContext[] = []

  for (const m of mentions) {
    switch (m.type) {
      case 'file':
        results.push(await resolveFileMention(m.reference, cwd))
        break
      case 'tree':
        results.push(await resolveTreeMention(m.reference, cwd))
        break
      case 'git':
        results.push(await resolveGitMention(m.reference))
        break
      default:
        results.push({
          type: m.type,
          reference: m.reference,
          content: `[@${m.type} ${m.reference} — resolve at runtime]`,
          tokenEstimate: 10,
        })
    }
  }

  return results
}

/** Format resolved mentions for injection into user message */
export function formatMentionsForPrompt(contexts: MentionContext[]): string {
  if (contexts.length === 0) return ''
  return contexts.map((c) => c.content).join('\n\n')
}
