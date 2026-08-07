// OpenAI embeddings helper. Plain HTTP (no Cloudflare binding), so it works
// in local dev and production alike. Used by the RAG ingest + retrieval layer.

interface EmbeddingResponse {
  data: Array<{ index: number, embedding: number[] }>
}

/**
 * Embed one or more strings. Returns vectors in the same order as `texts`.
 * Throws on API failure so callers (e.g. reindex) can surface the error.
 */
export async function embedTexts(
  texts: string[],
  apiKey: string,
  baseUrl = 'https://api.openai.com/v1',
  model = 'text-embedding-3-small'
): Promise<number[][]> {
  if (!apiKey) throw new Error('Missing OpenAI API key for embeddings')
  if (texts.length === 0) return []

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, input: texts })
  })

  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status}`)
  }

  const json = await res.json() as EmbeddingResponse
  // Sort by index to guarantee alignment with the input order.
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding)
}

/** Embed a single string. Returns null on failure (caller decides fallback). */
export async function embedText(
  text: string,
  apiKey: string,
  baseUrl?: string,
  model?: string
): Promise<number[] | null> {
  try {
    const [vec] = await embedTexts([text], apiKey, baseUrl, model)
    return vec ?? null
  } catch {
    return null
  }
}
