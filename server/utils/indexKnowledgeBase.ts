import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'
import { energyTips } from '../data/energyTips'
import { useVectorize, embedViaWorkersAi } from './cfBindings'

// Embeds the knowledge base with Workers AI and keeps Vectorize + D1 in sync
// with the bundled tips. Vectorize stores the vectors; D1 stores the chunk text.
// Shared by the manual admin reindex endpoint and the automatic self-heal check.

// Stable FNV-1a hash of the current KB content — changes whenever a tip's
// id/title/appliance/content changes, so we only re-embed when needed.
export function computeKbHash(): string {
  const material = energyTips
    .map(t => `${t.id}|${t.title}|${t.appliance}|${t.content}`)
    .join('\n')
  let h = 2166136261
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

/** Embed every tip via Workers AI, upsert text to D1 + vectors to Vectorize, then record the content hash. Throws if bindings are unavailable. */
export async function reindexKnowledgeBase(event: H3Event): Promise<{ indexed: number, dimensions: number }> {
  const inputs = energyTips.map(t => `${t.title}\n${t.content}`)
  const vectors = await embedViaWorkersAi(event, inputs)

  const db = useDrizzle(event)
  const now = new Date()

  // Chunk text → D1
  for (const tip of energyTips) {
    const values = { id: tip.id, title: tip.title, appliance: tip.appliance, content: tip.content, updatedAt: now }
    await db.insert(schema.kbChunks)
      .values(values)
      .onConflictDoUpdate({
        target: schema.kbChunks.id,
        set: { title: values.title, appliance: values.appliance, content: values.content, updatedAt: values.updatedAt }
      })
  }

  // Vectors → Vectorize
  const vectorize = useVectorize(event)
  await vectorize.upsert(
    energyTips
      .map((tip, i) => ({ id: tip.id, values: vectors[i]! }))
      .filter(v => Array.isArray(v.values))
  )

  const hash = computeKbHash()
  await db.insert(schema.kbMeta)
    .values({ id: 1, contentHash: hash, updatedAt: now })
    .onConflictDoUpdate({ target: schema.kbMeta.id, set: { contentHash: hash, updatedAt: now } })

  return { indexed: energyTips.length, dimensions: vectors[0]?.length ?? 0 }
}

/**
 * Reindex the KB only if the bundled tips changed since the last embed (or were
 * never embedded). Best-effort — swallows errors (including missing bindings in
 * local dev) so it never blocks the caller. Returns true if a reindex ran.
 */
export async function ensureKbIndexed(event: H3Event): Promise<boolean> {
  try {
    const db = useDrizzle(event)
    const meta = await db.query.kbMeta.findFirst({ where: eq(schema.kbMeta.id, 1) })
    if (meta?.contentHash === computeKbHash()) return false

    await reindexKnowledgeBase(event)
    return true
  } catch {
    return false
  }
}
