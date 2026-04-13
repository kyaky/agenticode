import { buildTool } from '../../Tool.js'
export const REPLTool = buildTool({ name: 'repl', description: 'REPL (disabled)', inputSchema: () => ({} as any), async call() { return { type: 'result' as const, resultForAssistant: 'REPL not available', resultForUser: '' } } })
