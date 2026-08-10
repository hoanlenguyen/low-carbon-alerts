import type { H3Event } from 'h3'
import { inArray } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'
import { useVectorize, embedViaWorkersAi } from './cfBindings'

// RAG retrieval over Cloudflare Vectorize: embed the query with Workers AI,
// find the nearest vectors, then load the chunk text from D1 (Vectorize holds
// the vectors, D1 holds the content — matching Cloudflare's RAG tutorial).

export interface RetrievedChunk {
  id: string
  title: string
  appliance: string
  content: string
  score: number // cosine similarity, 1.0 = identical
}

/**
 * Retrieve the top-k knowledge-base chunks most relevant to `query`.
 * Best-effort: returns [] if the AI/Vectorize bindings are unavailable (e.g.
 * local dev without remote bindings) or nothing matches — callers treat
 * retrieval as optional context, never a hard dependency.
 */
export async function retrieveKnowledge(
  event: H3Event,
  query: string,
  topK = 3
): Promise<RetrievedChunk[]> {
  try {
    const [vec] = await embedViaWorkersAi(event, [query])
    if (!vec) return []

    const vectorize = useVectorize(event)
    const res = await vectorize.query(vec, { topK, returnValues: false, returnMetadata: 'none' })
    const matches = res.matches ?? []
    if (matches.length === 0) return []

    const db = useDrizzle(event)
    const rows = await db.query.kbChunks.findMany({
      where: inArray(schema.kbChunks.id, matches.map(m => m.id))
    })
    const byId = new Map(rows.map(r => [r.id, r]))

    return matches
      .map((m): RetrievedChunk | null => {
        const r = byId.get(m.id)
        return r ? { id: r.id, title: r.title, appliance: r.appliance, content: r.content, score: m.score } : null
      })
      .filter((x): x is RetrievedChunk => x !== null)
  } catch {
    return []
  }
}
