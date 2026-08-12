import { client } from "./client";

export async function getStatsSummary() {
  const { data } = await client.get("/api/stats/summary");
  return data;
}
