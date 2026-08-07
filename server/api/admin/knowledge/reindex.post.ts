import { useDrizzle, schema } from '../../../database'
import { embedTexts } from '../../../utils/embed'
import { energyTips } from '../../../data/energyTips'

// Embeds the knowledge base (server/data/energyTips.ts) and upserts it into
// D1 (kb_chunks). Re-runnable — run once per environment after deploy, and
// again whenever the KB content changes. Admin-only.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const config = useRuntimeConfig()
  if (!config.openaiApiKey) {
    throw createError({ statusCode: 503, statusMessage: 'OpenAI API key not configured' })
  }

  // Embed the title + content together so retrieval matches on both.
  const inputs = energyTips.map(t => `${t.title}\n${t.content}`)
  const vectors = await embedTexts(
    inputs,
    config.openaiApiKey,
    config.openaiBaseUrl || undefined,
    config.openaiEmbedModel || undefined
  )

  const db = useDrizzle(event)
  const now = new Date()
  let count = 0

  for (let i = 0; i < energyTips.length; i++) {
    const tip = energyTips[i]!
    const vec = vectors[i]
    if (!vec) continue

    const values = {
      id: tip.id,
      title: tip.title,
      appliance: tip.appliance,
      content: tip.content,
      embedding: JSON.stringify(vec),
      updatedAt: now
    }
    await db.insert(schema.kbChunks)
      .values(values)
      .onConflictDoUpdate({
        target: schema.kbChunks.id,
        set: {
          title: values.title,
          appliance: values.appliance,
          content: values.content,
          embedding: values.embedding,
          updatedAt: values.updatedAt
        }
      })
    count++
  }

  return { ok: true, indexed: count, dimensions: vectors[0]?.length ?? 0 }
})
