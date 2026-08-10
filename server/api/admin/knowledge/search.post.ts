import { z } from 'zod'
import { retrieveKnowledge } from '../../../utils/retrieveKnowledge'

// Test/inspection endpoint for the RAG retrieval layer. Admin-only.
// POST { query, topK? } → ranked knowledge-base chunks with cosine scores.
const bodySchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().min(1).max(10).optional()
})

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { query, topK } = await readValidatedBody(event, bodySchema.parse)

  const results = await retrieveKnowledge(event, query, topK ?? 3)

  return { query, count: results.length, results }
})
