import { client } from "./client";

export async function listApplications(filters) {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.categoryId) params.category_id = filters.categoryId;
  if (filters.positionId) params.position_id = filters.positionId;
  if (filters.search) params.search = filters.search;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  params.page = filters.page || 1;
  params.page_size = filters.pageSize || 20;

  const { data } = await client.get("/api/applications", { params });
  return data;
}

export async function getApplication(id) {
  const { data } = await client.get(`/api/applications/${id}`);
  return data;
}

export async function changeApplicationStatus(id, newStatus, comment) {
  const { data } = await client.patch(`/api/applications/${id}/status`, {
    new_status: newStatus,
    comment: comment || null,
  });
  return data;
}

export async function deleteApplication(id) {
  await client.delete(`/api/applications/${id}`);
}

export async function listCategories() {
  const { data } = await client.get("/api/categories");
  return data;
}

export async function downloadApplicationResume(id) {
  const response = await client.get(`/api/applications/${id}/resume.pdf`, {
    responseType: "blob",
  });

  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `resume_${id}.pdf`;

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
