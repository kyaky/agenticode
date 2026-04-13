/**
 * AgentiCode Build Script
 * Compiles TypeScript source into standalone executables using `bun build --compile`.
 * Produces platform-specific binaries that include the Bun runtime.
 *
 * Usage: bun run scripts/build.ts [--platform linux|darwin|windows] [--arch x64|arm64]
 */

import { $ } from 'bun'

const ENTRY = 'src/entrypoints/cli.tsx'
const OUT_DIR = 'dist'
const NAME = 'agenticode'

type Platform = 'linux' | 'darwin' | 'windows'
type Arch = 'x64' | 'arm64'

interface Target {
  platform: Platform
  arch: Arch
  suffix: string
}

const ALL_TARGETS: Target[] = [
  { platform: 'linux', arch: 'x64', suffix: '' },
  { platform: 'linux', arch: 'arm64', suffix: '' },
  { platform: 'darwin', arch: 'arm64', suffix: '' },
  { platform: 'darwin', arch: 'x64', suffix: '' },
  { platform: 'windows', arch: 'x64', suffix: '.exe' },
  { platform: 'windows', arch: 'arm64', suffix: '.exe' },
]

async function build(targets: Target[]) {
  console.log(`Building AgentiCode for ${targets.length} target(s)...\n`)

  for (const target of targets) {
    const outName = `${NAME}-${target.platform}-${target.arch}${target.suffix}`
    const outPath = `${OUT_DIR}/${outName}`
    const bunTarget = `bun-${target.platform}-${target.arch}`

    console.log(`  Building ${outName}...`)
    const start = Date.now()

    try {
      await $`bun build ${ENTRY} --compile --target ${bunTarget} --outfile ${outPath} --minify`
      const duration = ((Date.now() - start) / 1000).toFixed(1)
      console.log(`  ✓ ${outName} (${duration}s)`)
    } catch (e) {
      console.error(`  ✗ ${outName} failed: ${e}`)
    }
  }

  console.log(`\nDone. Binaries in ${OUT_DIR}/`)
}

// Parse CLI args
const args = process.argv.slice(2)
const platformFilter = args.includes('--platform')
  ? args[args.indexOf('--platform') + 1] as Platform
  : undefined
const archFilter = args.includes('--arch')
  ? args[args.indexOf('--arch') + 1] as Arch
  : undefined

let targets = ALL_TARGETS
if (platformFilter) targets = targets.filter(t => t.platform === platformFilter)
if (archFilter) targets = targets.filter(t => t.arch === archFilter)

// Default: build for current platform only
if (!platformFilter && !archFilter) {
  const currentPlatform = process.platform === 'win32' ? 'windows' : process.platform as Platform
  const currentArch = process.arch === 'arm64' ? 'arm64' : 'x64' as Arch
  targets = targets.filter(t => t.platform === currentPlatform && t.arch === currentArch)
}

if (targets.length === 0) {
  console.error('No matching targets. Use --platform linux|darwin|windows --arch x64|arm64')
  process.exit(1)
}

await build(targets)
