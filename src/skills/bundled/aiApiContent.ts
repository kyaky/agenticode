// Content for the agenticode-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpAgenticodeApi from './agenticode-api/csharp/agenticode-api.md'
import curlExamples from './agenticode-api/curl/examples.md'
import goAgenticodeApi from './agenticode-api/go/agenticode-api.md'
import javaAgenticodeApi from './agenticode-api/java/agenticode-api.md'
import phpAgenticodeApi from './agenticode-api/php/agenticode-api.md'
import pythonAgentSdkPatterns from './agenticode-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './agenticode-api/python/agent-sdk/README.md'
import pythonAgenticodeApiBatches from './agenticode-api/python/agenticode-api/batches.md'
import pythonAgenticodeApiFilesApi from './agenticode-api/python/agenticode-api/files-api.md'
import pythonAgenticodeApiReadme from './agenticode-api/python/agenticode-api/README.md'
import pythonAgenticodeApiStreaming from './agenticode-api/python/agenticode-api/streaming.md'
import pythonAgenticodeApiToolUse from './agenticode-api/python/agenticode-api/tool-use.md'
import rubyAgenticodeApi from './agenticode-api/ruby/agenticode-api.md'
import skillPrompt from './agenticode-api/SKILL.md'
import sharedErrorCodes from './agenticode-api/shared/error-codes.md'
import sharedLiveSources from './agenticode-api/shared/live-sources.md'
import sharedModels from './agenticode-api/shared/models.md'
import sharedPromptCaching from './agenticode-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './agenticode-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './agenticode-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './agenticode-api/typescript/agent-sdk/README.md'
import typescriptAgenticodeApiBatches from './agenticode-api/typescript/agenticode-api/batches.md'
import typescriptAgenticodeApiFilesApi from './agenticode-api/typescript/agenticode-api/files-api.md'
import typescriptAgenticodeApiReadme from './agenticode-api/typescript/agenticode-api/README.md'
import typescriptAgenticodeApiStreaming from './agenticode-api/typescript/agenticode-api/streaming.md'
import typescriptAgenticodeApiToolUse from './agenticode-api/typescript/agenticode-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - agenticode-api/SKILL.md (Current Models pricing table)
//   - agenticode-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'provider-opus-4-6',
  OPUS_NAME: 'Agenticode Opus 4.6',
  SONNET_ID: 'provider-sonnet-4-6',
  SONNET_NAME: 'Agenticode Sonnet 4.6',
  HAIKU_ID: 'provider-haiku-4-5',
  HAIKU_NAME: 'Agenticode Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'provider-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/agenticode-api.md': csharpAgenticodeApi,
  'curl/examples.md': curlExamples,
  'go/agenticode-api.md': goAgenticodeApi,
  'java/agenticode-api.md': javaAgenticodeApi,
  'php/agenticode-api.md': phpAgenticodeApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/agenticode-api/README.md': pythonAgenticodeApiReadme,
  'python/agenticode-api/batches.md': pythonAgenticodeApiBatches,
  'python/agenticode-api/files-api.md': pythonAgenticodeApiFilesApi,
  'python/agenticode-api/streaming.md': pythonAgenticodeApiStreaming,
  'python/agenticode-api/tool-use.md': pythonAgenticodeApiToolUse,
  'ruby/agenticode-api.md': rubyAgenticodeApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/agenticode-api/README.md': typescriptAgenticodeApiReadme,
  'typescript/agenticode-api/batches.md': typescriptAgenticodeApiBatches,
  'typescript/agenticode-api/files-api.md': typescriptAgenticodeApiFilesApi,
  'typescript/agenticode-api/streaming.md': typescriptAgenticodeApiStreaming,
  'typescript/agenticode-api/tool-use.md': typescriptAgenticodeApiToolUse,
}
