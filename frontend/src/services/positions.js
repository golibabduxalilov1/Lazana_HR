import { client } from "./client";

export async function listPositions(categoryId) {
  const params = categoryId ? { category_id: categoryId } : {};
  const { data } = await client.get("/api/positions", { params });
  return data;
}

export async function createPosition(payload) {
  const { data } = await client.post("/api/positions", payload);
  return data;
}

export async function updatePosition(id, payload) {
  const { data } = await client.patch(`/api/positions/${id}`, payload);
  return data;
}

export async function deletePosition(id) {
  await client.delete(`/api/positions/${id}`);
}
