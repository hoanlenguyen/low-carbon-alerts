/// <reference types="@cloudflare/workers-types" />
import type { H3Event } from 'h3'

// Typed accessors for the Cloudflare bindings that have no local simulator
// (Workers AI + Vectorize). Mirrors how useDrizzle() reads the D1 binding off
// the request context. In local dev these resolve only if configured with
// `remote = true` in wrangler.toml (remote bindings).

function cfEnv(event: H3Event): Record<string, unknown> | undefined {
  return (event.context.cloudflare as unknown as { env?: Record<string, unknown> } | undefined)?.env
}

export function useVectorize(event: H3Event): Vectorize {
  const v = cfEnv(event)?.VECTORIZE as Vectorize | undefined
  if (!v) {
    throw createError({ statusCode: 503, statusMessage: 'Vectorize binding "VECTORIZE" not available' })
  }
  return v
}

export function useWorkersAi(event: H3Event): Ai {
  const ai = cfEnv(event)?.AI as Ai | undefined
  if (!ai) {
    throw createError({ statusCode: 503, statusMessage: 'Workers AI binding "AI" not available' })
  }
  return ai
}

// bge-base-en-v1.5 → 768-dim embeddings (must match the Vectorize index).
const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5'

export async function embedViaWorkersAi(event: H3Event, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const ai = useWorkersAi(event)
  const resp = await ai.run(EMBED_MODEL, { text: texts }) as { data: number[][] }
  return resp.data
}
