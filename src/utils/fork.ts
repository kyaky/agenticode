// AGENTICODE: Conversation fork — branch from current session state
// Inspired by Claurst's /branch and /fork commands, and Goose's session fork.
// Creates a new session that starts with the same conversation history
// but diverges from the fork point onwards.

import { SessionID, MessageID } from "./schema.js"

/** Fork configuration */
export interface ForkConfig {
  /** Source session to fork from */
  sourceSessionID: SessionID
  /** Optional: fork from a specific message (default: latest) */
  forkAtMessageID?: MessageID
  /** Title for the forked session */
  title?: string
  /** Optional: only copy the last N messages */
  lastNMessages?: number
}

/** Fork result */
export interface ForkResult {
  /** New session ID */
  sessionID: SessionID
  /** Number of messages copied */
  messagesCopied: number
  /** Message ID at the fork point */
  forkPoint: MessageID
}

/**
 * Build a fork title from the source session.
 */
export function forkTitle(sourceTitle: string | undefined, forkNumber: number): string {
  const base = sourceTitle ?? "Untitled"
  return `${base} (fork #${forkNumber})`
}

/**
 * Build system message indicating this is a forked session.
 */
export function forkSystemMessage(sourceSessionID: SessionID, forkPoint: MessageID): string {
  return [
    "<system-reminder>",
    `This session was forked from session ${sourceSessionID} at message ${forkPoint}.`,
    "The conversation history above is from the original session.",
    "You are now on a new branch — changes here do not affect the original session.",
    "</system-reminder>",
  ].join("\n")
}

/**
 * Validate fork configuration.
 */
export function validateForkConfig(config: ForkConfig): string | null {
  if (!config.sourceSessionID) return "sourceSessionID is required"
  if (config.lastNMessages !== undefined && config.lastNMessages < 0) return "lastNMessages must be non-negative"
  return null
}
