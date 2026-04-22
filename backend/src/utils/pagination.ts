export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Normalise raw page/limit values and compute skip/take for database queries.
 */
export function parsePagination(params: PaginationParams) {
  const page = Math.max(params.page ?? DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;

  return { page, limit, skip, take: limit };
}

/**
 * Build a paginated response object from a data array and a total count.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const total_pages = Math.ceil(total / limit) || 1;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      total_pages,
      has_next: page < total_pages,
      has_prev: page > 1,
    },
  };
}
