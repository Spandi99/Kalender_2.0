const envApiUrl = (import.meta.env.VITE_API_URL || "").toString().trim();
const browserResolvedApi =
  typeof window === "undefined" ? undefined : `${window.location.origin}/api`;

export const API_BASE_URL =
  envApiUrl || browserResolvedApi || "http://localhost:8000/api";
