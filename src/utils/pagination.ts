import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants.js';

export interface PaginationInput {
  page?: number;
  limit?: number;
  cursor?: string | null;
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
  cursor: string | null;
}

export function normalizePagination(input: PaginationInput): PaginationResult {
  const page = Math.max(1, Number(input.page ?? 1) || 1);
  const rawLimit = Number(input.limit ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, rawLimit));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    cursor: input.cursor ?? null,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
