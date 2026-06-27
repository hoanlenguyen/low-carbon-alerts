import { sseClients } from '../../utils/sseClients'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const userId = session.user.id

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })

  const send = (data: string) => {
    event.node.res.write(`data: ${data}\n\n`)
  }

  if (!sseClients.has(userId)) sseClients.set(userId, new Set())
  sseClients.get(userId)!.add(send)

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      event.node.res.write(': ping\n\n')
    } catch { clearInterval(heartbeat) }
  }, 30000)

  event.node.req.on('close', () => {
    clearInterval(heartbeat)
    sseClients.get(userId)?.delete(send)
    if (sseClients.get(userId)?.size === 0) sseClients.delete(userId)
  })

  // Keep the response open
  await new Promise(() => {})
})
