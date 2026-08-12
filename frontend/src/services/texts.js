import { client } from "./client";

export async function listTexts() {
  const { data } = await client.get("/api/texts");
  return data;
}

export async function updateText(key, payload) {
  const { data } = await client.patch(`/api/texts/${key}`, payload);
  return data;
}
