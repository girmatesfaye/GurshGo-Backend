// Simple pagination helper: parse `limit` and `offset` from query-like objects
export function parsePagination(
  query: Record<string, any>,
  defaults = { limit: 25, offset: 0 },
) {
  const limit = Number(query.limit ?? defaults.limit) || defaults.limit;
  const offset = Number(query.offset ?? defaults.offset) || defaults.offset;
  return { limit, offset };
}

export default parsePagination;
