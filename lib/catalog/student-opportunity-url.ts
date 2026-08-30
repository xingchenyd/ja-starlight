export type StudentOpportunityFilters = {
  query: string;
  category: string;
  degree: string;
  industry: string;
  salaryMin: number;
  salaryMax: number;
  sort: string;
};

export const defaultStudentOpportunityFilters: StudentOpportunityFilters = {
  query: "",
  category: "全部类别",
  degree: "全部学历",
  industry: "全部行业",
  salaryMin: 0,
  salaryMax: 500,
  sort: "latest",
};

function range(value: string | null, fallback: number) {
  if (value == null || value.trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(500, Math.round(number))) : fallback;
}

export function parseStudentOpportunityFilters(search: string | URLSearchParams): StudentOpportunityFilters {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const salaryMin = range(params.get("min"), 0);
  const salaryMax = range(params.get("max"), 500);
  return {
    query: params.get("q")?.trim() || "",
    category: params.get("category") || "全部类别",
    degree: params.get("degree") || "全部学历",
    industry: params.get("industry") || "全部行业",
    salaryMin: Math.min(salaryMin, salaryMax),
    salaryMax: Math.max(salaryMin, salaryMax),
    sort: ["latest", "salary-high", "salary-low"].includes(params.get("sort") || "") ? String(params.get("sort")) : "latest",
  };
}

export function studentOpportunityUrl(filters: StudentOpportunityFilters, itemId?: string) {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.category !== "全部类别") params.set("category", filters.category);
  if (filters.degree !== "全部学历") params.set("degree", filters.degree);
  if (filters.industry !== "全部行业") params.set("industry", filters.industry);
  if (filters.salaryMin !== 0) params.set("min", String(filters.salaryMin));
  if (filters.salaryMax !== 500) params.set("max", String(filters.salaryMax));
  if (filters.sort !== "latest") params.set("sort", filters.sort);
  if (itemId) params.set("item", itemId);
  const query = params.toString();
  return `/workspace/student/opportunities${query ? `?${query}` : ""}`;
}
