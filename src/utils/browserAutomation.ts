/**
 * Browser Automation — MCP-based Playwright/Puppeteer integration.
 * Inspired by Goose's Playwright MCP and Cline's browser-use.
 *
 * Configures browser automation as an MCP server rather than
 * a built-in tool, keeping it modular and optional.
 */

/** Browser MCP server configuration */
export interface BrowserMCPConfig {
  /** MCP server type */
  type: 'playwright' | 'puppeteer' | 'browser-use' | 'custom'
  /** Command to start the MCP server */
  command: string
  /** Arguments for the command */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** Whether to run headless (default: true) */
  headless?: boolean
  /** Viewport dimensions */
  viewport?: { width: number; height: number }
}

/** Pre-configured browser MCP servers */
export const BROWSER_PRESETS: Record<string, BrowserMCPConfig> = {
  playwright: {
    type: 'playwright',
    command: 'npx',
    args: ['@playwright/mcp@latest'],
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  'browser-use': {
    type: 'browser-use',
    command: 'npx',
    args: ['@anthropic-ai/browser-use-mcp'],
    headless: true,
  },
  puppeteer: {
    type: 'puppeteer',
    command: 'npx',
    args: ['puppeteer-mcp-server'],
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
}

/**
 * Generate MCP server config for browser automation.
 * Returns a config object that can be added to .agenticode/config.json
 */
export function generateBrowserMCPConfig(
  preset: keyof typeof BROWSER_PRESETS | BrowserMCPConfig,
): Record<string, unknown> {
  const config = typeof preset === 'string' ? BROWSER_PRESETS[preset] : preset
  if (!config) throw new Error(`Unknown browser preset: ${String(preset)}`)

  return {
    command: config.command,
    args: [
      ...(config.args ?? []),
      ...(config.headless === false ? ['--headed'] : []),
      ...(config.viewport ? [`--viewport-size=${config.viewport.width},${config.viewport.height}`] : []),
    ],
    env: config.env ?? {},
  }
}

/**
 * Available browser actions when browser MCP is connected.
 */
export const BROWSER_ACTIONS = [
  'navigate',
  'click',
  'type',
  'screenshot',
  'get_text',
  'wait',
  'scroll',
  'select',
  'hover',
  'evaluate',
  'pdf',
] as const

export type BrowserAction = (typeof BROWSER_ACTIONS)[number]
