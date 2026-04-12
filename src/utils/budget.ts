// AGENTICODE: Session budget tracking — token and cost limits
// Inspired by Goose and ClawCode's multi-tier budget systems.
// Provides configurable limits per session to prevent runaway costs.

/** Budget configuration */
export interface BudgetConfig {
  /** Maximum input tokens per session (0 = unlimited) */
  maxInputTokens?: number
  /** Maximum output tokens per session (0 = unlimited) */
  maxOutputTokens?: number
  /** Maximum total tokens per session (0 = unlimited) */
  maxTotalTokens?: number
  /** Maximum cost in USD per session (0 = unlimited) */
  maxCostUsd?: number
  /** Maximum number of tool calls per session (0 = unlimited) */
  maxToolCalls?: number
  /** Maximum number of model turns per session (0 = unlimited) */
  maxTurns?: number
  /** Warning threshold (0-1, fraction of limit to warn at, default 0.8) */
  warnThreshold?: number
}

/** Current usage tracking */
export interface BudgetUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
  toolCalls: number
  turns: number
}

/** Budget check result */
export interface BudgetCheckResult {
  allowed: boolean
  reason?: string
  warning?: string
  usage: BudgetUsage
}

/** Default budget — no limits */
export const DEFAULT_BUDGET: BudgetConfig = {
  maxInputTokens: 0,
  maxOutputTokens: 0,
  maxTotalTokens: 0,
  maxCostUsd: 0,
  maxToolCalls: 0,
  maxTurns: 0,
  warnThreshold: 0.8,
}

/**
 * Session budget tracker.
 * Tracks token usage and cost, enforces configurable limits.
 */
export class SessionBudget {
  private config: Required<BudgetConfig>
  private usage: BudgetUsage

  constructor(config?: BudgetConfig) {
    this.config = { ...DEFAULT_BUDGET, ...config } as Required<BudgetConfig>
    this.usage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      toolCalls: 0,
      turns: 0,
    }
  }

  /** Record token usage from a model call */
  recordUsage(input: { inputTokens?: number; outputTokens?: number; costUsd?: number }): void {
    this.usage.inputTokens += input.inputTokens ?? 0
    this.usage.outputTokens += input.outputTokens ?? 0
    this.usage.totalTokens += (input.inputTokens ?? 0) + (input.outputTokens ?? 0)
    this.usage.costUsd += input.costUsd ?? 0
    this.usage.turns++
  }

  /** Record a tool call */
  recordToolCall(): void {
    this.usage.toolCalls++
  }

  /** Check if the next action is within budget */
  check(): BudgetCheckResult {
    const c = this.config
    const u = this.usage
    const threshold = c.warnThreshold

    // Hard limits
    if (c.maxInputTokens > 0 && u.inputTokens >= c.maxInputTokens) {
      return { allowed: false, reason: `Input token limit reached (${u.inputTokens}/${c.maxInputTokens})`, usage: { ...u } }
    }
    if (c.maxOutputTokens > 0 && u.outputTokens >= c.maxOutputTokens) {
      return { allowed: false, reason: `Output token limit reached (${u.outputTokens}/${c.maxOutputTokens})`, usage: { ...u } }
    }
    if (c.maxTotalTokens > 0 && u.totalTokens >= c.maxTotalTokens) {
      return { allowed: false, reason: `Total token limit reached (${u.totalTokens}/${c.maxTotalTokens})`, usage: { ...u } }
    }
    if (c.maxCostUsd > 0 && u.costUsd >= c.maxCostUsd) {
      return { allowed: false, reason: `Cost limit reached ($${u.costUsd.toFixed(4)}/$${c.maxCostUsd})`, usage: { ...u } }
    }
    if (c.maxToolCalls > 0 && u.toolCalls >= c.maxToolCalls) {
      return { allowed: false, reason: `Tool call limit reached (${u.toolCalls}/${c.maxToolCalls})`, usage: { ...u } }
    }
    if (c.maxTurns > 0 && u.turns >= c.maxTurns) {
      return { allowed: false, reason: `Turn limit reached (${u.turns}/${c.maxTurns})`, usage: { ...u } }
    }

    // Warnings
    const warnings: string[] = []
    if (c.maxTotalTokens > 0 && u.totalTokens >= c.maxTotalTokens * threshold) {
      warnings.push(`${Math.round((u.totalTokens / c.maxTotalTokens) * 100)}% of token budget used`)
    }
    if (c.maxCostUsd > 0 && u.costUsd >= c.maxCostUsd * threshold) {
      warnings.push(`${Math.round((u.costUsd / c.maxCostUsd) * 100)}% of cost budget used`)
    }
    if (c.maxTurns > 0 && u.turns >= c.maxTurns * threshold) {
      warnings.push(`${Math.round((u.turns / c.maxTurns) * 100)}% of turn budget used`)
    }

    return {
      allowed: true,
      warning: warnings.length > 0 ? warnings.join("; ") : undefined,
      usage: { ...u },
    }
  }

  /** Get current usage snapshot */
  getUsage(): BudgetUsage {
    return { ...this.usage }
  }

  /** Get budget config */
  getConfig(): Required<BudgetConfig> {
    return { ...this.config }
  }

  /** Reset usage counters (e.g., for a new session) */
  reset(): void {
    this.usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, costUsd: 0, toolCalls: 0, turns: 0 }
  }
}
