import { client } from "./client";

export async function listEmployees() {
  const { data } = await client.get("/api/employees");
  return data;
}

export async function createEmployee(payload) {
  const { data } = await client.post("/api/employees", payload);
  return data;
}

export async function updateEmployee(id, payload) {
  const { data } = await client.patch(`/api/employees/${id}`, payload);
  return data;
}

export async function deleteEmployee(id) {
  const { data } = await client.delete(`/api/employees/${id}`);
  return data;
}
