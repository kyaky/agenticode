// AGENTICODE: Auto-lint and auto-test loop — inspired by Aider
// After each file edit, optionally runs linter and/or test suite,
// then feeds errors back for automatic fix attempts.

/** Lint/test configuration per project */
export interface AutoFixConfig {
  /** Lint command (e.g., "eslint --fix", "ruff check") */
  lintCommand?: string
  /** Test command (e.g., "bun test", "pytest") */
  testCommand?: string
  /** Max auto-fix attempts before giving up (default: 3) */
  maxAttempts?: number
  /** Whether auto-lint is enabled (default: true if lintCommand set) */
  autoLint?: boolean
  /** Whether auto-test is enabled (default: false) */
  autoTest?: boolean
}

/** Result of a lint/test run */
export interface AutoFixResult {
  type: "lint" | "test"
  passed: boolean
  output: string
  exitCode: number
  attempt: number
}

/** Full auto-fix cycle result */
export interface AutoFixCycleResult {
  lintResults: AutoFixResult[]
  testResults: AutoFixResult[]
  allPassed: boolean
  totalAttempts: number
}

/** Default configuration */
export const DEFAULT_AUTO_FIX: AutoFixConfig = {
  maxAttempts: 3,
  autoLint: true,
  autoTest: false,
}

/**
 * Detect project linter from configuration files.
 * Checks for common linter configs in project root.
 */
export function detectLinter(files: string[]): string | undefined {
  const fileSet = new Set(files.map((f) => f.toLowerCase()))

  // ESLint
  if (fileSet.has("eslint.config.js") || fileSet.has("eslint.config.mjs") || fileSet.has(".eslintrc.json") || fileSet.has(".eslintrc.js"))
    return "npx eslint --fix"

  // Biome
  if (fileSet.has("biome.json") || fileSet.has("biome.jsonc")) return "npx biome check --fix"

  // Prettier (formatter, not linter, but close enough)
  if (fileSet.has(".prettierrc") || fileSet.has(".prettierrc.json") || fileSet.has("prettier.config.js"))
    return "npx prettier --write"

  // Ruff (Python)
  if (fileSet.has("ruff.toml") || fileSet.has(".ruff.toml")) return "ruff check --fix"

  // Flake8 (Python)
  if (fileSet.has(".flake8") || fileSet.has("setup.cfg")) return "flake8"

  // RuboCop (Ruby)
  if (fileSet.has(".rubocop.yml")) return "rubocop -A"

  // Go
  if (fileSet.has("go.mod")) return "go vet ./..."

  // Rust
  if (fileSet.has("cargo.toml")) return "cargo clippy --fix --allow-dirty"

  return undefined
}

/**
 * Detect project test runner from configuration files.
 */
export function detectTestRunner(files: string[]): string | undefined {
  const fileSet = new Set(files.map((f) => f.toLowerCase()))

  if (fileSet.has("bun.lock") || fileSet.has("bunfig.toml")) return "bun test"
  if (fileSet.has("vitest.config.ts") || fileSet.has("vitest.config.js")) return "npx vitest run"
  if (fileSet.has("jest.config.js") || fileSet.has("jest.config.ts")) return "npx jest"
  if (fileSet.has("pytest.ini") || fileSet.has("pyproject.toml")) return "pytest"
  if (fileSet.has("cargo.toml")) return "cargo test"
  if (fileSet.has("go.mod")) return "go test ./..."
  if (fileSet.has("gemfile")) return "bundle exec rspec"

  // Fallback: check package.json for test script
  if (fileSet.has("package.json")) return "npm test"

  return undefined
}

/**
 * Parse lint/test output to extract error summary.
 * Returns a concise description of what failed.
 */
export function summarizeErrors(output: string, maxLines = 20): string {
  const lines = output.split("\n")
  const errorLines = lines.filter(
    (l) =>
      /error|fail|Error|FAIL|ERR|warning|Warning/i.test(l) &&
      !l.includes("node_modules") &&
      l.trim().length > 0,
  )

  if (errorLines.length === 0) return output.slice(0, 500)
  return errorLines.slice(0, maxLines).join("\n")
}
