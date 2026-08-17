import { client } from "./client";

export async function listAuditLogs(filters) {
  const params = {};
  if (filters.action) params.action = filters.action;
  if (filters.entityType) params.entity_type = filters.entityType;
  params.page = filters.page || 1;
  params.page_size = filters.pageSize || 20;

  const { data } = await client.get("/api/audit-logs", { params });
  return data;
}
