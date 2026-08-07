import type { H3Event } from 'h3'
import { useDrizzle } from '../database'
import { embedText } from './embed'

// Single retrieval abstraction for the RAG layer. Backed by D1 + in-Worker
// cosine similarity today; swap the body for Cloudflare Vectorize later
// without touching call sites (prompts/03–05, see prompts/README.md).

export interface RetrievedChunk {
  id: string
  title: string
  appliance: string
  content: string
  score: number // cosine similarity, 1.0 = identical
}

export interface RetrieveOptions {
  topK?: number
  apiKey: string
  baseUrl?: string
  model?: string
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    dot += x * y
    normA += x * x
    normB += y * y
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Retrieve the top-k knowledge-base chunks most relevant to `query`.
 * Returns [] when embeddings are unavailable or the KB is empty — callers
 * treat retrieval as best-effort context, never a hard dependency.
 */
export async function retrieveKnowledge(
  event: H3Event,
  query: string,
  opts: RetrieveOptions
): Promise<RetrievedChunk[]> {
  const topK = opts.topK ?? 3
  const queryVec = await embedText(query, opts.apiKey, opts.baseUrl, opts.model)
  if (!queryVec) return []

  const db = useDrizzle(event)
  const rows = await db.query.kbChunks.findMany()
  if (rows.length === 0) return []

  const scored: RetrievedChunk[] = []
  for (const row of rows) {
    let vec: number[]
    try {
      vec = JSON.parse(row.embedding) as number[]
    } catch {
      continue // skip a corrupt embedding rather than failing the whole query
    }
    scored.push({
      id: row.id,
      title: row.title,
      appliance: row.appliance,
      content: row.content,
      score: cosineSimilarity(queryVec, vec)
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}
