/**
 * AgentiCode Provider Setup — replicated from OpenCode's `providers login` flow.
 * Uses @clack/prompts for polished interactive CLI experience.
 *
 * Flow:
 * 1. Check if any API key is configured (env var or saved auth)
 * 2. If not, run provider selection with searchable list
 * 3. Prompt for API key (password-masked input)
 * 4. Save to ~/.agenticode/auth.json
 * 5. Set env var for current session
 */

import * as prompts from '@clack/prompts'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

const CONFIG_DIR = join(homedir(), '.agenticode')
const AUTH_FILE = join(CONFIG_DIR, 'auth.json')

interface SavedAuth {
  [providerId: string]: {
    type: 'api'
    key: string
  }
}

/** Provider registry with env var mappings — same priority order as OpenCode */
const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', env: ['OPENAI_API_KEY'], hint: 'ChatGPT Plus/Pro or API key' },
  { id: 'anthropic', name: 'Anthropic', env: ['AGENTICODE_API_KEY', 'ANTHROPIC_API_KEY'], hint: 'API key' },
  { id: 'google', name: 'Google Gemini', env: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'], hint: 'API key' },
  { id: 'github-copilot', name: 'GitHub Copilot', env: ['GITHUB_TOKEN'], hint: 'Copilot subscription' },
  { id: 'groq', name: 'Groq', env: ['GROQ_API_KEY'], hint: 'free tier available' },
  { id: 'deepseek', name: 'DeepSeek', env: ['DEEPSEEK_API_KEY'], hint: 'cheap' },
  { id: 'openrouter', name: 'OpenRouter', env: ['OPENROUTER_API_KEY'], hint: '100+ models' },
  { id: 'mistral', name: 'Mistral', env: ['MISTRAL_API_KEY'] },
  { id: 'xai', name: 'xAI', env: ['XAI_API_KEY'], hint: 'Grok' },
  { id: 'together', name: 'Together AI', env: ['TOGETHER_API_KEY'] },
  { id: 'fireworks-ai', name: 'Fireworks AI', env: ['FIREWORKS_API_KEY'] },
  { id: 'cerebras', name: 'Cerebras', env: ['CEREBRAS_API_KEY'], hint: 'fast inference' },
  { id: 'perplexity', name: 'Perplexity', env: ['PERPLEXITY_API_KEY'] },
  { id: 'azure', name: 'Azure OpenAI', env: ['AZURE_OPENAI_API_KEY'] },
  { id: 'amazon-bedrock', name: 'Amazon Bedrock', env: ['AWS_ACCESS_KEY_ID'], hint: 'AWS credentials' },
  { id: 'ollama', name: 'Ollama', env: [], hint: 'local, free — no API key needed' },
  { id: 'lmstudio', name: 'LM Studio', env: [], hint: 'local, free — no API key needed' },
] as const

/**
 * Check if any provider is configured via env vars or saved auth.
 */
export async function isFirstRun(): Promise<boolean> {
  // Check env vars
  for (const p of PROVIDERS) {
    for (const env of p.env) {
      if (process.env[env]) return false
    }
  }
  // Check saved auth
  try {
    const content = await readFile(AUTH_FILE, 'utf-8')
    const auth = JSON.parse(content) as SavedAuth
    return Object.keys(auth).length === 0
  } catch {
    return true
  }
}

/**
 * Load saved auth and set env vars.
 */
export async function autoLoadConfig(): Promise<void> {
  try {
    const content = await readFile(AUTH_FILE, 'utf-8')
    const auth = JSON.parse(content) as SavedAuth

    for (const [providerId, cred] of Object.entries(auth)) {
      if (cred.type !== 'api') continue
      const provider = PROVIDERS.find(p => p.id === providerId)
      if (!provider) continue
      const envVar = provider.env[0]
      if (envVar && !process.env[envVar]) {
        process.env[envVar] = cred.key
      }
    }
  } catch {
    // No saved auth
  }
}

/**
 * Run the provider setup — OpenCode style.
 */
export async function runSetupWizard(): Promise<boolean> {
  console.log('')
  prompts.intro('AgentiCode — Add credential')

  const selected = await prompts.select({
    message: 'Select provider',
    options: [
      ...PROVIDERS.map(p => ({
        label: p.name,
        value: p.id,
        hint: p.hint,
      })),
      { label: 'Other', value: 'other', hint: 'custom provider ID' },
    ],
  })

  if (prompts.isCancel(selected)) {
    prompts.cancel('Setup cancelled')
    return false
  }

  let providerId = selected as string

  if (providerId === 'other') {
    const custom = await prompts.text({
      message: 'Enter provider ID',
      placeholder: 'e.g. my-provider',
      validate: (x) => (x && /^[0-9a-z-]+$/.test(x) ? undefined : 'a-z, 0-9 and hyphens only'),
    })
    if (prompts.isCancel(custom)) {
      prompts.cancel('Setup cancelled')
      return false
    }
    providerId = custom
  }

  const provider = PROVIDERS.find(p => p.id === providerId)

  // Local providers — no API key needed
  if (provider && provider.env.length === 0) {
    prompts.log.info(`${provider.name} runs locally — no API key needed.`)
    prompts.log.info('Make sure the server is running before sending messages.')
    prompts.outro('Done')
    return true
  }

  // Bedrock special case
  if (providerId === 'amazon-bedrock') {
    prompts.log.info(
      'Amazon Bedrock uses AWS credentials.\n' +
      'Configure via AWS_PROFILE, AWS_REGION, AWS_ACCESS_KEY_ID env vars.\n' +
      'Or configure in .agenticode/config.json'
    )
  }

  // Prompt for API key
  const key = await prompts.password({
    message: 'Enter your API key',
    validate: (x) => (x && x.length > 0 ? undefined : 'Required'),
  })

  if (prompts.isCancel(key)) {
    prompts.cancel('Setup cancelled')
    return false
  }

  // Save auth
  await mkdir(CONFIG_DIR, { recursive: true })
  let auth: SavedAuth = {}
  try {
    const existing = await readFile(AUTH_FILE, 'utf-8')
    auth = JSON.parse(existing)
  } catch {}

  auth[providerId] = { type: 'api', key }
  await writeFile(AUTH_FILE, JSON.stringify(auth, null, 2))

  // Set env var for current session
  if (provider) {
    const envVar = provider.env[0]
    if (envVar) {
      process.env[envVar] = key
    }
  }

  prompts.log.success('Login successful')

  // Show credentials summary
  const displayPath = AUTH_FILE.replace(homedir(), '~')
  prompts.log.info(`Saved to ${displayPath}`)

  // Check for active env vars
  const activeEnvVars: string[] = []
  for (const p of PROVIDERS) {
    for (const env of p.env) {
      if (process.env[env]) activeEnvVars.push(`${p.name} (${env})`)
    }
  }
  if (activeEnvVars.length > 0) {
    prompts.log.info(`Active: ${activeEnvVars.join(', ')}`)
  }

  prompts.outro('Done')
  return true
}
