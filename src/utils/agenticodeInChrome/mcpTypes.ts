// Stub: agenticodeInChrome MCP types — replaces external chrome-mcp package
export interface CuPermissionRequest { tool: string; args: Record<string, unknown> }
export interface CuPermissionResponse { allowed: boolean }
export const DEFAULT_GRANT_FLAGS = { allowBrowser: true, allowNetwork: true }
export function getSentinelCategory(_app: string): string { return 'other' }
export const BROWSER_TOOLS = ['screenshot', 'click', 'type', 'navigate']
export const CHROME_MCP_EXTENSION_ID = 'agenticode-chrome'
export type ChromeMCPConfig = { extensionId: string; port?: number }
export function createAgenticodeForChromeMcpServer(_ctx?: unknown) { return null }
