// AGENTICODE: Smart auto-compaction — enhanced token-aware context management
// Builds on OpenCode's existing compaction system with:
// - Configurable threshold (default 80%)
// - Multi-strategy fallback (prune → summarize → truncate)
// - User-visible usage reporting

/** Auto-compaction configuration */
export interface AutoCompactConfig {
  /** Enable auto-compaction (default: true) */
  enabled: boolean
  /** Threshold as fraction of context limit to trigger compaction (default: 0.8) */
  threshold: number
  /** Strategy order: try each until one succeeds */
  strategies: CompactionStrategy[]
  /** Warn the user when usage exceeds this fraction (default: 0.7) */
  warnThreshold: number
}

export type CompactionStrategy = "prune" | "summarize" | "truncate"

/** Default configuration */
export const DEFAULT_AUTO_COMPACT: AutoCompactConfig = {
  enabled: true,
  threshold: 0.8,
  strategies: ["prune", "summarize", "truncate"],
  warnThreshold: 0.7,
}

/** Token usage snapshot */
export interface TokenUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  total: number
  contextLimit: number
  usagePercent: number
}

/** Auto-compaction check result */
export interface CompactCheckResult {
  /** Whether compaction should be triggered */
  shouldCompact: boolean
  /** Whether a warning should be shown to the user */
  shouldWarn: boolean
  /** Current usage information */
  usage: TokenUsage
  /** Which strategy to use */
  strategy?: CompactionStrategy
  /** Human-readable message */
  message?: string
}

/**
 * Calculate token usage from model response tokens.
 */
export function calculateUsage(
  tokens: { input: number; output: number; cache: { read: number; write: number } },
  contextLimit: number,
): TokenUsage {
  const total = tokens.input + tokens.output + tokens.cache.read + tokens.cache.write
  return {
    input: tokens.input,
    output: tokens.output,
    cacheRead: tokens.cache.read,
    cacheWrite: tokens.cache.write,
    total,
    contextLimit,
    usagePercent: contextLimit > 0 ? total / contextLimit : 0,
  }
}

/**
 * Check whether auto-compaction should be triggered.
 */
export function checkAutoCompact(
  usage: TokenUsage,
  config: AutoCompactConfig = DEFAULT_AUTO_COMPACT,
): CompactCheckResult {
  if (!config.enabled) {
    return { shouldCompact: false, shouldWarn: false, usage }
  }

  const shouldWarn = usage.usagePercent >= config.warnThreshold && usage.usagePercent < config.threshold
  const shouldCompact = usage.usagePercent >= config.threshold

  if (shouldCompact) {
    const strategy = config.strategies[0] ?? "prune"
    return {
      shouldCompact: true,
      shouldWarn: false,
      usage,
      strategy,
      message: `Context ${Math.round(usage.usagePercent * 100)}% full (${usage.total}/${usage.contextLimit} tokens). Auto-compacting with ${strategy} strategy.`,
    }
  }

  if (shouldWarn) {
    return {
      shouldCompact: false,
      shouldWarn: true,
      usage,
      message: `Context usage at ${Math.round(usage.usagePercent * 100)}% (${usage.total}/${usage.contextLimit} tokens). Compaction will trigger at ${Math.round(config.threshold * 100)}%.`,
    }
  }

  return { shouldCompact: false, shouldWarn: false, usage }
}

/**
 * Format a compact usage summary for display.
 */
export function formatUsageSummary(usage: TokenUsage): string {
  const pct = Math.round(usage.usagePercent * 100)
  const bar = progressBar(usage.usagePercent, 20)
  return `Context: ${bar} ${pct}% (${formatTokens(usage.total)}/${formatTokens(usage.contextLimit)})`
}

function progressBar(fraction: number, width: number): string {
  const filled = Math.round(fraction * width)
  const empty = width - filled
  return "[" + "#".repeat(filled) + "-".repeat(empty) + "]"
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
