// src/api/client.ts
import axios from "axios";
import { API_BASE_URL } from "../utils/constants";

// Normally we would get these from a Context or a store, but for simplicity here
// we assume some getter functions exist, or we will hook them up later.
let getAccessToken = () => "";
let refreshAccessToken = async () => "";
let logout = () => {};

export const setupInterceptors = (getAccess: () => string, refreshAccess: () => Promise<string>, logoutFn: () => void) => {
  getAccessToken = getAccess;
  refreshAccessToken = refreshAccess;
  logout = logoutFn;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor: Attach JWT ────────────────
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Handle 401 + Silent Refresh ──
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newAccess = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh failed → force logout
        logout();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
