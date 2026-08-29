// Shared shape for paginated list endpoints (admin tables, run/audit logs, etc.).
// Bound to <UPagination :items-per-page="pageSize" :total="total" v-model:page> on
// the client; the API echoes the resolved page + pageSize alongside the rows.
export interface Pagination<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}
