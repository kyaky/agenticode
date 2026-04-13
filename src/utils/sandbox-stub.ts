// Stub: sandbox runtime — replaces agenticode-sandbox native module
export class SandboxManager {
  static isSupportedPlatform() { return false }
  static isAvailable() { return false }
  async start() {}
  async stop() {}
  async exec(_cmd: string) { return { stdout: '', stderr: '', exitCode: 0 } }
  async isRunning() { return false }
  async destroy() {}
}
export const createSandbox = () => new SandboxManager()
export const destroySandbox = () => {}
export type SandboxConfig = Record<string, unknown>
export type SandboxApplyResult = { success: boolean }
export type SandboxSeccompFilterPaths = { bpfPath?: string; applyPath?: string }
