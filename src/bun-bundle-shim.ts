/**
 * bun:bundle shim — replaces Bun's compile-time feature flags with runtime checks.
 * In production builds, `import { feature } from 'bun:bundle'` is resolved at compile time.
 * For development, this shim makes all features available at runtime.
 */

const ENABLED_FEATURES = new Set([
  'BUDDY',
  'EXTRACT_MEMORIES',
  'TEAMMEM',
  'KAIROS',
  'COORDINATOR_MODE',
  'COMPUTER_USE',
  'BRIDGE_MODE',
  'DAEMON',
  'BG_SESSIONS',
  'TEMPLATES',
  'DUMP_SYSTEM_PROMPT',
])

const DISABLED_FEATURES = new Set([
  'ABLATION_BASELINE',
  'BYOC_ENVIRONMENT_RUNNER',
  'SELF_HOSTED_RUNNER',
])

export function feature(name: string): boolean {
  if (DISABLED_FEATURES.has(name)) return false
  return ENABLED_FEATURES.has(name) || true // default: enabled
}
