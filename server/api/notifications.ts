import { desc, eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../database'

type ActivityEvent = {
  id: string
  type: 'message_sent' | 'user_joined' | 'job_fired'
  title: string
  body: string
  date: string
  unread: boolean
}

export default defineEventHandler(async (event): Promise<ActivityEvent[]> => {
  const session = await getUserSession(event)
  if (!session.user || session.user.role !== 'admin') {
    throw createError({ statusCode: 403 })
  }

  const db = useDrizzle(event)

  const [messages, users, jobs] = await Promise.all([
    db.query.messages.findMany({
      columns: { id: true, subject: true, type: true, sentAt: true, createdAt: true },
      orderBy: [desc(schema.messages.createdAt)],
      limit: 8
    }),
    db.query.users.findMany({
      where: eq(schema.users.role, 'user'),
      columns: { id: true, name: true, email: true, createdAt: true },
      orderBy: [desc(schema.users.createdAt)],
      limit: 5
    }),
    db.query.scheduledJobs.findMany({
      columns: { id: true, name: true, lastRunAt: true },
      orderBy: [desc(schema.scheduledJobs.lastRunAt)],
      limit: 4
    })
  ])

  const events: ActivityEvent[] = []

  for (const msg of messages) {
    const date = msg.sentAt ?? msg.createdAt
    events.push({
      id: `msg-${msg.id}`,
      type: 'message_sent',
      title: msg.subject,
      body: msg.type === 'broadcast' ? 'Sent to all users' : 'Sent to selected users',
      date: date instanceof Date ? date.toISOString() : new Date(date).toISOString(),
      unread: false
    })
  }

  for (const user of users) {
    const createdAt = user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)
    const isRecent = Date.now() - createdAt.getTime() < 7 * 24 * 60 * 60 * 1000
    events.push({
      id: `user-${user.id}`,
      type: 'user_joined',
      title: user.name ?? user.email,
      body: 'New user registered',
      date: createdAt.toISOString(),
      unread: isRecent
    })
  }

  for (const job of jobs) {
    if (!job.lastRunAt) continue
    const firedAt = job.lastRunAt instanceof Date ? job.lastRunAt : new Date(job.lastRunAt)
    events.push({
      id: `job-${job.id}`,
      type: 'job_fired',
      title: job.name,
      body: 'Scheduled job executed',
      date: firedAt.toISOString(),
      unread: false
    })
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return events.slice(0, 15)
})
