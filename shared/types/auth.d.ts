declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    name?: string | null
    role: 'admin' | 'user'
    avatarUrl?: string | null
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
