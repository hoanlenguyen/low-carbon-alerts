// Active appliances for the end-user onboarding picker. Any authenticated user.
// Served from an isolate-local memory cache (see getActiveAppliances). Admins
// manage the full catalog (incl. inactive) via /api/admin/appliances.
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return getActiveAppliances(event)
})
