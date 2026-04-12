// AGENTICODE: Git auto-commit — inspired by Aider
// Automatically commits file changes after each edit with contextual messages.
// Every AI edit becomes a traceable git commit, making history fully auditable.

/** Auto-commit configuration */
export interface AutoCommitConfig {
  /** Whether auto-commit is enabled (default: false) */
  enabled: boolean
  /** Prefix for auto-commit messages (default: "agenticode: ") */
  prefix?: string
  /** Whether to include file names in commit message (default: true) */
  includeFiles?: boolean
  /** Max files to list in commit message (default: 5) */
  maxFilesList?: number
}

export const DEFAULT_AUTO_COMMIT: AutoCommitConfig = {
  enabled: false,
  prefix: "agenticode: ",
  includeFiles: true,
  maxFilesList: 5,
}

/**
 * Build a contextual commit message from the edit context.
 * @param action - What was done (e.g., "edit", "create", "delete")
 * @param files - List of affected file paths
 * @param description - Optional human-readable description of the change
 */
export function buildCommitMessage(
  config: AutoCommitConfig,
  action: string,
  files: string[],
  description?: string,
): string {
  const prefix = config.prefix ?? "agenticode: "
  const parts: string[] = [prefix]

  if (description) {
    parts.push(description)
  } else {
    parts.push(action)
    if (config.includeFiles && files.length > 0) {
      const maxFiles = config.maxFilesList ?? 5
      const listed = files.slice(0, maxFiles).map((f) => f.split("/").pop() || f)
      parts.push(listed.join(", "))
      if (files.length > maxFiles) {
        parts.push(`(+${files.length - maxFiles} more)`)
      }
    }
  }

  return parts.join(" ")
}

/**
 * Check if a directory is a git repo and has changes to commit.
 */
export function buildAutoCommitCommand(files: string[], message: string): string {
  const safeMessage = message.replace(/"/g, '\\"')
  const addFiles = files.map((f) => `"${f}"`).join(" ")
  return `git add ${addFiles} && git commit -m "${safeMessage}"`
}

/**
 * Determine the action type from tool context.
 */
export function inferAction(toolName: string): string {
  switch (toolName) {
    case "edit":
      return "edit"
    case "write":
      return "create"
    case "bash":
      return "run"
    default:
      return "update"
  }
}
