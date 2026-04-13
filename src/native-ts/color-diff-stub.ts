/**
 * ColorDiff stub — replaces native Rust color-diff-napi module.
 * Renders StructuredPatchHunk from 'diff' package as colored terminal lines.
 * Based on ClawCode's approach: simple line-prefix coloring.
 */

// StructuredPatchHunk from 'diff' package looks like:
// { oldStart, oldLines, newStart, newLines, lines: string[] }
// Each line starts with '+', '-', or ' '

interface PatchHunk {
  oldStart?: number
  oldLines?: number
  newStart?: number
  newLines?: number
  lines?: string[]
  linedelimiters?: string[]
}

export class ColorDiff {
  private hunk: PatchHunk
  private firstLine: string | null
  private filePath: string
  private fileContent: string | null

  constructor(patch: any, firstLine: any, filePath: any, fileContent: any) {
    // patch is a StructuredPatchHunk object, not a string
    this.hunk = (patch && typeof patch === 'object') ? patch as PatchHunk : { lines: [] }
    this.firstLine = firstLine != null ? String(firstLine) : null
    this.filePath = String(filePath ?? '')
    this.fileContent = fileContent != null ? String(fileContent) : null
  }

  render(_theme: unknown, width: number, _dim: boolean): string[] | null {
    const lines = this.hunk.lines
    if (!lines || !Array.isArray(lines) || lines.length === 0) return null

    const maxLineNum = Math.max(
      (this.hunk.oldStart ?? 0) + (this.hunk.oldLines ?? 0),
      (this.hunk.newStart ?? 0) + (this.hunk.newLines ?? 0),
      1
    )
    const gutterWidth = String(maxLineNum).length

    let oldLine = this.hunk.oldStart ?? 1
    let newLine = this.hunk.newStart ?? 1
    const result: string[] = []

    for (const line of lines) {
      const prefix = line[0] ?? ' '
      const content = line.slice(1)
      const truncated = content.length > width - gutterWidth - 4
        ? content.slice(0, width - gutterWidth - 7) + '...'
        : content

      if (prefix === '+') {
        const num = String(newLine).padStart(gutterWidth)
        result.push(`\x1b[32m+${num} ${truncated}\x1b[0m`)
        newLine++
      } else if (prefix === '-') {
        const num = String(oldLine).padStart(gutterWidth)
        result.push(`\x1b[31m-${num} ${truncated}\x1b[0m`)
        oldLine++
      } else if (prefix === '\\') {
        // "\ No newline at end of file"
        result.push(`\x1b[2m ${' '.repeat(gutterWidth)} ${truncated}\x1b[0m`)
      } else {
        const num = String(oldLine).padStart(gutterWidth)
        result.push(` ${num} ${truncated}`)
        oldLine++
        newLine++
      }
    }

    return result
  }
}

export class ColorFile {
  public content: string
  constructor(content: any) {
    this.content = typeof content === 'string' ? content : String(content ?? '')
  }
  highlight(_theme: unknown): string[] {
    return this.content.split('\n')
  }
}

export function getSyntaxTheme() { return {} }
export function colorDiff() { return 0 }
export function highlightDiff() { return '' }
