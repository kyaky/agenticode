// AGENTICODE: Recipe loader — parses YAML recipes and resolves parameters

import fs from "fs/promises"
import path from "path"
import { Recipe, type RecipeParameter } from "./types.js"

/**
 * Load a recipe from a YAML file.
 * Supports both .yaml and .yml extensions.
 */
export async function loadRecipe(filepath: string): Promise<Recipe> {
  const content = await fs.readFile(filepath, "utf-8")
  const parsed = parseYamlLike(content)
  return Recipe.parse(parsed)
}

/**
 * Resolve template parameters in a recipe's step prompts.
 * Replaces {{ param_name }} with provided values.
 */
export function resolveParameters(template: string, params: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key) => {
    return params[key] ?? match
  })
}

/**
 * Validate that all required parameters are provided.
 */
export function validateParameters(
  defined: RecipeParameter[],
  provided: Record<string, string>,
): string[] {
  const errors: string[] = []
  for (const param of defined) {
    if (param.required && !provided[param.name] && !param.default) {
      errors.push(`Missing required parameter: ${param.name}`)
    }
  }
  return errors
}

/**
 * Build the full parameter set with defaults applied.
 */
export function buildParameters(
  defined: RecipeParameter[],
  provided: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const param of defined) {
    result[param.name] = provided[param.name] ?? param.default ?? ""
  }
  return result
}

/**
 * Discover recipe files in a directory.
 */
export async function discoverRecipes(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && (e.name.endsWith(".yaml") || e.name.endsWith(".yml")))
      .map((e) => path.join(dir, e.name))
  } catch {
    return []
  }
}

/**
 * Simple YAML-like parser for recipe files.
 * Handles the subset of YAML used in recipes (key: value, arrays, nested objects).
 * For full YAML support, users should install a proper YAML library.
 */
function parseYamlLike(content: string): Record<string, unknown> {
  // Use JSON if it looks like JSON
  const trimmed = content.trim()
  if (trimmed.startsWith("{")) return JSON.parse(trimmed)

  // Simple line-by-line YAML parsing for flat structures
  const result: Record<string, unknown> = {}
  const lines = content.split("\n")
  let currentArray: unknown[] | null = null
  let currentKey = ""

  for (const line of lines) {
    const stripped = line.trimEnd()
    if (!stripped || stripped.startsWith("#")) continue

    // Array item
    if (stripped.match(/^\s*-\s+/)) {
      const value = stripped.replace(/^\s*-\s+/, "").trim()
      if (currentArray) {
        currentArray.push(parseValue(value))
      }
      continue
    }

    // Key: value
    const kvMatch = stripped.match(/^(\w+)\s*:\s*(.*)$/)
    if (kvMatch) {
      const [, key, rawValue] = kvMatch
      const value = rawValue!.trim()
      if (!value || value === "") {
        // Could be start of array or nested object
        currentArray = []
        currentKey = key!
        result[key!] = currentArray
      } else {
        currentArray = null
        result[key!] = parseValue(value)
      }
    }
  }

  return result
}

function parseValue(value: string): unknown {
  if (value === "true") return true
  if (value === "false") return false
  if (value === "null") return null
  if (/^\d+$/.test(value)) return parseInt(value)
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value)
  // Strip quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}
