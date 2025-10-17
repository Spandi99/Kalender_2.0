const resolveBrowserOrigin = () => {
  if (typeof window === "undefined") {
    return undefined;
  }
  return `${window.location.origin}/api`;
};

const envApiUrl = (import.meta.env.VITE_API_URL || "").toString().trim();

export const API_BASE_URL =
  envApiUrl || resolveBrowserOrigin() || "http://localhost:8000/api";
