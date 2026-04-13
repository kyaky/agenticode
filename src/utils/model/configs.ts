import type { ModelName } from './model.js'
import type { APIProvider } from './providers.js'

export type ModelConfig = Record<APIProvider, ModelName>

// @[MODEL LAUNCH]: Add a new AGENTICODE_*_CONFIG constant here. Double check the correct model strings
// here since the pattern may change.

export const AGENTICODE_3_7_SONNET_CONFIG = {
  firstParty: 'agenticode-3-7-sonnet-20250219',
  bedrock: 'us.agenticode.agenticode-3-7-sonnet-20250219-v1:0',
  vertex: 'agenticode-3-7-sonnet@20250219',
  foundry: 'agenticode-3-7-sonnet',
} as const satisfies ModelConfig

export const AGENTICODE_3_5_V2_SONNET_CONFIG = {
  firstParty: 'agenticode-3-5-sonnet-20241022',
  bedrock: 'provider.agenticode-3-5-sonnet-20241022-v2:0',
  vertex: 'agenticode-3-5-sonnet-v2@20241022',
  foundry: 'agenticode-3-5-sonnet',
} as const satisfies ModelConfig

export const AGENTICODE_3_5_HAIKU_CONFIG = {
  firstParty: 'agenticode-3-5-haiku-20241022',
  bedrock: 'us.agenticode.agenticode-3-5-haiku-20241022-v1:0',
  vertex: 'agenticode-3-5-haiku@20241022',
  foundry: 'agenticode-3-5-haiku',
} as const satisfies ModelConfig

export const AGENTICODE_HAIKU_4_5_CONFIG = {
  firstParty: 'provider-haiku-4-5-20251001',
  bedrock: 'us.agenticode.provider-haiku-4-5-20251001-v1:0',
  vertex: 'provider-haiku-4-5@20251001',
  foundry: 'provider-haiku-4-5',
} as const satisfies ModelConfig

export const AGENTICODE_SONNET_4_CONFIG = {
  firstParty: 'provider-sonnet-4-20250514',
  bedrock: 'us.agenticode.provider-sonnet-4-20250514-v1:0',
  vertex: 'provider-sonnet-4@20250514',
  foundry: 'provider-sonnet-4',
} as const satisfies ModelConfig

export const AGENTICODE_SONNET_4_5_CONFIG = {
  firstParty: 'provider-sonnet-4-5-20250929',
  bedrock: 'us.agenticode.provider-sonnet-4-5-20250929-v1:0',
  vertex: 'provider-sonnet-4-5@20250929',
  foundry: 'provider-sonnet-4-5',
} as const satisfies ModelConfig

export const AGENTICODE_OPUS_4_CONFIG = {
  firstParty: 'provider-opus-4-20250514',
  bedrock: 'us.agenticode.provider-opus-4-20250514-v1:0',
  vertex: 'provider-opus-4@20250514',
  foundry: 'provider-opus-4',
} as const satisfies ModelConfig

export const AGENTICODE_OPUS_4_1_CONFIG = {
  firstParty: 'provider-opus-4-1-20250805',
  bedrock: 'us.agenticode.provider-opus-4-1-20250805-v1:0',
  vertex: 'provider-opus-4-1@20250805',
  foundry: 'provider-opus-4-1',
} as const satisfies ModelConfig

export const AGENTICODE_OPUS_4_5_CONFIG = {
  firstParty: 'provider-opus-4-5-20251101',
  bedrock: 'us.agenticode.provider-opus-4-5-20251101-v1:0',
  vertex: 'provider-opus-4-5@20251101',
  foundry: 'provider-opus-4-5',
} as const satisfies ModelConfig

export const AGENTICODE_OPUS_4_6_CONFIG = {
  firstParty: 'provider-opus-4-6',
  bedrock: 'us.agenticode.provider-opus-4-6-v1',
  vertex: 'provider-opus-4-6',
  foundry: 'provider-opus-4-6',
} as const satisfies ModelConfig

export const AGENTICODE_SONNET_4_6_CONFIG = {
  firstParty: 'provider-sonnet-4-6',
  bedrock: 'us.agenticode.provider-sonnet-4-6',
  vertex: 'provider-sonnet-4-6',
  foundry: 'provider-sonnet-4-6',
} as const satisfies ModelConfig

// @[MODEL LAUNCH]: Register the new config here.
export const ALL_MODEL_CONFIGS = {
  haiku35: AGENTICODE_3_5_HAIKU_CONFIG,
  haiku45: AGENTICODE_HAIKU_4_5_CONFIG,
  sonnet35: AGENTICODE_3_5_V2_SONNET_CONFIG,
  sonnet37: AGENTICODE_3_7_SONNET_CONFIG,
  sonnet40: AGENTICODE_SONNET_4_CONFIG,
  sonnet45: AGENTICODE_SONNET_4_5_CONFIG,
  sonnet46: AGENTICODE_SONNET_4_6_CONFIG,
  opus40: AGENTICODE_OPUS_4_CONFIG,
  opus41: AGENTICODE_OPUS_4_1_CONFIG,
  opus45: AGENTICODE_OPUS_4_5_CONFIG,
  opus46: AGENTICODE_OPUS_4_6_CONFIG,
} as const satisfies Record<string, ModelConfig>

export type ModelKey = keyof typeof ALL_MODEL_CONFIGS

/** Union of all canonical first-party model IDs, e.g. 'provider-opus-4-6' | 'provider-sonnet-4-5-20250929' | … */
export type CanonicalModelId =
  (typeof ALL_MODEL_CONFIGS)[ModelKey]['firstParty']

/** Runtime list of canonical model IDs — used by comprehensiveness tests. */
export const CANONICAL_MODEL_IDS = Object.values(ALL_MODEL_CONFIGS).map(
  c => c.firstParty,
) as [CanonicalModelId, ...CanonicalModelId[]]

/** Map canonical ID → internal short key. Used to apply settings-based modelOverrides. */
export const CANONICAL_ID_TO_KEY: Record<CanonicalModelId, ModelKey> =
  Object.fromEntries(
    (Object.entries(ALL_MODEL_CONFIGS) as [ModelKey, ModelConfig][]).map(
      ([key, cfg]) => [cfg.firstParty, key],
    ),
  ) as Record<CanonicalModelId, ModelKey>
