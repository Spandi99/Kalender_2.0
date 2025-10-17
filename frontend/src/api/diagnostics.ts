import api from "./client";

export async function fetchHealthExtended() {
  const { data } = await api.get("/health/extended");
  return data;
}
