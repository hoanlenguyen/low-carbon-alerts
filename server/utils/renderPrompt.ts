import { promptTemplates } from '../prompts/templates'

// Fills a prompt template (server/prompts/templates.ts) by substituting
// {placeholder} tokens. Bundled at build time — no filesystem or storage access
// at request time, so it works identically in local dev and on Cloudflare.
export function renderPrompt(
  name: string,
  vars: Record<string, string | number>
): string {
  const tpl = promptTemplates[name]
  if (!tpl) {
    throw new Error(`Prompt template not found: ${name}`)
  }
  let out = tpl
  for (const [key, value] of Object.entries(vars)) {
    // split/join avoids regex-escaping the braces and works on any target.
    out = out.split(`{${key}}`).join(String(value))
  }
  return out
}
