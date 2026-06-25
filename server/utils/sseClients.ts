// In-memory registry of connected SSE clients keyed by userId.
// Each value is a Set of send functions for that user's open connections.
export const sseClients = new Map<string, Set<(data: string) => void>>()
