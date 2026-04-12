/**
 * Models.dev Registry — dynamic provider and model discovery.
 * Fetches the complete AI model database from https://models.dev/api.json
 * providing 110+ providers and 2000+ models with pricing, capabilities,
 * and context window information.
 *
 * This replaces hardcoded provider lists with a live, always-updated registry.
 */

import fs from 'fs/promises'
import path from 'path'

const REGISTRY_URL = 'https://models.dev/api.json'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/** Model info from models.dev */
export interface RegistryModel {
  id: string
  name: string
  providerId: string
  providerName: string
  api: {
    url: string | null
    npm?: string
  }
  cost: {
    input: number
    output: number
    cacheRead?: number
    cacheWrite?: number
  }
  limit: {
    context: number
    input?: number
    output?: number
  }
  capabilities: {
    temperature: boolean
    reasoning: boolean
    toolcall: boolean
    attachment: boolean
    streaming: boolean
  }
  status: string
}

/** Provider info from models.dev */
export interface RegistryProvider {
  id: string
  name: string
  api: string | null
  env: string[]
  modelCount: number
  models: Record<string, RegistryModel>
}

/** Full registry */
export interface ModelRegistry {
  providers: Record<string, RegistryProvider>
  fetchedAt: number
}

// In-memory cache
let cache: ModelRegistry | null = null

/**
 * Fetch the complete models.dev registry.
 * Caches in memory for 5 minutes.
 */
export async function fetchRegistry(forceRefresh = false): Promise<ModelRegistry> {
  if (cache && !forceRefresh && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache
  }

  try {
    const response = await fetch(REGISTRY_URL)
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
    const data = await response.json() as Record<string, any>

    const providers: Record<string, RegistryProvider> = {}

    for (const [id, info] of Object.entries(data)) {
      const models: Record<string, RegistryModel> = {}
      const rawModels = (info as any).models ?? {}

      for (const [modelId, modelInfo] of Object.entries(rawModels)) {
        const m = modelInfo as any
        models[modelId] = {
          id: modelId,
          name: m.name ?? modelId,
          providerId: id,
          providerName: (info as any).name ?? id,
          api: {
            url: m.provider?.api ?? (info as any).api ?? null,
            npm: m.provider?.npm ?? (info as any).npm,
          },
          cost: {
            input: m.cost?.input ?? 0,
            output: m.cost?.output ?? 0,
            cacheRead: m.cost?.cache_read,
            cacheWrite: m.cost?.cache_write,
          },
          limit: {
            context: m.limit?.context ?? 128000,
            input: m.limit?.input,
            output: m.limit?.output,
          },
          capabilities: {
            temperature: m.temperature ?? true,
            reasoning: m.reasoning ?? false,
            toolcall: m.tool_call ?? false,
            attachment: m.attachment ?? false,
            streaming: true,
          },
          status: m.status ?? 'active',
        }
      }

      providers[id] = {
        id,
        name: (info as any).name ?? id,
        api: (info as any).api ?? null,
        env: (info as any).env ?? [],
        modelCount: Object.keys(models).length,
        models,
      }
    }

    cache = { providers, fetchedAt: Date.now() }
    return cache
  } catch (e) {
    // Return cached data if available, even if stale
    if (cache) return cache
    throw e
  }
}

/**
 * List all available providers.
 */
export async function listProviders(): Promise<RegistryProvider[]> {
  const registry = await fetchRegistry()
  return Object.values(registry.providers).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get a specific provider by ID.
 */
export async function getProvider(providerId: string): Promise<RegistryProvider | undefined> {
  const registry = await fetchRegistry()
  return registry.providers[providerId]
}

/**
 * List models for a specific provider.
 */
export async function listModels(providerId: string): Promise<RegistryModel[]> {
  const provider = await getProvider(providerId)
  if (!provider) return []
  return Object.values(provider.models).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Search models across all providers by name.
 */
export async function searchModels(query: string, limit = 20): Promise<RegistryModel[]> {
  const registry = await fetchRegistry()
  const q = query.toLowerCase()
  const results: RegistryModel[] = []

  for (const provider of Object.values(registry.providers)) {
    for (const model of Object.values(provider.models)) {
      if (
        model.id.toLowerCase().includes(q) ||
        model.name.toLowerCase().includes(q) ||
        model.providerId.toLowerCase().includes(q)
      ) {
        results.push(model)
        if (results.length >= limit) return results
      }
    }
  }

  return results
}

/**
 * Find the cheapest model that meets minimum requirements.
 */
export async function findCheapestModel(opts?: {
  minContext?: number
  needsToolCall?: boolean
  needsReasoning?: boolean
}): Promise<RegistryModel | undefined> {
  const registry = await fetchRegistry()
  let best: RegistryModel | undefined
  let bestCost = Infinity

  for (const provider of Object.values(registry.providers)) {
    for (const model of Object.values(provider.models)) {
      if (model.status !== 'active') continue
      if (opts?.minContext && model.limit.context < opts.minContext) continue
      if (opts?.needsToolCall && !model.capabilities.toolcall) continue
      if (opts?.needsReasoning && !model.capabilities.reasoning) continue

      const totalCost = model.cost.input + model.cost.output
      if (totalCost > 0 && totalCost < bestCost) {
        bestCost = totalCost
        best = model
      }
    }
  }

  return best
}

/**
 * Categorize providers into online vs local.
 */
export async function categorizeProviders(): Promise<{
  online: RegistryProvider[]
  local: RegistryProvider[]
}> {
  const registry = await fetchRegistry()
  const online: RegistryProvider[] = []
  const local: RegistryProvider[] = []

  const localIds = new Set(['lmstudio', 'ollama', 'llamacpp', 'jan', 'vllm', 'localai'])

  for (const provider of Object.values(registry.providers)) {
    const isLocal =
      localIds.has(provider.id) ||
      provider.api?.includes('127.0.0.1') ||
      provider.api?.includes('localhost')

    if (isLocal) {
      local.push(provider)
    } else {
      online.push(provider)
    }
  }

  return {
    online: online.sort((a, b) => a.name.localeCompare(b.name)),
    local: local.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/**
 * Get stats about the registry.
 */
export async function registryStats(): Promise<{
  totalProviders: number
  totalModels: number
  onlineProviders: number
  localProviders: number
}> {
  const registry = await fetchRegistry()
  const cats = await categorizeProviders()
  let totalModels = 0

  for (const p of Object.values(registry.providers)) {
    totalModels += p.modelCount
  }

  return {
    totalProviders: Object.keys(registry.providers).length,
    totalModels,
    onlineProviders: cats.online.length,
    localProviders: cats.local.length,
  }
}
