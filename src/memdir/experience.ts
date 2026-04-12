// AGENTICODE: Experience learning system (ECAP) — inspired by ClawCode
// Automatically extracts reusable knowledge from tool execution traces.
// Learns from successes AND failures to improve future performance.

import fs from "fs/promises"
import path from "path"
import { Global } from "../utils/envUtils.js"

/** An experience capsule — a reusable insight extracted from execution */
export interface ExperienceCapsule {
  /** Unique ID */
  id: string
  /** What was learned */
  insight: string
  /** Category of experience */
  category: ExperienceCategory
  /** Context that triggered this learning */
  trigger: {
    /** Tool that was used */
    tool: string
    /** What the user asked */
    task: string
    /** Whether the action succeeded or failed */
    outcome: "success" | "failure"
  }
  /** How confident we are in this experience (0-1) */
  confidence: number
  /** How many times this experience has been applied */
  applyCount: number
  /** When this was created */
  createdAt: number
  /** When this was last applied */
  lastApplied?: number
  /** Tags for filtering */
  tags: string[]
}

export type ExperienceCategory =
  | "error-pattern"    // Learned from a recurring error
  | "fix-recipe"       // Known fix for a specific issue
  | "best-practice"    // Good pattern observed from success
  | "anti-pattern"     // Bad pattern observed from failure
  | "tool-usage"       // How to use a specific tool effectively
  | "project-specific" // Specific to current project

/** Experience store for a project */
export interface ExperienceStore {
  capsules: ExperienceCapsule[]
  version: number
}

/** Get experience store path for a project */
function storePath(projectDir: string): string {
  const slug = projectDir.replace(/[<>:"|?*\\/]/g, "_").slice(0, 200)
  return path.join(getAgenticodeConfigHomeDir(), "projects", slug, "experience.json")
}

export namespace Experience {
  /** Load all experience capsules for a project */
  export async function load(projectDir: string): Promise<ExperienceCapsule[]> {
    try {
      const content = await fs.readFile(storePath(projectDir), "utf-8")
      const store = JSON.parse(content) as ExperienceStore
      return store.capsules
    } catch {
      return []
    }
  }

  /** Save experience capsules */
  async function save(projectDir: string, capsules: ExperienceCapsule[]): Promise<void> {
    const filepath = storePath(projectDir)
    await fs.mkdir(path.dirname(filepath), { recursive: true })
    const store: ExperienceStore = { capsules, version: 1 }
    await fs.writeFile(filepath, JSON.stringify(store, null, 2))
  }

  /** Record a new experience from a tool execution */
  export async function record(
    projectDir: string,
    input: {
      insight: string
      category: ExperienceCategory
      tool: string
      task: string
      outcome: "success" | "failure"
      tags?: string[]
    },
  ): Promise<ExperienceCapsule> {
    const capsules = await load(projectDir)

    // Check for duplicate insights
    const existing = capsules.find((c) => c.insight === input.insight && c.trigger.tool === input.tool)
    if (existing) {
      existing.confidence = Math.min(1, existing.confidence + 0.1)
      existing.applyCount++
      existing.lastApplied = Date.now()
      await save(projectDir, capsules)
      return existing
    }

    const capsule: ExperienceCapsule = {
      id: `ecap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      insight: input.insight,
      category: input.category,
      trigger: {
        tool: input.tool,
        task: input.task,
        outcome: input.outcome,
      },
      confidence: input.outcome === "success" ? 0.7 : 0.5,
      applyCount: 0,
      createdAt: Date.now(),
      tags: input.tags ?? [],
    }

    capsules.push(capsule)
    await save(projectDir, capsules)
    return capsule
  }

  /** Find relevant experiences for a given task/tool context */
  export async function findRelevant(
    projectDir: string,
    context: { tool?: string; task?: string; tags?: string[] },
    limit = 5,
  ): Promise<ExperienceCapsule[]> {
    const capsules = await load(projectDir)
    if (capsules.length === 0) return []

    // Score each capsule by relevance
    const scored = capsules.map((c) => {
      let score = c.confidence

      // Tool match
      if (context.tool && c.trigger.tool === context.tool) score += 0.3

      // Task keyword match
      if (context.task) {
        const taskWords = context.task.toLowerCase().split(/\s+/)
        const insightWords = c.insight.toLowerCase().split(/\s+/)
        const overlap = taskWords.filter((w) => insightWords.some((iw) => iw.includes(w) || w.includes(iw)))
        score += overlap.length * 0.1
      }

      // Tag match
      if (context.tags) {
        const tagMatch = context.tags.filter((t) => c.tags.includes(t))
        score += tagMatch.length * 0.2
      }

      // Decay: reduce score for old, unused capsules
      const ageMs = Date.now() - (c.lastApplied ?? c.createdAt)
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      if (ageDays > 30) score *= 0.8
      if (ageDays > 90) score *= 0.6

      return { capsule: c, score }
    })

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter((s) => s.score > 0.3)
      .map((s) => s.capsule)
  }

  /** Build a prompt section from relevant experiences */
  export function buildExperiencePrompt(capsules: ExperienceCapsule[]): string | null {
    if (capsules.length === 0) return null

    const lines: string[] = [
      "# Learned Experiences",
      "",
      "The following insights were learned from previous sessions in this project:",
      "",
    ]

    for (const c of capsules) {
      const icon = c.trigger.outcome === "success" ? "+" : "!"
      lines.push(`- [${icon}] ${c.insight}`)
      if (c.category === "error-pattern" || c.category === "anti-pattern") {
        lines.push(`  (Learned from ${c.trigger.outcome} with ${c.trigger.tool})`)
      }
    }

    lines.push("")
    return lines.join("\n")
  }

  /** Mark a capsule as applied (boosts confidence) */
  export async function markApplied(projectDir: string, capsuleId: string): Promise<void> {
    const capsules = await load(projectDir)
    const capsule = capsules.find((c) => c.id === capsuleId)
    if (capsule) {
      capsule.applyCount++
      capsule.lastApplied = Date.now()
      capsule.confidence = Math.min(1, capsule.confidence + 0.05)
      await save(projectDir, capsules)
    }
  }

  /** Remove a capsule (user disagreed with it) */
  export async function remove(projectDir: string, capsuleId: string): Promise<void> {
    const capsules = await load(projectDir)
    const filtered = capsules.filter((c) => c.id !== capsuleId)
    await save(projectDir, filtered)
  }

  /** Get statistics about the experience store */
  export async function stats(projectDir: string): Promise<{
    total: number
    byCategory: Record<string, number>
    avgConfidence: number
  }> {
    const capsules = await load(projectDir)
    const byCategory: Record<string, number> = {}
    let totalConf = 0

    for (const c of capsules) {
      byCategory[c.category] = (byCategory[c.category] ?? 0) + 1
      totalConf += c.confidence
    }

    return {
      total: capsules.length,
      byCategory,
      avgConfidence: capsules.length > 0 ? totalConf / capsules.length : 0,
    }
  }
}
