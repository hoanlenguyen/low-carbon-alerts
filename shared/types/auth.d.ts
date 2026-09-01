declare module '#auth-utils' {
  interface User {
    id: string
    userName: string
    email?: string | null
    name?: string | null
    role: 'admin' | 'user'
    avatarUrl?: string | null
    onboardingCompletedAt?: number | null
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
