export type CatalogFilters = {
  query: string;
  category: string;
};

export function parseCatalogFilters(search: string | URLSearchParams): CatalogFilters {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return {
    query: params.get("q")?.trim() || "",
    category: params.get("category")?.trim() || "",
  };
}

export function catalogFilterUrl(pathname: string, filters: CatalogFilters): string {
  const params = new URLSearchParams();
  const query = filters.query.trim();
  const category = filters.category.trim();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  const serialized = params.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}
