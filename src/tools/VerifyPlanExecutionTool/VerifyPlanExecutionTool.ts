import { buildTool } from '../../Tool.js'
export const VerifyPlanExecutionTool = buildTool({ name: 'verify_plan', description: 'Verify plan (disabled)', inputSchema: () => ({} as any), async call() { return { type: 'result' as const, resultForAssistant: 'Not available', resultForUser: '' } } })
