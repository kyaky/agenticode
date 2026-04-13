// MCP SDK shim — comprehensive re-exports for Bun --compile compatibility

// Client
export { Client } from '@modelcontextprotocol/sdk/client/index.js'
export { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
export { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
export { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// Server
export { Server } from '@modelcontextprotocol/sdk/server/index.js'
export { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

// Types — stub what we can't resolve from deep paths
export type ServerCapabilities = Record<string, unknown>
export type JSONRPCMessage = { jsonrpc: '2.0'; id?: string | number; method?: string; params?: unknown; result?: unknown; error?: unknown }
export type ElicitRequestFormParams = Record<string, unknown>
export type ElicitRequestURLParams = Record<string, unknown>
export type ElicitResult = unknown
export type PrimitiveSchemaDefinition = Record<string, unknown>
export type ReadResourceResult = { contents: Array<{ uri: string; text?: string; blob?: string }> }
export type Transport = { start(): Promise<void>; close(): Promise<void>; send(msg: JSONRPCMessage): Promise<void> }
export type FetchLike = typeof fetch
export type McpbManifest = Record<string, unknown>
export type Tool = { name: string; description?: string; inputSchema: Record<string, unknown> }

// Constants
export const ListToolsRequestSchema = { method: 'tools/list' as const }

// Auth stubs
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') { super(message); this.name = 'UnauthorizedError' }
}
export function discoverOAuthProtectedResourceMetadata() { return Promise.resolve(null) }
export function startAuthorization() { return Promise.resolve({ authorizationUrl: '', codeVerifier: '' }) }
export function exchangeAuthorization() { return Promise.resolve({ access_token: '', token_type: 'bearer' }) }
export function refreshAuthorization() { return Promise.resolve({ access_token: '', token_type: 'bearer' }) }
export function discoverAuthorizationServerMetadata() { return Promise.resolve(null) }

// OAuth types stubs
export type OAuthClientInformation = { client_id: string; client_secret?: string; redirect_uris?: string[] }
export type OpenIdProviderDiscoveryMetadata = { issuer: string; authorization_endpoint: string; token_endpoint: string }
export const OpenIdProviderDiscoveryMetadataSchema = { parse: (x: any) => x as OpenIdProviderDiscoveryMetadata }
export type OAuthClientInformationFull = OAuthClientInformation & { client_id_issued_at?: number }
export type OAuthTokens = { access_token: string; token_type: string; refresh_token?: string; expires_in?: number }
export type OAuthMetadata = { issuer: string; authorization_endpoint: string; token_endpoint: string }
export type OAuthClientMetadata = { client_name?: string; redirect_uris?: string[]; grant_types?: string[]; response_types?: string[] }
export const OAuthErrorResponseSchema = { parse: (x: any) => x }
export const OAuthMetadataSchema = { parse: (x: any) => x }
export const OAuthTokensSchema = { parse: (x: any) => x }
export const OAuthClientInformationFullSchema = { parse: (x: any) => x }
export function registerClient() { return Promise.resolve({ client_id: '', client_secret: '' }) }
export class TooManyRequestsError extends Error { constructor(m = 'Too many requests') { super(m); this.name = 'TooManyRequestsError' } }
export class InvalidGrantError extends Error { constructor(m = 'Invalid grant') { super(m); this.name = 'InvalidGrantError' } }
export class OAuthError extends Error { constructor(m = 'OAuth error') { super(m); this.name = 'OAuthError' } }
export class ServerError extends Error { constructor(m = 'Server error') { super(m); this.name = 'ServerError' } }
export class TemporarilyUnavailableError extends Error { constructor(m = 'Temporarily unavailable') { super(m); this.name = 'TemporarilyUnavailableError' } }
export function discoverOAuthServerInfo() { return Promise.resolve(null) }
export const auth = { UnauthorizedError, OAuthError, TooManyRequestsError, InvalidGrantError, ServerError, TemporarilyUnavailableError }
export const ReadResourceResultSchema = { parse: (x: any) => x }
export const JSONRPCMessageSchema = { parse: (x: any) => x }
export const ListResourcesResultSchema = { parse: (x: any) => x }
export const ListResourceTemplatesResultSchema = { parse: (x: any) => x }
export const ListPromptsResultSchema = { parse: (x: any) => x }
export const GetPromptResultSchema = { parse: (x: any) => x }
export const CallToolResultSchema = { parse: (x: any) => x }
export const InitializeResultSchema = { parse: (x: any) => x }
export const ListToolsResultSchema = { parse: (x: any) => x }
export const ServerNotificationSchema = { parse: (x: any) => x }
export const LoggingMessageNotificationSchema = { parse: (x: any) => x }
export const ResourceUpdatedNotificationSchema = { parse: (x: any) => x }
export const ToolListChangedNotificationSchema = { parse: (x: any) => x }
export const PromptListChangedNotificationSchema = { parse: (x: any) => x }
export const ResourceListChangedNotificationSchema = { parse: (x: any) => x }
export const ElicitRequestSchema = { parse: (x: any) => x }
export type ElicitSchemaDefinition = Record<string, unknown>
export type ResourceTemplate = { uriTemplate: string; name?: string; description?: string }
export type Resource = { uri: string; name?: string; description?: string; mimeType?: string }
export type Prompt = { name: string; description?: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }
export type GetPromptResult = { messages: Array<{ role: string; content: unknown }> }
export type CallToolResult = { content: Array<{ type: string; text?: string }> }
export type LoggingLevel = 'debug' | 'info' | 'warning' | 'error'
export const ElicitationCompleteNotificationSchema = { parse: (x: any) => x }
export const ErrorCode = { parse: (x: any) => x }
export const ListRootsRequestSchema = { parse: (x: any) => x }
export const McpError = { parse: (x: any) => x }
export const createFetchWithInit = { parse: (x: any) => x }
export const CallToolRequestSchema = { parse: (x: any) => x }
