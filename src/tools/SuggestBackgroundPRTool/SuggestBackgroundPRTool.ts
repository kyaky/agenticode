import { buildTool } from '../../Tool.js'
export const SuggestBackgroundPRTool = buildTool({ name: 'suggest_pr', description: 'Suggest PR (disabled)', inputSchema: () => ({} as any), async call() { return { type: 'result' as const, resultForAssistant: 'Not available', resultForUser: '' } } })
