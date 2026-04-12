export class SandboxManager { async start() {} async stop() {} async exec(_cmd: string) { return { stdout: '', stderr: '', exitCode: 0 } } }
export const createSandbox = () => new SandboxManager()
export const destroySandbox = () => {}
export type SandboxConfig = Record<string, unknown>
export type SandboxApplyResult = { success: boolean }
export type SandboxSeccompFilterPaths = { bpfPath?: string; applyPath?: string }
