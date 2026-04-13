/**
 * Image/Screenshot Input — accept images as context for multimodal models.
 * Inspired by Cline's screenshot support and Aider's image/URL input.
 *
 * Supports: file path, URL, base64, clipboard paste.
 * Converts all to base64 ContentBlock for provider consumption.
 */

import { readFile } from 'fs/promises'
import { extname } from 'path'

/** Supported image MIME types */
const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
}

export interface ImageAttachment {
  type: 'image'
  sourceType: 'base64' | 'url'
  mediaType: string
  data: string // base64 string or URL
  filename?: string
}

/**
 * Load an image from a file path and convert to base64.
 */
export async function imageFromFile(filePath: string): Promise<ImageAttachment> {
  const ext = extname(filePath).toLowerCase()
  const mediaType = MIME_MAP[ext] ?? 'image/png'
  const buffer = await readFile(filePath)
  const data = buffer.toString('base64')

  return {
    type: 'image',
    sourceType: 'base64',
    mediaType,
    data,
    filename: filePath.split(/[/\\]/).pop(),
  }
}

/**
 * Create an image attachment from a URL.
 * The URL is passed directly to the provider (most support URL images).
 */
export function imageFromUrl(url: string, mediaType = 'image/png'): ImageAttachment {
  return {
    type: 'image',
    sourceType: 'url',
    mediaType,
    data: url,
  }
}

/**
 * Create an image attachment from a base64 string.
 */
export function imageFromBase64(base64: string, mediaType = 'image/png'): ImageAttachment {
  return {
    type: 'image',
    sourceType: 'base64',
    mediaType,
    data: base64,
  }
}

/**
 * Detect if a string is an image path, URL, or base64.
 */
export function detectImageSource(input: string): 'file' | 'url' | 'base64' | 'none' {
  if (input.startsWith('data:image/')) return 'base64'
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const hasImageExt = Object.keys(MIME_MAP).some(ext => input.toLowerCase().includes(ext))
    return hasImageExt ? 'url' : 'none'
  }
  const ext = extname(input).toLowerCase()
  if (MIME_MAP[ext]) return 'file'
  return 'none'
}

/**
 * Auto-detect and load image from any source.
 */
export async function loadImage(input: string): Promise<ImageAttachment | null> {
  const source = detectImageSource(input)
  switch (source) {
    case 'file':
      return imageFromFile(input)
    case 'url':
      return imageFromUrl(input)
    case 'base64':
      return imageFromBase64(input.replace(/^data:image\/[^;]+;base64,/, ''))
    default:
      return null
  }
}
