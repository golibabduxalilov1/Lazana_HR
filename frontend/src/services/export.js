import { client } from "./client";

export async function exportApplicationsCsv(filters) {
  const params = {};
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  if (filters.status) params.status = filters.status;
  if (filters.categoryId) params.category_id = filters.categoryId;
  if (filters.positionId) params.position_id = filters.positionId;
  if (filters.search) params.search = filters.search;

  const response = await client.get("/api/export/applications.csv", {
    params,
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : "applications.csv";

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
