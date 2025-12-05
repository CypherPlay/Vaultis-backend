export interface PaginationInfo {
  offset: number;
  limit: number;
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export function getPaginationInfo(
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationInfo {
  const normalizedPage = Math.max(1, Math.floor(page) || 1);
  const normalizedPageSize = Math.max(1, Math.floor(pageSize) || 1);

  const offset = (normalizedPage - 1) * normalizedPageSize;
  const limit = normalizedPageSize;
  const totalPages = Math.ceil(totalItems / normalizedPageSize);

  return {
    offset,
    limit,
    totalPages,
    currentPage: normalizedPage,
    totalItems,
  };
}
