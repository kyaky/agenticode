// Stub: TungstenTool — internal tool, not available in open source
import { buildTool } from '../../Tool.js'
export const TungstenTool = buildTool({ name: 'tungsten', description: 'Internal tool (disabled)', inputSchema: () => ({} as any), async call() { return { type: 'result' as const, resultForAssistant: 'Tool not available', resultForUser: '' } } })
