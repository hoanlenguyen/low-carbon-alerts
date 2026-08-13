// Scheduler Worker: on each Cron Trigger, call the Pages app's /_cron route with
// the shared bearer secret. /_cron gates every job on its own nextRunAt, so the
// exact firing time doesn't matter — a skipped tick is caught by the next one.

interface Env {
  CRON_TARGET_URL: string
  CRON_SECRET: string
}

async function fireCron(env: Env): Promise<{ status: number, body: string }> {
  const res = await fetch(`${env.CRON_TARGET_URL}/_cron`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` }
  })
  const body = await res.text()
  // Logs show up in `wrangler tail` / the Cloudflare dashboard.
  console.log(`[cron] /_cron → ${res.status} ${body}`)
  return { status: res.status, body }
}

export default {
  // Fired by the Cron Trigger (see wrangler.toml [triggers] crons).
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(fireCron(env).then(() => undefined))
  },

  // Manual trigger for testing. Requires the same bearer secret so it isn't open.
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.headers.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }
    const result = await fireCron(env)
    return Response.json(result)
  }
}
