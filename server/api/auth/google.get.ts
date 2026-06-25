import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile']
  },
  async onSuccess(event, { user: googleUser }) {
    const db = useDrizzle(event)
    const email = googleUser.email.toLowerCase()

    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    })

    if (!user) {
      const newUser = {
        id: crypto.randomUUID(),
        email,
        name: googleUser.name ?? null,
        passwordHash: null,
        role: 'user' as const,
        googleId: googleUser.sub,
        avatarUrl: googleUser.picture ?? null,
        createdAt: new Date()
      }
      await db.insert(schema.users).values(newUser)
      user = newUser
    } else if (!user.googleId) {
      await db.update(schema.users)
        .set({ googleId: googleUser.sub, avatarUrl: googleUser.picture ?? user.avatarUrl })
        .where(eq(schema.users.id, user.id))
    }

    if (user.role !== 'user') {
      throw createError({ statusCode: 403, statusMessage: 'Admin accounts cannot sign in with Google' })
    }

    await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id))

    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl
      },
      loggedInAt: Date.now()
    })

    return sendRedirect(event, '/app')
  },
  onError(event, error) {
    console.error('Google OAuth error', error)
    return sendRedirect(event, '/login?error=google')
  }
})
