import { reindexKnowledgeBase } from '../../../utils/indexKnowledgeBase'

// Manually (re)embed the knowledge base (server/data/energyTips.ts) into D1.
// The recommendation path also self-heals automatically via ensureKbIndexed —
// this endpoint is for forcing an immediate reindex. Admin-only.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const { indexed, dimensions } = await reindexKnowledgeBase(event)
  return { ok: true, indexed, dimensions }
})
