// AGENTICODE: Repo map — simplified code graph inspired by Aider
// Builds a concise map of code structure (functions, classes, exports)
// for injecting into context. Uses regex-based extraction instead of
// tree-sitter for zero-dependency simplicity.

/** A symbol found in a source file */
export interface CodeSymbol {
  name: string
  type: "function" | "class" | "interface" | "type" | "export" | "const" | "method"
  file: string
  line: number
}

/** A file's structure summary */
export interface FileMap {
  path: string
  symbols: CodeSymbol[]
  imports: string[]
  exports: string[]
}

/** Regex patterns for extracting code structure by language */
const PATTERNS: Record<string, RegExp[]> = {
  ts: [
    /^export\s+(?:async\s+)?function\s+(\w+)/gm,
    /^export\s+(?:default\s+)?class\s+(\w+)/gm,
    /^export\s+(?:default\s+)?interface\s+(\w+)/gm,
    /^export\s+type\s+(\w+)/gm,
    /^export\s+const\s+(\w+)/gm,
    /^(?:async\s+)?function\s+(\w+)/gm,
    /^class\s+(\w+)/gm,
    /^interface\s+(\w+)/gm,
  ],
  py: [
    /^def\s+(\w+)/gm,
    /^class\s+(\w+)/gm,
    /^async\s+def\s+(\w+)/gm,
  ],
  go: [
    /^func\s+(\w+)/gm,
    /^func\s+\(\w+\s+\*?\w+\)\s+(\w+)/gm,
    /^type\s+(\w+)\s+struct/gm,
    /^type\s+(\w+)\s+interface/gm,
  ],
  rs: [
    /^pub\s+(?:async\s+)?fn\s+(\w+)/gm,
    /^pub\s+struct\s+(\w+)/gm,
    /^pub\s+enum\s+(\w+)/gm,
    /^pub\s+trait\s+(\w+)/gm,
    /^impl\s+(\w+)/gm,
  ],
  java: [
    /^public\s+(?:static\s+)?(?:final\s+)?class\s+(\w+)/gm,
    /^public\s+interface\s+(\w+)/gm,
    /^public\s+(?:static\s+)?(?:synchronized\s+)?(?:\w+\s+)?(\w+)\s*\(/gm,
  ],
}

/** Map file extension to language key */
function langFromExt(ext: string): string | undefined {
  const map: Record<string, string> = {
    ".ts": "ts", ".tsx": "ts", ".js": "ts", ".jsx": "ts", ".mjs": "ts",
    ".py": "py", ".pyw": "py",
    ".go": "go",
    ".rs": "rs",
    ".java": "java",
    ".kt": "java", ".scala": "java",
  }
  return map[ext]
}

/**
 * Extract code symbols from a file's content.
 */
export function extractSymbols(filePath: string, content: string): CodeSymbol[] {
  const ext = filePath.slice(filePath.lastIndexOf("."))
  const lang = langFromExt(ext)
  if (!lang) return []

  const patterns = PATTERNS[lang]
  if (!patterns) return []

  const symbols: CodeSymbol[] = []
  const lines = content.split("\n")

  for (const pattern of patterns) {
    // Reset regex state
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      const name = match[1]
      if (!name) continue

      // Find line number
      const offset = match.index
      let line = 1
      for (let i = 0; i < offset && i < content.length; i++) {
        if (content[i] === "\n") line++
      }

      // Infer type from match
      const matchText = match[0]
      let type: CodeSymbol["type"] = "function"
      if (matchText.includes("class")) type = "class"
      else if (matchText.includes("interface")) type = "interface"
      else if (matchText.includes("type ")) type = "type"
      else if (matchText.includes("const ")) type = "const"
      else if (matchText.includes("struct") || matchText.includes("enum") || matchText.includes("trait")) type = "class"

      symbols.push({ name, type, file: filePath, line })
    }
  }

  // Deduplicate by name+line
  const seen = new Set<string>()
  return symbols.filter((s) => {
    const key = `${s.name}:${s.line}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Build a concise repo map string for injection into LLM context.
 * Groups symbols by file, showing only signatures.
 */
export function buildRepoMap(files: FileMap[], maxTokens = 4000): string {
  const lines: string[] = ["# Repository Map", ""]

  // Estimate ~4 chars per token
  let charBudget = maxTokens * 4

  for (const file of files) {
    if (file.symbols.length === 0) continue
    if (charBudget <= 0) break

    const header = `## ${file.path}`
    const symbolLines = file.symbols.map((s) => `  ${s.type} ${s.name} (line ${s.line})`)
    const block = [header, ...symbolLines, ""].join("\n")

    if (block.length > charBudget) break
    charBudget -= block.length
    lines.push(block)
  }

  return lines.join("\n")
}

/**
 * Rank files by relevance to a query using simple keyword matching.
 * More sophisticated ranking (PageRank, embeddings) can be added later.
 */
export function rankFiles(files: FileMap[], query: string): FileMap[] {
  const keywords = query.toLowerCase().split(/\s+/)

  const scored = files.map((file) => {
    let score = 0
    const pathLower = file.path.toLowerCase()
    const symbolNames = file.symbols.map((s) => s.name.toLowerCase())

    for (const kw of keywords) {
      // File path match
      if (pathLower.includes(kw)) score += 5
      // Symbol name match
      for (const sym of symbolNames) {
        if (sym.includes(kw)) score += 10
        if (sym === kw) score += 20
      }
    }

    // Boost files with more exports
    score += file.exports.length

    return { file, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.file)
}
