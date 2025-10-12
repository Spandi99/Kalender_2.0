import axios from "axios";

const baseURL = (() => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL as string;
  }
  if (typeof process !== "undefined" && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL as string;
  }
  return "http://localhost:8000/api/v1";
})();

const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
