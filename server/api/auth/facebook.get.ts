import { eq } from 'drizzle-orm'
import { useDrizzle, schema } from '../../database'

export default defineOAuthFacebookEventHandler({
  config: {
    scope: ['public_profile', 'email'],
    fields: ['id', 'name', 'email', 'picture']
  },
  async onSuccess(event, { user: fbUser }) {
    const db = useDrizzle()
    const email = (fbUser.email as string).toLowerCase()

    let user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    })

    if (!user) {
      const newUser = {
        id: crypto.randomUUID(),
        email,
        name: (fbUser.name as string) ?? null,
        passwordHash: null,
        role: 'user' as const,
        facebookId: fbUser.id as string,
        avatarUrl: fbUser.picture?.data?.url ?? null,
        status: 'active' as const,
        createdAt: new Date(),
        lastLoginAt: null
      }
      await db.insert(schema.users).values(newUser)
      user = newUser
    } else if (!user.facebookId) {
      await db.update(schema.users)
        .set({ facebookId: fbUser.id as string })
        .where(eq(schema.users.id, user.id))
    }

    if (user.role !== 'user') {
      throw createError({ statusCode: 403, statusMessage: 'Admin accounts cannot sign in with Facebook' })
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
    console.error('Facebook OAuth error', error)
    return sendRedirect(event, '/login?error=facebook')
  }
})
