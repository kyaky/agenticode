/**
 * Sandbox Container — isolated execution environment config.
 * Inspired by Goose's container-use extension.
 *
 * Configures Docker-based isolated environments for agent tool execution.
 * All file modifications and shell commands run inside the container,
 * protecting the host system from unintended changes.
 */

/** Sandbox configuration */
export interface SandboxConfig {
  /** Whether sandbox mode is enabled */
  enabled: boolean
  /** Docker image to use (default: ubuntu:22.04) */
  image: string
  /** Mount the project directory into the container */
  mountProject: boolean
  /** Mount path inside the container */
  mountPath: string
  /** Additional volumes to mount */
  volumes?: Array<{ host: string; container: string; readonly?: boolean }>
  /** Environment variables to pass */
  env?: Record<string, string>
  /** Network mode (default: 'bridge') */
  network?: 'bridge' | 'host' | 'none'
  /** Memory limit (e.g., '2g') */
  memoryLimit?: string
  /** CPU limit (e.g., '2.0') */
  cpuLimit?: string
  /** Auto-remove container on exit */
  autoRemove?: boolean
}

export const DEFAULT_SANDBOX: SandboxConfig = {
  enabled: false,
  image: 'ubuntu:22.04',
  mountProject: true,
  mountPath: '/workspace',
  network: 'bridge',
  autoRemove: true,
}

/**
 * Build docker run command for sandbox execution.
 */
export function buildDockerRunCommand(
  config: SandboxConfig,
  projectDir: string,
  command: string,
): string {
  const parts: string[] = ['docker', 'run']

  if (config.autoRemove) parts.push('--rm')
  parts.push('-it')

  // Mount project
  if (config.mountProject) {
    parts.push('-v', `${projectDir}:${config.mountPath}`)
    parts.push('-w', config.mountPath)
  }

  // Additional volumes
  for (const vol of config.volumes ?? []) {
    const flag = vol.readonly ? ':ro' : ''
    parts.push('-v', `${vol.host}:${vol.container}${flag}`)
  }

  // Environment
  for (const [key, value] of Object.entries(config.env ?? {})) {
    parts.push('-e', `${key}=${value}`)
  }

  // Resource limits
  if (config.memoryLimit) parts.push('--memory', config.memoryLimit)
  if (config.cpuLimit) parts.push('--cpus', config.cpuLimit)

  // Network
  if (config.network) parts.push('--network', config.network)

  parts.push(config.image)
  parts.push('sh', '-c', command)

  return parts.join(' ')
}

/**
 * Check if Docker is available on the system.
 */
export function dockerCheckCommand(): string {
  return 'docker info --format "{{.ServerVersion}}" 2>/dev/null'
}

/**
 * Build docker exec command for an already-running container.
 */
export function buildDockerExecCommand(containerId: string, command: string): string {
  return `docker exec -it ${containerId} sh -c ${JSON.stringify(command)}`
}
