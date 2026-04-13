/**
 * Provider-agnostic web search — replaces provider-specific web search.
 * Ported from ClawCode's web_utils.py pattern.
 * Supports: Tavily, SearXNG (self-hosted), Brave, and custom backends.
 */

export interface SearchResult {
  title: string
  url: string
  content: string
  score?: number
}

export interface SearchConfig {
  backend: 'tavily' | 'brave' | 'searxng' | 'custom'
  apiKey?: string
  baseUrl?: string
  maxResults?: number
}

/**
 * Detect which search backend is available from environment variables.
 */
export function detectSearchBackend(): SearchConfig {
  if (process.env.TAVILY_API_KEY) {
    return { backend: 'tavily', apiKey: process.env.TAVILY_API_KEY, maxResults: 8 }
  }
  if (process.env.BRAVE_API_KEY) {
    return { backend: 'brave', apiKey: process.env.BRAVE_API_KEY, maxResults: 8 }
  }
  if (process.env.SEARXNG_URL) {
    return { backend: 'searxng', baseUrl: process.env.SEARXNG_URL, maxResults: 8 }
  }
  // Custom OpenAI-compatible search endpoint
  if (process.env.SEARCH_API_URL) {
    return { backend: 'custom', baseUrl: process.env.SEARCH_API_URL, apiKey: process.env.SEARCH_API_KEY, maxResults: 8 }
  }
  return { backend: 'tavily', maxResults: 8 }
}

/**
 * Execute a web search using the configured backend.
 */
export async function webSearch(query: string, config?: SearchConfig): Promise<SearchResult[]> {
  const cfg = config ?? detectSearchBackend()

  switch (cfg.backend) {
    case 'tavily':
      return searchTavily(query, cfg)
    case 'brave':
      return searchBrave(query, cfg)
    case 'searxng':
      return searchSearXNG(query, cfg)
    case 'custom':
      return searchCustom(query, cfg)
    default:
      throw new Error(`Unknown search backend: ${cfg.backend}`)
  }
}

// ─── Tavily ──────────────────────────────────────────────────────────

async function searchTavily(query: string, config: SearchConfig): Promise<SearchResult[]> {
  if (!config.apiKey) throw new Error('TAVILY_API_KEY is required for Tavily search')

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.apiKey,
      query,
      max_results: config.maxResults ?? 8,
      include_answer: false,
    }),
  })

  if (!response.ok) throw new Error(`Tavily error: ${response.status}`)
  const data = await response.json() as { results?: Array<{ title: string; url: string; content: string; score?: number }> }

  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score,
  }))
}

// ─── Brave Search ────────────────────────────────────────────────────

async function searchBrave(query: string, config: SearchConfig): Promise<SearchResult[]> {
  if (!config.apiKey) throw new Error('BRAVE_API_KEY is required for Brave search')

  const params = new URLSearchParams({ q: query, count: String(config.maxResults ?? 8) })
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': config.apiKey,
    },
  })

  if (!response.ok) throw new Error(`Brave error: ${response.status}`)
  const data = await response.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } }

  return (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.description,
  }))
}

// ─── SearXNG (Self-hosted) ───────────────────────────────────────────

async function searchSearXNG(query: string, config: SearchConfig): Promise<SearchResult[]> {
  const baseUrl = config.baseUrl || 'http://127.0.0.1:8080'
  const params = new URLSearchParams({ q: query, format: 'json' })

  const response = await fetch(`${baseUrl}/search?${params}`)
  if (!response.ok) throw new Error(`SearXNG error: ${response.status}`)

  const data = await response.json() as { results?: Array<{ title: string; url: string; content: string; score?: number }> }

  return (data.results ?? []).slice(0, config.maxResults ?? 8).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
    score: r.score,
  }))
}

// ─── Custom Backend ──────────────────────────────────────────────────

async function searchCustom(query: string, config: SearchConfig): Promise<SearchResult[]> {
  if (!config.baseUrl) throw new Error('SEARCH_API_URL is required for custom search')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, max_results: config.maxResults ?? 8 }),
  })

  if (!response.ok) throw new Error(`Custom search error: ${response.status}`)
  const data = await response.json() as { results?: SearchResult[] }
  return data.results ?? []
}
