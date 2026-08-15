import { client } from "./client";

export async function login(phone, password) {
  const { data } = await client.post("/api/auth/login", { phone, password });
  return data;
}
