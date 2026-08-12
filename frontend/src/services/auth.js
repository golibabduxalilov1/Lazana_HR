import { client } from "./client";

export async function login(username, password) {
  const { data } = await client.post("/api/auth/login", { username, password });
  return data;
}
