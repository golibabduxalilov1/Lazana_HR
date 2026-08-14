import { client } from "./client";

export async function getStatsSummary(filters = {}) {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.append("date_from", filters.dateFrom);
  if (filters.dateTo) params.append("date_to", filters.dateTo);
  (filters.categoryIds || []).forEach((id) => params.append("category_id", id));
  (filters.statuses || []).forEach((s) => params.append("status", s));

  const { data } = await client.get("/api/stats/summary", { params });
  return data;
}
