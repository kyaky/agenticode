// AGENTICODE: Checkpoint/Restore — inspired by Cline's shadow git
// Captures workspace snapshots after each tool use, enabling rollback
// to any previous state while preserving conversation context.

import fs from "fs/promises"
import path from "path"
import { Global } from "../utils/envUtils.js"

/** A single checkpoint snapshot */
export interface Checkpoint {
  /** Unique checkpoint ID */
  id: string
  /** Session ID this checkpoint belongs to */
  sessionId: string
  /** Message ID at this checkpoint */
  messageId?: string
  /** Timestamp when checkpoint was created */
  createdAt: number
  /** Description of what happened at this point */
  description: string
  /** List of files that were modified */
  modifiedFiles: string[]
  /** Git commit hash at this point (if in a git repo) */
  gitHash?: string
}

/** Checkpoint store for a session */
export interface CheckpointStore {
  sessionId: string
  checkpoints: Checkpoint[]
}

/** Get the checkpoint directory for a session */
function checkpointDir(sessionId: string): string {
  return path.join(getAgenticodeConfigHomeDir(), "checkpoints", sessionId)
}

/** Get the checkpoint index file path */
function indexPath(sessionId: string): string {
  return path.join(checkpointDir(sessionId), "index.json")
}

export namespace CheckpointManager {
  /** Create a new checkpoint after a tool use */
  export async function create(input: {
    sessionId: string
    messageId?: string
    description: string
    modifiedFiles: string[]
    gitHash?: string
  }): Promise<Checkpoint> {
    const dir = checkpointDir(input.sessionId)
    await fs.mkdir(dir, { recursive: true })

    const checkpoint: Checkpoint = {
      id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId: input.sessionId,
      messageId: input.messageId,
      createdAt: Date.now(),
      description: input.description,
      modifiedFiles: input.modifiedFiles,
      gitHash: input.gitHash,
    }

    // Load existing store
    const store = await load(input.sessionId)
    store.checkpoints.push(checkpoint)

    // Save updated store
    await fs.writeFile(indexPath(input.sessionId), JSON.stringify(store, null, 2))

    // Save file snapshots
    const snapshotDir = path.join(dir, checkpoint.id)
    await fs.mkdir(snapshotDir, { recursive: true })
    for (const file of input.modifiedFiles) {
      try {
        const content = await fs.readFile(file, "utf-8")
        const snapshotPath = path.join(snapshotDir, file.replace(/[/\\:]/g, "_"))
        await fs.writeFile(snapshotPath, content)
      } catch {
        // File might not exist yet (about to be created)
      }
    }

    return checkpoint
  }

  /** List all checkpoints for a session */
  export async function list(sessionId: string): Promise<Checkpoint[]> {
    const store = await load(sessionId)
    return store.checkpoints
  }

  /** Get a specific checkpoint */
  export async function get(sessionId: string, checkpointId: string): Promise<Checkpoint | undefined> {
    const store = await load(sessionId)
    return store.checkpoints.find((c) => c.id === checkpointId)
  }

  /** Get the git restore command for a checkpoint */
  export function restoreCommand(checkpoint: Checkpoint): string | null {
    if (!checkpoint.gitHash) return null
    return `git checkout ${checkpoint.gitHash} -- ${checkpoint.modifiedFiles.map((f) => `"${f}"`).join(" ")}`
  }

  /** Load checkpoint store for a session */
  async function load(sessionId: string): Promise<CheckpointStore> {
    try {
      const content = await fs.readFile(indexPath(sessionId), "utf-8")
      return JSON.parse(content) as CheckpointStore
    } catch {
      return { sessionId, checkpoints: [] }
    }
  }

  /** Delete all checkpoints for a session */
  export async function clear(sessionId: string): Promise<void> {
    try {
      await fs.rm(checkpointDir(sessionId), { recursive: true, force: true })
    } catch {
      // Directory doesn't exist
    }
  }

  /** Get total checkpoint count across all sessions */
  export async function totalCount(): Promise<number> {
    const baseDir = path.join(getAgenticodeConfigHomeDir(), "checkpoints")
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true })
      let total = 0
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const store = await load(entry.name)
          total += store.checkpoints.length
        }
      }
      return total
    } catch {
      return 0
    }
  }
}
